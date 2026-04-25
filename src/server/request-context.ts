import type { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "./auth";
import { claimInvite, resolveActor } from "./db/repositories";
import type { Actor } from "./db/types";
import { DEVICE_COOKIE, getClientIp, getOrCreateDeviceId, hashIdentifier, INVITE_COOKIE } from "./security/ip";

export type RequestContext = {
  actor: Actor;
  deviceId: string;
  isNewDevice: boolean;
  ipHash: string;
};

export async function getRequestContext(request: NextRequest): Promise<RequestContext> {
  const authUser = await getAuthenticatedUser(request);
  const { deviceId, isNew } = getOrCreateDeviceId(request);
  const ipHash = hashIdentifier(getClientIp(request));
  const actor = await resolveActor({
    authUser,
    deviceId,
    ipHash
  });

  if (actor.type === "user") {
    const inviteCode = request.cookies.get(INVITE_COOKIE)?.value;
    if (inviteCode) {
      await claimInvite({
        inviteCode,
        inviteeUserId: actor.userId,
        deviceFingerprint: deviceId,
        ipHash
      });
    }
  }

  return {
    actor,
    deviceId,
    isNewDevice: isNew,
    ipHash
  };
}

export function applyContextCookies(
  response: NextResponse,
  context: Pick<RequestContext, "deviceId" | "isNewDevice">
): NextResponse {
  if (context.isNewDevice) {
    response.cookies.set(DEVICE_COOKIE, context.deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365
    });
  }

  return response;
}
