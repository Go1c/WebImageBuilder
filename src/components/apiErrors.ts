const maxErrorBodyLength = 500;

export type ApiErrorUpstreamDetail = {
  statusCode?: number;
  gatewayStatus?: number;
  code?: string;
  type?: string;
  message?: string;
  rawResponse?: unknown;
  contentType?: string;
};

export type ApiErrorDetail = {
  status: number;
  statusText: string;
  code?: string;
  message: string;
  isStructured: boolean;
  upstream?: ApiErrorUpstreamDetail;
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
    isStructured: Boolean(structuredMessage),
    ...(structuredMessage?.upstream ? { upstream: structuredMessage.upstream } : {})
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

function parseStructuredError(text: string): Pick<ApiErrorDetail, "code" | "message" | "upstream"> | null {
  if (!text.trim()) {
    return null;
  }

  try {
    const body = JSON.parse(text) as {
      error?: {
        code?: unknown;
        message?: unknown;
        upstream?: unknown;
      };
      code?: unknown;
      message?: unknown;
      upstream?: unknown;
    };
    const code = pickString(body.error?.code) || pickString(body.code);
    const message = pickString(body.error?.message) || pickString(body.message) || "";
    const upstream = parseUpstreamDetail(body.error?.upstream ?? body.upstream);

    return code || message || upstream
      ? {
          ...(code ? { code } : {}),
          message: message || "",
          ...(upstream ? { upstream } : {})
        }
      : null;
  } catch {
    return null;
  }
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseUpstreamDetail(value: unknown): ApiErrorUpstreamDetail | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const upstream: ApiErrorUpstreamDetail = {};
  const statusCode = pickNumber(value.statusCode);
  const gatewayStatus = pickNumber(value.gatewayStatus);
  const code = pickString(value.code);
  const type = pickString(value.type);
  const message = pickString(value.message);
  const contentType = pickString(value.contentType);

  if (statusCode) {
    upstream.statusCode = statusCode;
  }

  if (gatewayStatus) {
    upstream.gatewayStatus = gatewayStatus;
  }

  if (code) {
    upstream.code = code;
  }

  if (type) {
    upstream.type = type;
  }

  if (message) {
    upstream.message = message;
  }

  if ("rawResponse" in value) {
    upstream.rawResponse = value.rawResponse;
  }

  if (contentType) {
    upstream.contentType = contentType;
  }

  return Object.keys(upstream).length ? upstream : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
