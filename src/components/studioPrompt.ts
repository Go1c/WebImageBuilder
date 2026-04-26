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
