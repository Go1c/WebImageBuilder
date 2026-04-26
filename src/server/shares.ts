export const PROMPT_SHARE_COMPLIANCE_NOTICE =
  "仅供学习交流，禁止传播任何色情非法内容。";

export function buildPromptTryUrl(
  prompt: string,
  baseUrl = "/"
): string {
  const isSameOriginPath = baseUrl.startsWith("/") && !baseUrl.startsWith("//");
  const url = new URL(baseUrl, "https://img.lumio.games");
  url.searchParams.set("prompt", prompt);
  return isSameOriginPath ? `${url.pathname}${url.search}${url.hash}` : url.toString();
}
