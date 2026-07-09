import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * OpenAI models 兼容端点 · 无限画布
 * 画布拉取可用模型列表(GET /v1/models)时命中这里，返回我们支持的图像模型，
 * 以 OpenAI models 形状呈现。保持与 domain/models 的 ModelKey 一致。
 */
const IMAGE_MODEL_IDS = [
  "gpt-image-2",
  "gpt-image-2-2k",
  "gpt-image-2-4k",
  "gemini-3.1-flash-image-preview"
];

export async function GET() {
  return NextResponse.json({
    object: "list",
    data: IMAGE_MODEL_IDS.map((id) => ({
      id,
      object: "model",
      owned_by: "lumio"
    }))
  });
}
