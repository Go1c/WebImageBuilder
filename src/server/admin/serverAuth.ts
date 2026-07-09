import { cookies, headers } from "next/headers";
import { verifyJwtToken } from "../auth";
import { getAppConfig } from "../config";
import { getSub2ApiCurrentUser } from "../sub2api/client";
import { LUMIO_TOKEN_COOKIE, SUB2API_ACCESS_COOKIE } from "../sub2api/session";
import { isAdminEmail, type AdminIdentity } from "./auth";

/**
 * Resolve the current admin inside a Server Component / Route using next/headers.
 * Mirrors getAdminIdentity (which takes a NextRequest) for use in the admin
 * layout and pages. Returns null when the caller is not a whitelisted admin.
 */
export async function getServerAdminIdentity(): Promise<AdminIdentity | null> {
  const config = getAppConfig();

  if (config.localMode && !config.databaseUrl) {
    return { email: config.adminEmails[0] || "admin@lumio.games", name: "本地管理员" };
  }

  const headerStore = await headers();
  const cookieStore = await cookies();

  const authorization = headerStore.get("authorization");
  const bearer = authorization?.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : undefined;
  const jwt = bearer || cookieStore.get("lumio_token")?.value;

  if (jwt) {
    const user = await verifyJwtToken(jwt);
    if (user && isAdminEmail(user.email)) {
      return { email: user.email!.trim().toLowerCase(), externalUserId: user.externalUserId, name: user.name };
    }
  }

  const accessToken =
    cookieStore.get(SUB2API_ACCESS_COOKIE)?.value || cookieStore.get(LUMIO_TOKEN_COOKIE)?.value;

  if (accessToken) {
    try {
      const user = await getSub2ApiCurrentUser(accessToken);
      if (isAdminEmail(user.email)) {
        return { email: user.email!.trim().toLowerCase(), externalUserId: `sub2api:${user.id}`, name: user.username };
      }
    } catch {
      // fall through
    }
  }

  return null;
}
