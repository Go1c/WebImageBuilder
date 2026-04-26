export const PROMPT_SHARE_COMPLIANCE_NOTICE =
  "仅供学习交流，禁止传播任何色情非法内容。";

type PublicUrlRequest = {
  headers: Pick<Headers, "get">;
  url: string;
};

export function buildPromptTryUrl(
  prompt: string,
  baseUrl = "/"
): string {
  const isSameOriginPath = baseUrl.startsWith("/") && !baseUrl.startsWith("//");
  const url = new URL(baseUrl, "https://img.lumio.games");
  url.searchParams.set("prompt", prompt);
  return isSameOriginPath ? `${url.pathname}${url.search}${url.hash}` : url.toString();
}

export function buildPromptShareUrl(
  shareId: string,
  request: PublicUrlRequest,
  configuredSiteUrl = process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
): string {
  const origin =
    normalizeOrigin(configuredSiteUrl) ||
    getForwardedOrigin(request) ||
    new URL(request.url).origin;

  return new URL(`/share/${encodeURIComponent(shareId)}`, origin).toString();
}

function getForwardedOrigin(request: PublicUrlRequest): string | null {
  const host = firstHeaderValue(request.headers.get("x-forwarded-host")) ||
    firstHeaderValue(request.headers.get("host"));
  if (!host) {
    return null;
  }

  const protocol = getPublicProtocol(request);
  return normalizeOrigin(`${protocol}://${host}`);
}

function getPublicProtocol(request: PublicUrlRequest): "http" | "https" {
  const forwardedProtocol = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  if (forwardedProtocol === "http" || forwardedProtocol === "https") {
    return forwardedProtocol;
  }

  try {
    const requestProtocol = new URL(request.url).protocol.replace(":", "");
    return requestProtocol === "http" ? "http" : "https";
  } catch {
    return "https";
  }
}

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function normalizeOrigin(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.origin;
  } catch {
    return null;
  }
}
