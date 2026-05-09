const maxErrorBodyLength = 500;

export type ApiErrorDetail = {
  status: number;
  statusText: string;
  code?: string;
  message: string;
  isStructured: boolean;
};

export async function readApiError(response: Response): Promise<string> {
  return formatApiError(await readApiErrorDetail(response));
}

export async function readApiErrorDetail(response: Response): Promise<ApiErrorDetail> {
  const text = await response.text();
  const structuredMessage = parseStructuredError(text);

  return {
    status: response.status,
    statusText: response.statusText,
    code: structuredMessage?.code,
    message: structuredMessage?.message || summarizeResponseText(text) || "",
    isStructured: Boolean(structuredMessage)
  };
}

export async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(fallbackMessage);
  }
}

function formatApiError(detail: ApiErrorDetail): string {
  const status = formatStatus(detail);
  return detail.message ? `${status} - ${detail.message}` : status;
}

function formatStatus(detail: Pick<ApiErrorDetail, "status" | "statusText">): string {
  return `请求失败：${detail.status}${detail.statusText ? ` ${detail.statusText}` : ""}`;
}

function parseStructuredError(text: string): Pick<ApiErrorDetail, "code" | "message"> | null {
  if (!text.trim()) {
    return null;
  }

  try {
    const body = JSON.parse(text) as {
      error?: {
        code?: unknown;
        message?: unknown;
      };
      code?: unknown;
      message?: unknown;
    };
    const code = pickString(body.error?.code) || pickString(body.code);
    const message = pickString(body.error?.message) || pickString(body.message) || "";

    return code || message ? { ...(code ? { code } : {}), message: message || "" } : null;
  } catch {
    return null;
  }
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
