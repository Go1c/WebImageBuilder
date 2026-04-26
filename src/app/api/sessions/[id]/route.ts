import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSession, updateSession } from "@/server/db/repositories";
import { ApiError, jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";

export const runtime = "nodejs";

const updateSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  palette: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(8).optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getRequestContext(request);
    const session = await getSession(context.actor, id);

    if (!session) {
      throw new ApiError(404, "not_found", "Project was not found");
    }

    return applyContextCookies(jsonOk({ session }), context);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getRequestContext(request);
    const input = updateSessionSchema.parse(await request.json());
    const session = await updateSession({
      actor: context.actor,
      sessionId: id,
      title: input.title,
      palette: input.palette
    });

    if (!session) {
      throw new ApiError(404, "not_found", "Project was not found");
    }

    return applyContextCookies(jsonOk({ session }), context);
  } catch (error) {
    return jsonError(error);
  }
}
