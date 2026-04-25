import type { NextRequest } from "next/server";
import { listHistory } from "@/server/db/repositories";
import { jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const history = await listHistory(context.actor);
    const response = jsonOk({ history });
    return applyContextCookies(response, context);
  } catch (error) {
    return jsonError(error);
  }
}
