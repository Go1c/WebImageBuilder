import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";
import { listSessionTasks } from "@/server/db/repositories";

export const runtime = "nodejs";

/**
 * GET /api/sessions/[id]/tasks
 * Returns all generation tasks (with assets) for a project — used by the
 * v2 project detail page and gallery.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext(request);
    const tasks = await listSessionTasks(ctx.actor, id);
    return applyContextCookies(jsonOk({ tasks }), ctx);
  } catch (error) {
    return jsonError(error);
  }
}
