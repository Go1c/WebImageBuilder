import { NextResponse, type NextRequest } from "next/server";
import { generateImagesForActor } from "@/server/generation/service";
import { recordUploadedAsset } from "@/server/db/repositories";
import { uploadBuffer } from "@/server/storage/s3";
import { ApiError, jsonError } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";
import {
  buildImagesResponse,
  extractImageUrls,
  parseSize,
  resolutionForSize,
  resolveModelKey
} from "@/server/canvas/openaiImageAdapter";
import type { AssetReference } from "@/server/domain/models";

export const runtime = "nodejs";
export const maxDuration = 600;

const SUPPORTED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

/**
 * OpenAI images/edits 兼容端点 · 无限画布图生图
 *
 * 画布的图生图 / 换背景 / 局部重绘以 multipart 形式带上参考图。这里把参考图
 * 上传到我们 S3（与生图站参考图同一套 uploadBuffer + recordUploadedAsset），
 * 再以 image-to-image 模式走 generateImagesForActor（quota + S3 + 鉴权），
 * 返回 OpenAI images 形状。
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const form = await request.formData();

    const prompt = String(form.get("prompt") ?? "").trim();
    const model = resolveModelKey(form.get("model"));
    const size = parseSize(form.get("size"));
    const files = form.getAll("image").filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      throw new ApiError(400, "bad_request", "缺少参考图");
    }

    const owner =
      context.actor.type === "user" ? context.actor.userId : context.actor.anonymousDeviceId;

    const referenceAssets: AssetReference[] = [];
    for (const file of files) {
      const mimeType = (file.type || "image/png").toLowerCase();
      if (!SUPPORTED_MIME.has(mimeType)) {
        throw new ApiError(400, "bad_request", "不支持的图片类型");
      }
      const stored = await uploadBuffer({
        buffer: Buffer.from(await file.arrayBuffer()),
        mimeType,
        prefix: `reference/${owner}`
      });
      await recordUploadedAsset({
        userId: context.actor.type === "user" ? context.actor.userId : null,
        anonymousDeviceId:
          context.actor.type === "anonymous" ? context.actor.anonymousDeviceId : null,
        assetType: "reference",
        storageKey: stored.key,
        url: stored.url,
        mimeType: stored.mimeType
      });
      referenceAssets.push({ key: stored.key, url: stored.url, mimeType: stored.mimeType });
    }

    const rawInput = {
      prompt,
      mode: "image-to-image",
      model,
      size,
      resolution: resolutionForSize(size),
      quality: "standard",
      count: 1,
      referenceAssets
    };

    const result = await generateImagesForActor({
      actor: context.actor,
      rawInput,
      sub2ApiAccessToken: context.sub2ApiAccessToken
    });

    const urls = extractImageUrls({ images: result.images });
    const response = NextResponse.json(buildImagesResponse(urls, Math.floor(Date.now() / 1000)));
    return applyContextCookies(response, context);
  } catch (error) {
    console.error("[api/canvas edits] request failed", error);
    return jsonError(error);
  }
}
