import type { Sub2ApiRefreshResponse, Sub2ApiUser } from "./client";

export const SUB2API_ACCESS_COOKIE = "lumio_sub2api_access_token";
export const SUB2API_REFRESH_COOKIE = "lumio_sub2api_refresh_token";
export const SUB2API_EXPIRES_COOKIE = "lumio_sub2api_expires_at";
export const LUMIO_TOKEN_COOKIE = "lumio_token";

const defaultAccessTokenMaxAgeSeconds = 3_540;
const refreshTokenMaxAgeSeconds = 60 * 60 * 24 * 30;

export type Sub2ApiSessionPayload = {
  authenticated: boolean;
  user: {
    id: number | string;
    email: string;
    username?: string;
    avatar_url: string | null;
    balance: number;
    role?: string;
    run_mode?: string;
  } | null;
};

export function buildSub2ApiSession(user: Sub2ApiUser): Sub2ApiSessionPayload {
  return {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar_url: user.avatar_url ?? null,
      balance: Number(user.balance || 0),
      role: user.role,
      run_mode: user.run_mode
    }
  };
}

export function buildAnonymousSub2ApiSession(): Sub2ApiSessionPayload {
  return {
    authenticated: false,
    user: null
  };
}

export function getAccessTokenMaxAge(expiresIn: number | undefined): number {
  const safeExpiresIn = Number.isFinite(expiresIn) && expiresIn ? Math.floor(expiresIn) : 3_600;
  return Math.max(60, safeExpiresIn - 60);
}

export function getTokenExpiresAt(expiresIn: number | undefined, now = Date.now()): number {
  return now + getAccessTokenMaxAge(expiresIn) * 1000;
}

type Sub2ApiCookieOptions = {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
};

export function getSub2ApiCookieOptions(maxAge: number): Sub2ApiCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  };
}

export function getSub2ApiClearCookieOptions(): Sub2ApiCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  };
}

export function getRefreshTokenMaxAge(): number {
  return refreshTokenMaxAgeSeconds;
}

export function getAuthResponseExpiresIn(auth: Sub2ApiRefreshResponse): number | undefined {
  return auth.expires_in || undefined;
}

export function getDefaultAccessTokenMaxAge(): number {
  return defaultAccessTokenMaxAgeSeconds;
}
