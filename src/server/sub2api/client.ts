import { ApiError } from "../http";
import { getAppConfig } from "../config";

export type Sub2ApiEnvelope<T> = {
  code: number;
  message: string;
  data?: T;
};

export type Sub2ApiUser = {
  id: number | string;
  email: string;
  username?: string;
  avatar_url?: string | null;
  role?: string;
  balance?: number;
  concurrency?: number;
  status?: string;
  run_mode?: string;
};

export type Sub2ApiRefreshResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

export function sub2ApiUrl(path: string, baseUrl = getAppConfig().sub2ApiBaseUrl): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export async function getSub2ApiCurrentUser(
  accessToken: string,
  baseUrl?: string
): Promise<Sub2ApiUser> {
  return requestSub2Api<Sub2ApiUser>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }, baseUrl);
}

export async function refreshSub2ApiToken(
  refreshToken: string,
  baseUrl?: string
): Promise<Sub2ApiRefreshResponse> {
  return requestSub2Api<Sub2ApiRefreshResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  }, baseUrl);
}

export async function logoutSub2Api(refreshToken: string, baseUrl?: string): Promise<void> {
  await requestSub2Api<unknown>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  }, baseUrl);
}

async function requestSub2Api<T>(
  path: string,
  init: RequestInit,
  baseUrl = getAppConfig().sub2ApiBaseUrl
): Promise<T> {
  const response = await fetch(sub2ApiUrl(path, baseUrl), {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers
    }
  });
  const envelope = await readSub2ApiEnvelope<T>(response);

  if (response.status >= 400 || envelope.code !== 0) {
    throw new ApiError(
      response.status === 401 ? 401 : 502,
      response.status === 401 ? "unauthorized" : "provider_error",
      envelope.message || `Sub2API request failed: ${response.status}`
    );
  }

  if (typeof envelope.data === "undefined") {
    throw new ApiError(502, "provider_error", "Sub2API response did not contain data");
  }

  return envelope.data;
}

async function readSub2ApiEnvelope<T>(response: Response): Promise<Sub2ApiEnvelope<T>> {
  const text = await response.text();

  try {
    return JSON.parse(text) as Sub2ApiEnvelope<T>;
  } catch {
    const contentType = response.headers.get("content-type") || "unknown content type";
    throw new ApiError(
      502,
      "provider_error",
      `Sub2API returned a non-JSON response (${response.status}, ${contentType})`
    );
  }
}
