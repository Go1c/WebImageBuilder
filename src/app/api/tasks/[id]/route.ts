import type { NextRequest } from "next/server";
import { getTask } from "@/server/db/repositories";
import { ApiError, jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const requestContext = await getRequestContext(request);
    const { id } = await context.params;
    const task = await getTask(requestContext.actor, id);
    if (!task) {
      throw new ApiError(404, "not_found", "Task not found");
    }
    const response = jsonOk({ task });
    return applyContextCookies(response, requestContext);
  } catch (error) {
    return jsonError(error);
  }
}
