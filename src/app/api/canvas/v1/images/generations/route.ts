import { NextResponse, type NextRequest } from "next/server";
import { startGeneration } from "@/server/generation/service";
import { getTask } from "@/server/db/repositories";
import { ApiError, jsonError } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";
import { buildGenerationInput, buildImagesResponse, extractImageUrls } from "@/server/canvas/openaiImageAdapter";

export const runtime = "nodejs";
export const maxDuration = 600;

const POLL_INTERVAL_MS = 1500;
const POLL_BUDGET_MS = 240_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTaskImages(
  actor: Parameters<typeof getTask>[0],
  taskId: string
): Promise<string[]> {
  const deadline = Date.now() + POLL_BUDGET_MS;
  while (Date.now() < deadline) {
    const task = (await getTask(actor, taskId)) as
      | { status?: string; assets?: unknown; images?: unknown }
      | null;
    if (task?.status === "succeeded") {
      return extractImageUrls(task);
    }
    if (task?.status === "failed") {
      throw new ApiError(502, "provider_error", "画布生成失败，请重试或更换模型");
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new ApiError(504, "provider_error", "画布生成超时，请稍后重试");
}

/**
 * OpenAI images 兼容端点 · 无限画布专用
 * 画布 (canvas-app) 的 baseUrl 指向 /api/canvas，其 /v1/images/generations
 * 落到这里：复用生图站的 startGeneration（quota 扣减 + S3 + sub2api 鉴权），
 * 轮询任务完成后以 OpenAI images 形状返回，画布内部逻辑无需改动。
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rawInput = buildGenerationInput(body);

    const result = await startGeneration({
      actor: context.actor,
      rawInput,
      sub2ApiAccessToken: context.sub2ApiAccessToken
    });

    let urls = extractImageUrls(result as never);
    if (urls.length === 0) {
      urls = await waitForTaskImages(context.actor, result.taskId);
    }

    const response = NextResponse.json(buildImagesResponse(urls, Math.floor(Date.now() / 1000)));
    return applyContextCookies(response, context);
  } catch (error) {
    console.error("[api/canvas images] request failed", error);
    return jsonError(error);
  }
}
