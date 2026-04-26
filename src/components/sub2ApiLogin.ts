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
  try {
    const url = new URL(urlValue);
    const queryToken = url.searchParams.get("token")?.trim() || url.searchParams.get("access_token")?.trim();
    if (queryToken) {
      return queryToken;
    }

    const hashParams = readHashParams(url.hash);
    const hashToken = hashParams.get("token")?.trim() || hashParams.get("access_token")?.trim();
    return hashToken || null;
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
