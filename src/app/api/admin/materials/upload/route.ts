import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { writeAuditLog } from "@/server/admin/db";
import { ApiError, jsonError, jsonOk } from "@/server/http";
import { uploadBuffer } from "@/server/storage/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supportedImageMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

/**
 * Admin-only: accept a raw image attachment, transcode-store it to S3/R2 and
 * return its public URL so the material editor can save it as image_url.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "bad_request", "缺少上传文件");
    }
    const mimeType = file.type.toLowerCase();
    if (!supportedImageMimeTypes.has(mimeType)) {
      throw new ApiError(400, "bad_request", "仅支持 PNG / JPG / WEBP 图片");
    }

    const stored = await uploadBuffer({
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeType,
      prefix: "materials"
    });

    await writeAuditLog({ adminEmail: admin.email, action: "material.upload", targetType: "material", detail: { key: stored.key, mimeType: stored.mimeType } });
    return jsonOk({ url: stored.url, key: stored.key, mimeType: stored.mimeType });
  } catch (error) {
    return jsonError(error);
  }
}
