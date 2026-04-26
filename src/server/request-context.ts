import type { NextRequest, NextResponse } from "next/server";
import type { AuthenticatedUser } from "./auth";
import { getAuthenticatedUser, getRequestAuthToken } from "./auth";
import { claimInvite, resolveActor } from "./db/repositories";
import type { Actor } from "./db/types";
import { DEVICE_COOKIE, getClientIp, getOrCreateDeviceId, hashIdentifier, INVITE_COOKIE } from "./security/ip";
import { getSub2ApiCurrentUser } from "./sub2api/client";
import { LUMIO_TOKEN_COOKIE, SUB2API_ACCESS_COOKIE } from "./sub2api/session";

export type RequestContext = {
  actor: Actor;
  deviceId: string;
  isNewDevice: boolean;
  ipHash: string;
  sub2ApiAccessToken?: string;
};

export async function getRequestContext(request: NextRequest): Promise<RequestContext> {
  const jwtAuthUser = await getAuthenticatedUser(request);
  const sub2ApiAccessToken = getSub2ApiAccessToken(request);
  const authUser = jwtAuthUser || (await getSub2ApiAuthenticatedUser(sub2ApiAccessToken));
  const authToken = authUser ? sub2ApiAccessToken || getRequestAuthToken(request) : undefined;
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
    ipHash,
    sub2ApiAccessToken: authToken
  };
}

function getSub2ApiAccessToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get(SUB2API_ACCESS_COOKIE)?.value ||
    request.cookies.get(LUMIO_TOKEN_COOKIE)?.value
  );
}

async function getSub2ApiAuthenticatedUser(
  accessToken: string | undefined
): Promise<AuthenticatedUser | null> {
  if (!accessToken) {
    return null;
  }

  try {
    const user = await getSub2ApiCurrentUser(accessToken);
    return {
      externalUserId: `sub2api:${user.id}`,
      email: user.email,
      name: user.username,
      raw: {
        sub: `sub2api:${user.id}`,
        email: user.email,
        name: user.username
      }
    };
  } catch {
    return null;
  }
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
