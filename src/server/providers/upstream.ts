export type UpstreamResponseBody<T> = {
  contentType: string;
  json: T | null;
  text: string;
};

export type ProviderUpstreamErrorDetail = {
  statusCode?: number;
  gatewayStatus?: number;
  code?: string;
  type?: string;
  message?: string;
  rawResponse?: unknown;
  contentType?: string;
};

export class UpstreamProviderError extends Error {
  readonly upstream: ProviderUpstreamErrorDetail;

  constructor(message: string, upstream: ProviderUpstreamErrorDetail) {
    super(message);
    this.name = "UpstreamProviderError";
    this.upstream = upstream;
  }
}

export async function readUpstreamResponseBody<T>(response: Response): Promise<UpstreamResponseBody<T>> {
  const text = await response.text();

  try {
    return {
      contentType: response.headers.get("content-type") || "unknown content type",
      json: text.trim() ? (JSON.parse(text) as T) : null,
      text
    };
  } catch {
    return {
      contentType: response.headers.get("content-type") || "unknown content type",
      json: null,
      text
    };
  }
}

export function formatUpstreamErrorMessage<T>(input: {
  body: UpstreamResponseBody<T>;
  fallbackMessage: string;
  primaryMessage?: string;
  status: number;
}): string {
  const rawDetail = input.body.json
    ? JSON.stringify(input.body.json, null, 2)
    : input.body.text.trim();
  const rawOneLine = input.body.text.replace(/\s+/g, " ").trim();
  const primary = normalizeMessage(input.primaryMessage) || rawOneLine || input.fallbackMessage;
  const header = primary.startsWith("status_code=")
    ? primary
    : `status_code=${input.status}, ${primary}`;

  if (!rawDetail || rawDetail === primary || rawDetail === rawOneLine) {
    return header;
  }

  return `${header}\nupstream_response:\n${rawDetail}`;
}

export function formatNonJsonUpstreamResponse(input: {
  body: UpstreamResponseBody<unknown>;
  label: string;
  status: number;
}): string {
  return formatUpstreamErrorMessage({
    body: input.body,
    fallbackMessage: `${input.label}返回了非 JSON 响应（${input.status}, ${input.body.contentType}）`,
    primaryMessage: `${input.label}返回了非 JSON 响应（${input.status}, ${input.body.contentType}）`,
    status: input.status
  });
}

function normalizeMessage(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
