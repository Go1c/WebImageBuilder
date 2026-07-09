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

export type Sub2ApiApiKey = {
  id: number | string;
  key: string;
  name?: string;
  status?: string;
  group?: {
    id?: number | string;
    name?: string;
    platform?: string;
  } | null;
};

export type Sub2ApiPaginatedResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  pages?: number;
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

export async function listSub2ApiKeys(
  accessToken: string,
  baseUrl?: string
): Promise<Sub2ApiPaginatedResponse<Sub2ApiApiKey>> {
  return requestSub2Api<Sub2ApiPaginatedResponse<Sub2ApiApiKey>>(
    "/keys?page=1&page_size=100&status=active",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    baseUrl
  );
}

export type Sub2ApiGenerationProvider = "openai" | "gemini";

export async function getSub2ApiImageApiKey(accessToken: string, baseUrl?: string): Promise<string> {
  return getSub2ApiGenerationApiKey(accessToken, "openai", baseUrl);
}

export async function getSub2ApiGenerationApiKey(
  accessToken: string,
  provider: Sub2ApiGenerationProvider,
  baseUrl?: string
): Promise<string> {
  let keys: Sub2ApiPaginatedResponse<Sub2ApiApiKey>;
  try {
    keys = await listSub2ApiKeys(accessToken, baseUrl);
  } catch (error) {
    if (error instanceof ApiError && error.code === "unauthorized") {
      throw error;
    }

    if (isKeyLookupSetupFailure(error)) {
      throw missingSub2ApiImageKeyError(provider);
    }

    throw error;
  }

  const imageKey = selectGenerationKeyForProvider(keys.items || [], provider);

  if (!imageKey?.key) {
    throw missingSub2ApiImageKeyError(provider);
  }

  return imageKey.key;
}

/**
 * Chat/text key for the canvas online assistant (/responses). The user's Lumio
 * "模型广场" holds keys grouped by platform; for chat we want an active OpenAI-
 * platform key from a NON-image group (the image group is 生图专用). Falls back to
 * any active OpenAI key. Returns undefined if none — caller can fall back to the
 * platform key.
 */
export async function getSub2ApiChatApiKey(
  accessToken: string,
  baseUrl?: string
): Promise<string | undefined> {
  let keys: Sub2ApiPaginatedResponse<Sub2ApiApiKey>;
  try {
    keys = await listSub2ApiKeys(accessToken, baseUrl);
  } catch {
    return undefined;
  }
  const openaiKeys = (keys.items || []).filter((item) => isActiveProviderKey(item, "openai"));
  const chatKey =
    openaiKeys.find((item) => !isImageGroupName(item.group?.name)) || openaiKeys[0];
  return chatKey?.key || undefined;
}

function selectGenerationKeyForProvider(
  keys: Sub2ApiApiKey[],
  provider: Sub2ApiGenerationProvider
): Sub2ApiApiKey | undefined {
  if (provider === "openai") {
    return keys.find((item) => isActiveProviderKey(item, provider) && isImageGroupName(item.group?.name));
  }

  const providerKeys = keys.filter((item) => isActiveProviderKey(item, provider));
  return (
    providerKeys.find((item) => isImageGroupName(item.group?.name)) ||
    providerKeys.find((item) => item.group?.name?.trim().toLowerCase().includes("gemini"))
  );
}

function isActiveProviderKey(item: Sub2ApiApiKey, provider: Sub2ApiGenerationProvider): boolean {
  const platform = item.group?.platform?.trim().toLowerCase();
  return item.status === "active" && Boolean(item.key) && platform === provider;
}

function isImageGroupName(name: string | undefined): boolean {
  const groupName = name?.trim().toLowerCase() || "";
  return groupName.includes("image") || groupName.includes("生图");
}

function missingSub2ApiImageKeyError(provider: Sub2ApiGenerationProvider): ApiError {
  const description =
    provider === "gemini"
      ? {
          platform: "Gemini",
          group: "Gemini（生图专用）",
          keyword: "gemini 或 image"
        }
      : {
          platform: "OpenAI",
          group: "Image-2（生图专用）",
          keyword: "image"
        };

  return new ApiError(
    402,
    "account_unavailable",
    `未找到可用于图片生成的 active ${description.platform} API Key。请在 Sub2API 创建或启用一个 Key，并绑定到平台为 ${description.platform}、分组名包含 ${description.keyword} 的分组，例如 ${description.group}。可查看教程或帮助文档完成创建。`
  );
}

function isKeyLookupSetupFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("not found") ||
    message.includes("(404,")
  );
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
