import { NextResponse } from "next/server";
import { modelKeys } from "@/server/domain/models";

export const runtime = "nodejs";

/**
 * OpenAI models 兼容端点 · 无限画布
 * 画布拉取可用模型列表(GET /v1/models)时命中这里，返回我们支持的图像模型，
 * 以 OpenAI models 形状呈现。保持与 domain/models 的 ModelKey 一致。
 */
export async function GET() {
  return NextResponse.json({
    object: "list",
    data: modelKeys.map((id) => ({
      id,
      object: "model",
      owned_by: "lumio"
    }))
  });
}
