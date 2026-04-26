export const PROMPT_SHARE_COMPLIANCE_NOTICE =
  "仅供学习交流，禁止传播任何色情非法内容。";

export function buildPromptTryUrl(
  prompt: string,
  baseUrl = "https://img.lumio.games/"
): string {
  const url = new URL(baseUrl);
  url.searchParams.set("prompt", prompt);
  return url.toString();
}
