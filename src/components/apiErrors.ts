const maxErrorBodyLength = 500;

export async function readApiError(response: Response): Promise<string> {
  const status = formatStatus(response);
  const text = await response.text();
  const structuredMessage = parseStructuredError(text);
  const detail = structuredMessage || summarizeResponseText(text);

  return detail ? `${status} - ${detail}` : status;
}

export async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(fallbackMessage);
  }
}

function formatStatus(response: Response): string {
  return `请求失败：${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
}

function parseStructuredError(text: string): string | null {
  if (!text.trim()) {
    return null;
  }

  try {
    const body = JSON.parse(text) as { error?: { message?: unknown }; message?: unknown };
    const message = body.error?.message || body.message;
    return typeof message === "string" && message.trim() ? message.trim() : null;
  } catch {
    return null;
  }
}

function summarizeResponseText(text: string): string | null {
  const cleaned = stripHtml(text)
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.length > maxErrorBodyLength
    ? `${cleaned.slice(0, maxErrorBodyLength).trim()}...`
    : cleaned;
}

function stripHtml(text: string): string {
  return text.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}
