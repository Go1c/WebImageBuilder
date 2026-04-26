import type { NextRequest } from "next/server";
import { z } from "zod";
import { createSession, listSessions } from "@/server/db/repositories";
import { jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";

export const runtime = "nodejs";

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional()
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const sessions = await listSessions(context.actor);
    return applyContextCookies(jsonOk({ sessions }), context);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const input = createSessionSchema.parse(await request.json());
    const session = await createSession({ actor: context.actor, title: input.title });
    return applyContextCookies(jsonOk({ id: session.id, session }), context);
  } catch (error) {
    return jsonError(error);
  }
}
