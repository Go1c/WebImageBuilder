const sub2ApiAuthParamKeys = [
  "token",
  "access_token",
  "refresh_token",
  "expires_in",
  "token_type",
  "user_id",
  "theme",
  "lang",
  "ui_mode",
  "src_host",
  "src_url"
];

export type Sub2ApiAuthHandoff = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

export function buildSub2ApiLoginUrl({
  loginBaseUrl,
  returnToUrl
}: {
  loginBaseUrl: string;
  returnToUrl?: string | null;
}): string {
  try {
    const url = new URL(loginBaseUrl);
    const cleanReturnToUrl = returnToUrl?.trim()
      ? stripSub2ApiAuthParamsFromUrl(returnToUrl.trim())
      : "";

    if (cleanReturnToUrl) {
      url.searchParams.set("return_to", cleanReturnToUrl);
      url.searchParams.set("handoff", "1");
    }

    return url.toString();
  } catch {
    return loginBaseUrl;
  }
}

export function readSub2ApiTokenFromUrl(urlValue: string): string | null {
  return readSub2ApiAuthFromUrl(urlValue)?.accessToken ?? null;
}

export function readSub2ApiAuthFromUrl(urlValue: string): Sub2ApiAuthHandoff | null {
  try {
    const url = new URL(urlValue);
    const queryAuth = readSub2ApiAuthParams(url.searchParams);
    if (queryAuth) {
      return queryAuth;
    }

    const hashParams = readHashParams(url.hash);
    return readSub2ApiAuthParams(hashParams);
  } catch {
    return null;
  }
}

export function stripSub2ApiAuthParamsFromUrl(urlValue: string): string {
  try {
    const url = new URL(urlValue);

    sub2ApiAuthParamKeys.forEach((key) => {
      url.searchParams.delete(key);
    });

    const hashParams = readHashParams(url.hash);
    if (hashParams.size > 0) {
      sub2ApiAuthParamKeys.forEach((key) => {
        hashParams.delete(key);
      });
      url.hash = hashParams.size > 0 ? hashParams.toString() : "";
    }

    return url.toString();
  } catch {
    return urlValue;
  }
}

function readHashParams(hash: string): URLSearchParams {
  const rawHash = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(rawHash);
}

function readSub2ApiAuthParams(params: URLSearchParams): Sub2ApiAuthHandoff | null {
  const accessToken = params.get("token")?.trim() || params.get("access_token")?.trim();
  if (!accessToken) {
    return null;
  }

  const refreshToken = params.get("refresh_token")?.trim() || undefined;
  const expiresIn = parseExpiresIn(params.get("expires_in"));

  return {
    accessToken,
    ...(refreshToken ? { refreshToken } : {}),
    ...(expiresIn ? { expiresIn } : {})
  };
}

function parseExpiresIn(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const expiresIn = Number(value);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    return undefined;
  }

  return Math.floor(expiresIn);
}
