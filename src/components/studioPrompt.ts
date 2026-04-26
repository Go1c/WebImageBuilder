export function appendPromptToken(prompt: string, token: string): string {
  const current = prompt.trim();
  const nextToken = token.trim();

  if (!nextToken || current.includes(nextToken)) {
    return current;
  }

  return current ? `${current}，${nextToken}` : nextToken;
}

export function buildPromptFromLibraryItem(prompt: string, itemLabel: string): string {
  return appendPromptToken(appendPromptToken(prompt, itemLabel), "精致构图，高质量图像");
}

export function readPromptFromSearchParam(
  value: string | string[] | null | undefined
): string | null {
  const rawPrompt = Array.isArray(value) ? value[0] : value;
  const prompt = rawPrompt?.trim();
  return prompt || null;
}

export function readPromptFromUrl(urlValue: string): string | null {
  try {
    return readPromptFromSearchParam(new URL(urlValue).searchParams.get("prompt"));
  } catch {
    return null;
  }
}
