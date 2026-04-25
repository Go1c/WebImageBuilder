import type { NextRequest } from "next/server";
import { getQuotaSnapshot } from "@/server/domain/quota";
import { getQuotaState } from "@/server/db/repositories";
import { jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const quotaState = await getQuotaState(context.actor);
    const response = jsonOk({
      actorType: quotaState.actorType,
      quota: getQuotaSnapshot(quotaState),
      ipDailyUsed: quotaState.ipDailyUsed
    });
    return applyContextCookies(response, context);
  } catch (error) {
    return jsonError(error);
  }
}
