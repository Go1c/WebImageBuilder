import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppConfig } from "@/server/config";
import { getOwnedResultAsset } from "@/server/db/repositories";
import { ApiError, jsonError } from "@/server/http";
import { fetchAsset } from "@/server/providers/types";
import { applyContextCookies, getRequestContext } from "@/server/request-context";
import { downloadStoredAsset } from "@/server/storage/s3";

export const runtime = "nodejs";

const downloadQuerySchema = z
  .object({
    key: z.string().trim().min(1).optional(),
    url: z.string().trim().url().optional(),
    filename: z.string().trim().min(1).max(160).optional(),
    disposition: z.enum(["attachment", "inline"]).optional()
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
      filename: request.nextUrl.searchParams.get("filename") ?? undefined,
      disposition: request.nextUrl.searchParams.get("disposition") ?? undefined
    });

    if (!parsedQuery.success) {
      throw new ApiError(400, "bad_request", "Missing or invalid download target");
    }

    const ownedAsset = await getOwnedResultAsset(context.actor, {
      storageKey: parsedQuery.data.key,
      url: parsedQuery.data.url
    });
    const asset = ownedAsset || resolveTrustedPublicAsset(parsedQuery.data.url);
    if (!asset) {
      throw new ApiError(404, "not_found", "Image not found");
    }

    const downloadedAsset =
      ownedAsset && shouldReadOwnedAssetFromStorage(ownedAsset)
        ? await downloadStoredAsset(ownedAsset.storageKey)
        : await fetchAsset(asset.url);
    const fileName =
      sanitizeDownloadFileName(parsedQuery.data.filename) ||
      buildFallbackDownloadFileName(asset.mimeType || downloadedAsset.mimeType);
    const responseBody = Uint8Array.from(downloadedAsset.buffer);
    const response = new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType || downloadedAsset.mimeType || "application/octet-stream",
        "Content-Disposition": `${parsedQuery.data.disposition || "attachment"}; filename="${fileName}"`,
        "Cache-Control": "private, no-store"
      }
    });

    return applyContextCookies(response, context);
  } catch (error) {
    return jsonError(error);
  }
}

function shouldReadOwnedAssetFromStorage(asset: { storageKey: string; url: string }): boolean {
  return asset.url.startsWith("s3://");
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

function resolveTrustedPublicAsset(url: string | undefined): { url: string; mimeType: null } | null {
  if (!url || !isTrustedPublicGeneratedAssetUrl(url)) {
    return null;
  }

  return {
    url,
    mimeType: null
  };
}

function isTrustedPublicGeneratedAssetUrl(url: string): boolean {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return false;
  }

  const allowedPrefixes = new Set<string>(["https://cdn.lumio.games/generated/"]);
  const configuredPublicBaseUrl = getAppConfig().s3.publicBaseUrl;

  if (configuredPublicBaseUrl) {
    allowedPrefixes.add(`${configuredPublicBaseUrl.replace(/\/+$/, "")}/generated/`);
  }

  for (const prefix of allowedPrefixes) {
    if (normalizedUrl.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}
