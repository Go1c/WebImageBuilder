import type { NextRequest } from "next/server";
import { z } from "zod";
import { recordUploadedAsset } from "@/server/db/repositories";
import { ApiError, jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";
import { uploadBuffer } from "@/server/storage/s3";

export const runtime = "nodejs";

const assetTypeSchema = z.enum(["reference", "mask"]).default("reference");
const supportedImageMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const form = await request.formData();
    const assetType = parseAssetType(form.get("assetType"));
    const file = parseUploadFile(form.get("file"));
    const mimeType = file.type.toLowerCase();

    if (!supportedImageMimeTypes.has(mimeType)) {
      throw new ApiError(400, "bad_request", "Unsupported image type");
    }

    const owner =
      context.actor.type === "user"
        ? context.actor.userId
        : context.actor.anonymousDeviceId;
    const storedAsset = await uploadBuffer({
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeType,
      prefix: `${assetType}/${owner}`
    });

    await recordUploadedAsset({
      userId: context.actor.type === "user" ? context.actor.userId : null,
      anonymousDeviceId:
        context.actor.type === "anonymous" ? context.actor.anonymousDeviceId : null,
      assetType,
      storageKey: storedAsset.key,
      url: storedAsset.url,
      mimeType: storedAsset.mimeType
    });

    const response = jsonOk({
      key: storedAsset.key,
      url: storedAsset.url,
      mimeType: storedAsset.mimeType
    });
    return applyContextCookies(response, context);
  } catch (error) {
    return jsonError(error);
  }
}

function parseAssetType(value: FormDataEntryValue | null): "reference" | "mask" {
  const parsed = assetTypeSchema.safeParse(value ?? undefined);
  if (!parsed.success) {
    throw new ApiError(400, "bad_request", "Unsupported asset type");
  }

  return parsed.data;
}

function parseUploadFile(value: FormDataEntryValue | null): File {
  if (!(value instanceof File)) {
    throw new ApiError(400, "bad_request", "Missing upload file");
  }

  return value;
}
