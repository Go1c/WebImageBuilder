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

export function insertPromptTextAtSelection(
  prompt: string,
  text: string,
  selectionStart: number,
  selectionEnd: number
): string {
  const start = clampSelectionIndex(selectionStart, prompt.length);
  const end = clampSelectionIndex(selectionEnd, prompt.length);
  const from = Math.min(start, end);
  const to = Math.max(start, end);

  return `${prompt.slice(0, from)}${text}${prompt.slice(to)}`;
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

function clampSelectionIndex(index: number, max: number): number {
  if (!Number.isFinite(index)) {
    return max;
  }

  return Math.min(Math.max(Math.floor(index), 0), max);
}
