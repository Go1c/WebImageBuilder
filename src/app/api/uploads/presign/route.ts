import type { NextRequest } from "next/server";
import { z } from "zod";
import { recordUploadedAsset } from "@/server/db/repositories";
import { ApiError, jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";
import { createPresignedUpload } from "@/server/storage/s3";

export const runtime = "nodejs";

const uploadSchema = z.object({
  mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/),
  assetType: z.enum(["reference", "mask"]).default("reference")
});

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = uploadSchema.safeParse(await request.json());
    if (!body.success) {
      throw new ApiError(400, "bad_request", body.error.message);
    }

    const owner =
      context.actor.type === "user"
        ? context.actor.userId
        : context.actor.anonymousDeviceId;
    const presign = await createPresignedUpload({
      mimeType: body.data.mimeType,
      prefix: `${body.data.assetType}/${owner}`
    });

    await recordUploadedAsset({
      userId: context.actor.type === "user" ? context.actor.userId : null,
      anonymousDeviceId:
        context.actor.type === "anonymous" ? context.actor.anonymousDeviceId : null,
      assetType: body.data.assetType,
      storageKey: presign.key,
      url: presign.publicUrl,
      mimeType: body.data.mimeType
    });

    const response = jsonOk({
      key: presign.key,
      uploadUrl: presign.uploadUrl,
      url: presign.publicUrl,
      mimeType: body.data.mimeType
    });
    return applyContextCookies(response, context);
  } catch (error) {
    return jsonError(error);
  }
}
