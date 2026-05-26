import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnedResultAsset } from "@/server/db/repositories";
import { ApiError, jsonError } from "@/server/http";
import { fetchAsset } from "@/server/providers/types";
import { applyContextCookies, getRequestContext } from "@/server/request-context";

export const runtime = "nodejs";

const downloadQuerySchema = z
  .object({
    key: z.string().trim().min(1).optional(),
    url: z.string().trim().url().optional(),
    filename: z.string().trim().min(1).max(160).optional()
  })
  .refine((value) => Boolean(value.key || value.url), {
    message: "Missing download target"
  });

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const parsedQuery = downloadQuerySchema.safeParse({
      key: request.nextUrl.searchParams.get("key") ?? undefined,
      url: request.nextUrl.searchParams.get("url") ?? undefined,
      filename: request.nextUrl.searchParams.get("filename") ?? undefined
    });

    if (!parsedQuery.success) {
      throw new ApiError(400, "bad_request", "Missing or invalid download target");
    }

    const asset = await getOwnedResultAsset(context.actor, {
      storageKey: parsedQuery.data.key,
      url: parsedQuery.data.url
    });
    if (!asset) {
      throw new ApiError(404, "not_found", "Image not found");
    }

    const downloadedAsset = await fetchAsset(asset.url);
    const fileName =
      sanitizeDownloadFileName(parsedQuery.data.filename) ||
      buildFallbackDownloadFileName(asset.mimeType || downloadedAsset.mimeType);
    const responseBody = Uint8Array.from(downloadedAsset.buffer);
    const response = new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType || downloadedAsset.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store"
      }
    });

    return applyContextCookies(response, context);
  } catch (error) {
    return jsonError(error);
  }
}

function sanitizeDownloadFileName(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  return sanitized || null;
}

function buildFallbackDownloadFileName(mimeType: string | undefined): string {
  const normalizedMimeType = mimeType?.toLowerCase() || "";

  if (normalizedMimeType.includes("jpeg") || normalizedMimeType.includes("jpg")) {
    return "lumio-image.jpg";
  }

  if (normalizedMimeType.includes("webp")) {
    return "lumio-image.webp";
  }

  if (normalizedMimeType.includes("png")) {
    return "lumio-image.png";
  }

  return "lumio-image.bin";
}
