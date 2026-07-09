/**
 * 无限画布 · 生成层适配
 *
 * 画布 (canvas-app, infinite-canvas fork) 以 OpenAI images 兼容协议
 * (POST /v1/images/generations) 发起生成。本模块把这类请求映射成我们
 * 内部 startGeneration 的输入，并把任务产物回写成 OpenAI images 响应，
 * 从而让画布复用生图站的 quota 扣减、S3 存储与鉴权，而无需改动画布内部
 * 那 797 行的 image.ts。纯函数，便于单测。
 */

import type { ImageResolutionTier, ModelKey } from "@/server/domain/models";

const MODEL_KEYS: ModelKey[] = ["gpt-image-2", "gpt-image-2-2k", "gpt-image-2-4k", "gemini-3.1-flash-image-preview"];
const DEFAULT_MODEL: ModelKey = "gpt-image-2";
const DEFAULT_SIZE = "1024x1024" as const;

export type OpenAiImageRequest = {
  prompt?: unknown;
  model?: unknown;
  size?: unknown;
  n?: unknown;
  quality?: unknown;
};

export type CanvasGenerationInput = {
  prompt: string;
  mode: "text-to-image";
  model: ModelKey;
  size: `${number}x${number}`;
  resolution: ImageResolutionTier;
  quality: "standard" | "high";
  count: number;
  referenceAssets: never[];
};

/** Map an arbitrary incoming model id to one of our supported ModelKeys. */
export function resolveModelKey(model: unknown): ModelKey {
  if (typeof model === "string") {
    const trimmed = model.trim();
    if ((MODEL_KEYS as string[]).includes(trimmed)) {
      return trimmed as ModelKey;
    }
    // Accept the underlying provider model names too (e.g. "gpt-image-2-2k").
    const byProvider = MODEL_KEYS.find((key) => key === trimmed || trimmed.startsWith(key));
    if (byProvider) {
      return byProvider;
    }
  }
  return DEFAULT_MODEL;
}

/** Validate an OpenAI "WxH" size string, falling back to a square kilo image. */
export function parseSize(size: unknown): `${number}x${number}` {
  if (typeof size === "string") {
    const match = size.trim().match(/^(\d{2,5})x(\d{2,5})$/i);
    if (match) {
      return `${Number(match[1])}x${Number(match[2])}` as `${number}x${number}`;
    }
  }
  return DEFAULT_SIZE;
}

/** Derive our resolution tier from the largest image dimension. */
export function resolutionForSize(size: `${number}x${number}`): ImageResolutionTier {
  const [width, height] = size.split("x").map((value) => Number(value));
  const longEdge = Math.max(width, height);
  if (longEdge <= 1024) {
    return "1K";
  }
  if (longEdge <= 2048) {
    return "2K";
  }
  return "4K";
}

function clampCount(n: unknown): number {
  const value = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(4, Math.max(1, Math.floor(value)));
}

/** Build the internal generation input from an OpenAI images request. */
export function buildGenerationInput(request: OpenAiImageRequest): CanvasGenerationInput {
  const prompt = typeof request.prompt === "string" ? request.prompt.trim() : "";
  const size = parseSize(request.size);
  return {
    prompt,
    mode: "text-to-image",
    model: resolveModelKey(request.model),
    size,
    resolution: resolutionForSize(size),
    quality: request.quality === "hd" || request.quality === "high" ? "high" : "standard",
    count: clampCount(request.n),
    referenceAssets: []
  };
}

type AssetLike = { url?: unknown };
type TaskLike = { assets?: unknown; images?: unknown };

/** Pull image URLs out of a finished task / generation result. */
export function extractImageUrls(source: TaskLike | undefined | null): string[] {
  if (!source) {
    return [];
  }
  const list = Array.isArray(source.assets)
    ? source.assets
    : Array.isArray(source.images)
      ? source.images
      : [];
  return (list as AssetLike[])
    .map((asset) => (typeof asset?.url === "string" ? asset.url : ""))
    .filter((url) => url.length > 0);
}

/** Shape image URLs into an OpenAI images API response body. */
export function buildImagesResponse(urls: string[], createdSeconds: number) {
  return {
    created: createdSeconds,
    data: urls.map((url) => ({ url }))
  };
}
