import { NextResponse, type NextRequest } from "next/server";
import { getAppConfig } from "@/server/config";
import { getSub2ApiChatApiKey } from "@/server/sub2api/client";
import { ApiError, jsonError } from "@/server/http";
import { getRequestContext } from "@/server/request-context";

export const runtime = "nodejs";
export const maxDuration = 600;

/**
 * OpenAI Responses 兼容端点 · 无限画布在线助手
 *
 * 画布的「在线画布助手」把对话 + 工具调用发到 baseUrl 的 /responses（即
 * /api/canvas/v1/responses）。这里作为代理，复用生图那套鉴权：优先用登录用户
 * Lumio「模型广场」里的对话分组 Key，回退到平台 Key，转发到同一个 OpenAI 兼容
 * 网关（OPENAI_BASE_URL = api.lumio.games），用文本模型（默认 gpt-5.5，可用
 * CANVAS_CHAT_MODEL 覆盖）。响应逐字透传（stream:true 时即 SSE）。
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const config = getAppConfig();

    let apiKey: string | undefined;
    if (context.sub2ApiAccessToken) {
      apiKey = await getSub2ApiChatApiKey(context.sub2ApiAccessToken);
    }
    apiKey = apiKey || config.openaiApiKey;
    if (!apiKey) {
      throw new ApiError(
        402,
        "account_unavailable",
        "未找到可用于对话的 API Key。请在 Lumio 模型广场创建一个包含文本模型（如 GPT-5.5）的分组 Key，或由管理员配置平台 Key。"
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    // 强制使用对话模型：画布配置里的 textModel 可能是图片模型，这里统一改成
    // 文本模型，保证助手对话/工具调用命中正确的模型。
    body.model = process.env.CANVAS_CHAT_MODEL || "gpt-5.5";

    const base = config.openaiBaseUrl.replace(/\/+$/, "");
    const upstream = await fetch(`${base}/v1/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: request.headers.get("accept") || "application/json"
      },
      body: JSON.stringify(body)
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    console.error("[api/canvas responses] request failed", error);
    return jsonError(error);
  }
}
