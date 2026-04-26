import type { NextRequest } from "next/server";
import { reportPromptShare } from "@/server/db/repositories";
import { ApiError, jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const reported = await reportPromptShare(id);
    if (!reported) {
      throw new ApiError(404, "not_found", "Share not found");
    }

    return jsonOk({ status: "reported" });
  } catch (error) {
    return jsonError(error);
  }
}
