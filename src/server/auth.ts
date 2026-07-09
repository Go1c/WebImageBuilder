import { jwtVerify, importSPKI, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";
import { getAppConfig } from "./config";

export type AuthenticatedUser = {
  externalUserId: string;
  email?: string;
  name?: string;
  raw: JWTPayload;
};

export function getRequestAuthToken(request: NextRequest): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  return request.cookies.get("lumio_token")?.value;
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const token = getRequestAuthToken(request);
  if (!token) {
    return null;
  }

  return verifyJwtToken(token);
}

/**
 * Verify a raw JWT and return the authenticated user, or null when the token is
 * missing/invalid or no verification key is configured. Shared by the
 * NextRequest-based guard and server-component (next/headers) auth.
 */
export async function verifyJwtToken(token: string): Promise<AuthenticatedUser | null> {
  const config = getAppConfig();

  if (!config.jwtPublicKey && !config.jwtSecret) {
    return null;
  }

  const key = config.jwtPublicKey
    ? await importSPKI(config.jwtPublicKey.replace(/\\n/g, "\n"), "RS256")
    : new TextEncoder().encode(config.jwtSecret || "");

  let verified: { payload: JWTPayload };
  try {
    verified = await jwtVerify(token, key);
  } catch {
    return null;
  }

  const externalUserId =
    verified.payload.sub ||
    String(verified.payload.user_id || verified.payload.id || "").trim();

  if (!externalUserId) {
    return null;
  }

  return {
    externalUserId,
    email: typeof verified.payload.email === "string" ? verified.payload.email : undefined,
    name: typeof verified.payload.name === "string" ? verified.payload.name : undefined,
    raw: verified.payload
  };
}
