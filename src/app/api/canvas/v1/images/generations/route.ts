import { NextResponse, type NextRequest } from "next/server";
import { generateImagesForActor } from "@/server/generation/service";
import { jsonError } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";
import { buildGenerationInput, buildImagesResponse, extractImageUrls } from "@/server/canvas/openaiImageAdapter";

export const runtime = "nodejs";
export const maxDuration = 600;

/**
 * OpenAI images 兼容端点 · 无限画布专用
 *
 * 画布 (canvas-app) 的 baseUrl 指向 /api/canvas，其 /v1/images/generations
 * 落到这里。使用 generateImagesForActor —— 它同步 await 完整生成（provider
 * 调用 + S3 上传 + 落库），并复用生图站的 quota 扣减与 sub2api 鉴权，直接返回
 * 图片资产。不能用 startGeneration + 轮询：其后台任务在 HTTP 响应返回后可能被
 * 容器冻结，导致任务永不完成、画布侧一直转圈。
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rawInput = buildGenerationInput(body);

    const result = await generateImagesForActor({
      actor: context.actor,
      rawInput,
      sub2ApiAccessToken: context.sub2ApiAccessToken
    });

    const urls = extractImageUrls({ images: result.images });
    const response = NextResponse.json(buildImagesResponse(urls, Math.floor(Date.now() / 1000)));
    return applyContextCookies(response, context);
  } catch (error) {
    console.error("[api/canvas images] request failed", error);
    return jsonError(error);
  }
}
