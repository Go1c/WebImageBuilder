import type { NextRequest } from "next/server";
import { z } from "zod";
import { claimInvite } from "@/server/db/repositories";
import { ApiError, jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";
import { INVITE_COOKIE } from "@/server/security/ip";

export const runtime = "nodejs";

const claimSchema = z.object({
  inviteCode: z.string().min(4).max(64)
});

export async function POST(request: NextRequest) {
  try {
    const parsed = claimSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, "bad_request", parsed.error.message);
    }

    const context = await getRequestContext(request);

    if (context.actor.type === "user") {
      await claimInvite({
        inviteCode: parsed.data.inviteCode,
        inviteeUserId: context.actor.userId,
        deviceFingerprint: context.deviceId,
        ipHash: context.ipHash
      });
    }

    const response = jsonOk({ claimed: true });
    response.cookies.set(INVITE_COOKIE, parsed.data.inviteCode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30
    });

    return applyContextCookies(response, context);
  } catch (error) {
    return jsonError(error);
  }
}
