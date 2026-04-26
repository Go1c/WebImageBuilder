import type { NextRequest } from "next/server";
import { getUserInviteCode } from "@/server/db/repositories";
import { getQuotaConfig } from "@/server/domain/quota";
import { ApiError, jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);

    if (context.actor.type !== "user") {
      throw new ApiError(401, "unauthorized", "Login is required to get an invite link");
    }

    const inviteCode = await getUserInviteCode(context.actor.userId);
    if (!inviteCode) {
      throw new ApiError(404, "not_found", "Invite code was not found for this user");
    }

    const inviteUrl = new URL(request.nextUrl.origin);
    inviteUrl.searchParams.set("invite", inviteCode);

    const response = jsonOk({
      inviteCode,
      inviteUrl: inviteUrl.toString(),
      rewardGenerations: getQuotaConfig().inviteRewardGenerations
    });

    return applyContextCookies(response, context);
  } catch (error) {
    return jsonError(error);
  }
}
