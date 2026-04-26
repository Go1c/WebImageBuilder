import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, jsonError } from "@/server/http";
import {
  getSub2ApiCurrentUser,
  logoutSub2Api,
  refreshSub2ApiToken,
  type Sub2ApiRefreshResponse
} from "@/server/sub2api/client";
import {
  buildAnonymousSub2ApiSession,
  buildSub2ApiSession,
  getAccessTokenMaxAge,
  getRefreshTokenMaxAge,
  getSub2ApiClearCookieOptions,
  getSub2ApiCookieOptions,
  getTokenExpiresAt,
  LUMIO_TOKEN_COOKIE,
  SUB2API_ACCESS_COOKIE,
  SUB2API_EXPIRES_COOKIE,
  SUB2API_REFRESH_COOKIE
} from "@/server/sub2api/session";

export const runtime = "nodejs";

const attachTokenSchema = z.object({
  action: z.literal("attachToken"),
  accessToken: z.string().min(1)
});

export async function GET(request: NextRequest) {
  try {
    return await readSessionResponse(request);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = attachTokenSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, "bad_request", "Invalid Sub2API session request");
    }

    return createAccessOnlyResponse(
      parsed.data.accessToken,
      buildSub2ApiSession(await getSub2ApiCurrentUser(parsed.data.accessToken))
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const refreshToken = request.cookies.get(SUB2API_REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await logoutSub2Api(refreshToken);
    } catch {
      // Local logout must succeed even if the upstream token is already invalid.
    }
  }

  const response = NextResponse.json(buildAnonymousSub2ApiSession());
  clearSessionCookies(response);
  return response;
}

async function readSessionResponse(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(SUB2API_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(SUB2API_REFRESH_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json(buildAnonymousSub2ApiSession());
  }

  try {
    return NextResponse.json(buildSub2ApiSession(await getSub2ApiCurrentUser(accessToken)));
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !refreshToken) {
      const response = NextResponse.json(buildAnonymousSub2ApiSession());
      clearSessionCookies(response);
      return response;
    }

    const refreshed = await refreshSub2ApiToken(refreshToken);
    const nextAccessToken = refreshed.access_token;
    const user = await getSub2ApiCurrentUser(nextAccessToken);
    const response = NextResponse.json(buildSub2ApiSession(user));
    setSessionCookies(response, refreshed, refreshToken);
    return response;
  }
}

function createAccessOnlyResponse(accessToken: string, body: ReturnType<typeof buildSub2ApiSession>): NextResponse {
  const response = NextResponse.json(body);
  const maxAge = getAccessTokenMaxAge(undefined);
  response.cookies.set(SUB2API_ACCESS_COOKIE, accessToken, getSub2ApiCookieOptions(maxAge));
  response.cookies.set(LUMIO_TOKEN_COOKIE, accessToken, getSub2ApiCookieOptions(maxAge));
  response.cookies.set(
    SUB2API_EXPIRES_COOKIE,
    String(getTokenExpiresAt(undefined)),
    getSub2ApiCookieOptions(maxAge)
  );
  return response;
}

function setSessionCookies(
  response: NextResponse,
  auth: Sub2ApiRefreshResponse,
  refreshTokenFallback?: string
): void {
  const maxAge = getAccessTokenMaxAge(auth.expires_in);
  response.cookies.set(SUB2API_ACCESS_COOKIE, auth.access_token, getSub2ApiCookieOptions(maxAge));
  response.cookies.set(LUMIO_TOKEN_COOKIE, auth.access_token, getSub2ApiCookieOptions(maxAge));
  response.cookies.set(
    SUB2API_EXPIRES_COOKIE,
    String(getTokenExpiresAt(auth.expires_in)),
    getSub2ApiCookieOptions(maxAge)
  );

  const refreshToken = auth.refresh_token || refreshTokenFallback;
  if (refreshToken) {
    response.cookies.set(
      SUB2API_REFRESH_COOKIE,
      refreshToken,
      getSub2ApiCookieOptions(getRefreshTokenMaxAge())
    );
  }
}

function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(SUB2API_ACCESS_COOKIE, "", getSub2ApiClearCookieOptions());
  response.cookies.set(SUB2API_REFRESH_COOKIE, "", getSub2ApiClearCookieOptions());
  response.cookies.set(SUB2API_EXPIRES_COOKIE, "", getSub2ApiClearCookieOptions());
  response.cookies.set(LUMIO_TOKEN_COOKIE, "", getSub2ApiClearCookieOptions());
}
