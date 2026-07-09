import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "../auth";
import { getAppConfig } from "../config";
import { ApiError } from "../http";
import { getSub2ApiCurrentUser } from "../sub2api/client";
import { LUMIO_TOKEN_COOKIE, SUB2API_ACCESS_COOKIE } from "../sub2api/session";

export type AdminIdentity = {
  email: string;
  externalUserId?: string;
  name?: string;
};

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) {
    return false;
  }

  const { adminEmails } = getAppConfig();
  return adminEmails.includes(email.trim().toLowerCase());
}

/**
 * Resolve the current admin from the request, or null when the caller is not a
 * whitelisted admin. Checks the JWT identity first, then falls back to a
 * sub2api access token (same precedence as the public request context).
 */
export async function getAdminIdentity(request: NextRequest): Promise<AdminIdentity | null> {
  const config = getAppConfig();

  // Local dev bypass: without JWT/sub2api infrastructure, allow previewing the
  // admin backend in LUMIO_LOCAL_MODE using the first configured admin email.
  if (config.localMode && !config.databaseUrl) {
    return { email: config.adminEmails[0] || "admin@lumio.games", name: "本地管理员" };
  }

  const jwtUser = await getAuthenticatedUser(request);
  if (jwtUser && isAdminEmail(jwtUser.email)) {
    return {
      email: jwtUser.email!.trim().toLowerCase(),
      externalUserId: jwtUser.externalUserId,
      name: jwtUser.name
    };
  }

  const accessToken =
    request.cookies.get(SUB2API_ACCESS_COOKIE)?.value ||
    request.cookies.get(LUMIO_TOKEN_COOKIE)?.value;

  if (accessToken) {
    try {
      const user = await getSub2ApiCurrentUser(accessToken);
      if (isAdminEmail(user.email)) {
        return {
          email: user.email!.trim().toLowerCase(),
          externalUserId: `sub2api:${user.id}`,
          name: user.username
        };
      }
    } catch {
      // fall through to unauthorized
    }
  }

  return null;
}

/**
 * Guard for /api/admin/* handlers. Throws an ApiError (401/403) when the caller
 * is not an authenticated admin, otherwise returns the admin identity.
 */
export async function requireAdmin(request: NextRequest): Promise<AdminIdentity> {
  const admin = await getAdminIdentity(request);
  if (!admin) {
    throw new ApiError(403, "unauthorized", "需要管理员权限");
  }

  return admin;
}
