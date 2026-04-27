export type PromptShareCopyInput = {
  prompt: string;
  shareUrl: string;
};

export type PromptShareCardInput = PromptShareCopyInput & {
  imageUrl: string;
  complianceNotice?: string;
};

export function summarizePromptForShare(prompt: string, maxLength = 120): string {
  const normalized = normalizePrompt(prompt);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const clippedLength = Math.max(0, maxLength - 3);
  return `${normalized.slice(0, clippedLength).trimEnd()}...`;
}

export function buildPromptShareCopyText(input: PromptShareCopyInput): string {
  return `我在 Lumio 使用Image-2生成了一张图，你可以打开链接生成同款：${input.shareUrl}`;
}

export function buildPromptShareCardSvg(input: PromptShareCardInput): string {
  const promptLines = wrapPromptForSvg(summarizePromptForShare(input.prompt, 150), 26, 4);
  const compliance = input.complianceNotice || "仅供学习交流，禁止传播任何色情非法内容。";

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1280" viewBox="0 0 960 1280">',
    '<rect width="960" height="1280" fill="#fafafa"/>',
    '<rect x="64" y="64" width="832" height="832" rx="28" fill="#f5f5f5"/>',
    `<image href="${escapeXml(input.imageUrl)}" x="64" y="64" width="832" height="832" preserveAspectRatio="xMidYMid slice"/>`,
    '<rect x="64" y="64" width="832" height="832" rx="28" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="2"/>',
    '<text x="64" y="976" fill="#171717" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700">Lumio 提示词分享</text>',
    '<text x="64" y="1028" fill="#404040" font-family="Inter, Arial, sans-serif" font-size="24">用这个提示词生成同款图片</text>',
    ...promptLines.map(
      (line, index) =>
        `<text x="64" y="${1092 + index * 38}" fill="#171717" font-family="Inter, Arial, sans-serif" font-size="26">${escapeXml(line)}</text>`
    ),
    `<text x="64" y="1230" fill="#737373" font-family="Inter, Arial, sans-serif" font-size="20">${escapeXml(compliance)}</text>`,
    "</svg>"
  ].join("");
}

export function buildShareCardFileName(now = new Date()): string {
  return `lumio-prompt-card-${formatTimestamp(now)}.svg`;
}

function normalizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim();
}

function wrapPromptForSvg(prompt: string, lineLength: number, maxLines: number): string[] {
  const lines: string[] = [];
  let remaining = prompt;

  while (remaining.length && lines.length < maxLines) {
    if (remaining.length <= lineLength) {
      lines.push(remaining);
      break;
    }

    lines.push(remaining.slice(0, lineLength));
    remaining = remaining.slice(lineLength);
  }

  if (remaining.length && lines.length === maxLines) {
    const lastIndex = lines.length - 1;
    lines[lastIndex] = `${lines[lastIndex].slice(0, Math.max(0, lineLength - 3)).trimEnd()}...`;
  }

  return lines.length ? lines : ["这个提示词暂未公开。"];
}

function formatTimestamp(value: Date): string {
  const year = value.getFullYear();
  const month = padDatePart(value.getMonth() + 1);
  const day = padDatePart(value.getDate());
  const hours = padDatePart(value.getHours());
  const minutes = padDatePart(value.getMinutes());
  const seconds = padDatePart(value.getSeconds());

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
