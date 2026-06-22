import { getAppConfig, requireEnv } from "../config";
import { getGenerationTimeoutMs, type NormalizedGenerationInput } from "../domain/models";
import {
  base64ToGeneratedImage,
  fetchAsset,
  type GeneratedImage,
  type ImageProvider
} from "./types";
import {
  formatNonJsonUpstreamResponse,
  formatUpstreamErrorMessage,
  readUpstreamResponseBody,
  UpstreamProviderError,
  type ProviderUpstreamErrorDetail,
  type UpstreamResponseBody
} from "./upstream";

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
    code?: unknown;
    type?: unknown;
  };
  message?: string;
  detail?: string;
  reason?: string;
  code?: unknown;
  type?: unknown;
};

type OpenAIImageProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
};

type OpenAIRequestDiagnostics = {
  endpoint: "/v1/images/generations" | "/v1/images/edits";
  mode: NormalizedGenerationInput["mode"];
  providerModel: string;
  resolution: NormalizedGenerationInput["resolution"];
  size: NormalizedGenerationInput["size"];
};

export class OpenAIImageProvider implements ImageProvider {
  constructor(private readonly options: OpenAIImageProviderOptions = {}) {}

  async generate(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    if (input.referenceAssets.length > 0 || input.maskAsset) {
      return this.generateEdit(input);
    }

    return this.generateImage(input);
  }

  private async generateImage(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    const config = getAppConfig();
    const apiKey = this.options.apiKey || requireEnv(config.openaiApiKey, "OPENAI_API_KEY");
    const baseUrl = this.options.baseUrl || config.openaiBaseUrl;
    const endpoint = "/v1/images/generations";
    // Intentionally omit response_format: this gateway honors it inconsistently
    // (sometimes b64_json, sometimes a hosted url). parseOpenAIResponse accepts both.
    const body: Record<string, unknown> = {
      model: input.providerModel,
      prompt: buildImagePrompt(input),
      n: input.count,
      size: input.size
    };

    const response = await fetchOpenAI(
      openAIUrl(endpoint, baseUrl),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      },
      getGenerationTimeoutMs(input.resolution)
    );

    return parseOpenAIResponse(response, buildOpenAIRequestDiagnostics(input, endpoint));
  }

  private async generateEdit(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    const form = new FormData();
    form.set("model", input.providerModel);
    form.set("prompt", buildImageEditPrompt(input));
    form.set("n", String(input.count));
    form.set("size", input.size);

    for (const [index, asset] of input.referenceAssets.entries()) {
      const fetched = await fetchAsset(asset.url);
      form.append(
        "image[]",
        new Blob([toArrayBuffer(fetched.buffer)], { type: fetched.mimeType }),
        `reference-${index}.png`
      );
    }

    if (input.maskAsset) {
      const mask = await fetchAsset(input.maskAsset.url);
      form.set("mask", new Blob([toArrayBuffer(mask.buffer)], { type: mask.mimeType }), "mask.png");
    }

    const config = getAppConfig();
    const apiKey = this.options.apiKey || requireEnv(config.openaiApiKey, "OPENAI_API_KEY");
    const baseUrl = this.options.baseUrl || config.openaiBaseUrl;
    const endpoint = "/v1/images/edits";
    const response = await fetchOpenAI(
      openAIUrl(endpoint, baseUrl),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: form
      },
      getGenerationTimeoutMs(input.resolution)
    );

    return parseOpenAIResponse(response, buildOpenAIRequestDiagnostics(input, endpoint));
  }
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const sliced = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  if (sliced instanceof ArrayBuffer) {
    return sliced;
  }

  return new Uint8Array(buffer).buffer;
}

function buildEditPrompt(input: NormalizedGenerationInput): string {
  if (input.mode === "variation") {
    return `Create a visually distinct variation while preserving the core subject. ${input.prompt}`;
  }

  return input.prompt;
}

function buildImagePrompt(input: NormalizedGenerationInput): string {
  if (input.mode === "text-to-image") {
    return buildImageGenerationPrompt(input.prompt);
  }

  return buildImageEditPrompt(input);
}

function buildImageGenerationPrompt(prompt: string): string {
  return buildSectionedImagePrompt({
    systemPrompt:
      "You are in image generation mode. Generate an image according to the user prompt. Do not answer with conversational text, markdown, code, or analysis. If the prompt asks for visible text inside the image, render that text accurately as part of the image.",
    userPrompt: prompt
  });
}

function buildImageEditPrompt(input: NormalizedGenerationInput): string {
  return buildSectionedImagePrompt({
    systemPrompt:
      "You are in image editing mode. Generate an edited image using the provided reference image(s). Do not answer with conversational text, markdown, code, or analysis. Preserve reference identity and composition when the user asks for it.",
    userPrompt: buildEditPrompt(input)
  });
}

function buildSectionedImagePrompt(input: {
  systemPrompt: string;
  userPrompt: string;
}): string {
  return ["System prompt:", input.systemPrompt, "", "User prompt:", input.userPrompt].join("\n");
}

function openAIUrl(path: string, baseUrl = getAppConfig().openaiBaseUrl): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function fetchOpenAI(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error("图像网关超时，请稍后重试或先使用单页生成");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseOpenAIResponse(
  response: Response,
  diagnostics: OpenAIRequestDiagnostics
): Promise<GeneratedImage[]> {
  const body = await readUpstreamResponseBody<OpenAIImageResponse>(response);

  if (response.status >= 400) {
    logOpenAIResponseFailure(response, diagnostics);

    const error = getOpenAIError(body, response.status);
    throw new UpstreamProviderError(error.message, error.upstream);
  }

  if (!body.json) {
    throw new Error(formatNonJsonUpstreamResponse({ body, label: "图像网关", status: response.status }));
  }

  // Some gateways answer with HTTP 200 but carry the failure in the body.
  if (body.json.error || body.json.message || body.json.reason || body.json.detail) {
    if (!body.json.data?.length) {
      const error = getOpenAIError(body, response.status);
      throw new UpstreamProviderError(error.message, error.upstream);
    }
  }

  const images = (
    await Promise.all(
      (body.json.data ?? []).map(async (item) => {
        if (item.b64_json) {
          return base64ToGeneratedImage(item.b64_json);
        }
        // The same gateway may return a hosted URL instead of base64 even when
        // b64_json was requested; fetch it so the image is not silently dropped.
        if (item.url) {
          return fetchAsset(item.url);
        }
        return null;
      })
    )
  ).filter(Boolean) as GeneratedImage[];

  if (!images.length) {
    throw new Error("OpenAI response did not contain generated images");
  }

  return images;
}

function getOpenAIError(
  body: UpstreamResponseBody<OpenAIImageResponse>,
  status: number
): {
  message: string;
  upstream: ProviderUpstreamErrorDetail;
} {
  const timeoutMessage =
    status === 524 || status === 504 || status === 408
      ? "图像网关超时，请稍后重试或先使用单页生成"
      : "";
  const primaryMessage =
    readMessage(body.json?.error?.message) ||
    readMessage(body.json?.message) ||
    readMessage(body.json?.reason) ||
    readMessage(body.json?.detail) ||
    timeoutMessage;

  const message = formatUpstreamErrorMessage({
    body,
    fallbackMessage: timeoutMessage || `OpenAI image request failed: ${status}`,
    primaryMessage,
    status
  });

  return {
    message,
    upstream: buildOpenAIUpstreamDetail({ body, message: primaryMessage || message, status })
  };
}

function readMessage(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildOpenAIUpstreamDetail(input: {
  body: UpstreamResponseBody<OpenAIImageResponse>;
  message: string;
  status: number;
}): ProviderUpstreamErrorDetail {
  const rawResponse = input.body.json ?? input.body.text.trim();
  const oneLineBody = input.body.text.replace(/\s+/g, " ").trim();
  const primaryMessage = input.message || oneLineBody;
  const effectiveStatusCode =
    readEmbeddedStatusCode(primaryMessage) ?? readEmbeddedStatusCode(oneLineBody) ?? input.status;
  const cleanMessage = stripStatusCodePrefix(primaryMessage || oneLineBody);
  const explicitCode = readMessage(input.body.json?.error?.code) || readMessage(input.body.json?.code);
  const inferredCode = explicitCode || inferOpenAIUpstreamCode(cleanMessage, effectiveStatusCode);
  const explicitType = readMessage(input.body.json?.error?.type) || readMessage(input.body.json?.type);

  return {
    statusCode: effectiveStatusCode,
    gatewayStatus: input.status,
    ...(inferredCode ? { code: inferredCode } : {}),
    ...(explicitType ? { type: explicitType } : {}),
    ...(cleanMessage ? { message: cleanMessage } : {}),
    ...(rawResponse ? { rawResponse } : {}),
    contentType: input.body.contentType
  };
}

function inferOpenAIUpstreamCode(message: string, statusCode: number): string | undefined {
  const normalized = message.toLowerCase();
  const embeddedCode = message.match(/图片生成失败\(([a-z0-9_-]+)\)/i)?.[1];

  if (embeddedCode) {
    return embeddedCode;
  }

  if (
    normalized.includes("upstream service temporarily unavailable") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("origin web server returned an invalid or incomplete response") ||
    normalized.includes("origin is overloaded or misconfigured") ||
    normalized.includes("upstream_error")
  ) {
    return "upstream_unavailable";
  }

  if (
    normalized.includes("auth_required") ||
    message.includes("上游返回 403") ||
    message.includes("风控") ||
    message.includes("盾页面")
  ) {
    return "auth_required";
  }

  if (
    message.includes("提示词违规") ||
    normalized.includes("content_policy") ||
    normalized.includes("policy violation")
  ) {
    return "prompt_violation";
  }

  if (message.includes("需要提供参考图") || (message.includes("参考图") && message.includes("需要"))) {
    return "reference_required";
  }

  if (message.includes("提示词没有触发画图模式") || normalized.includes("drawing mode")) {
    return "drawing_mode_not_triggered";
  }

  if (
    message.includes("等待超时") ||
    normalized.includes("context deadline") ||
    normalized.includes("deadline exceeded") ||
    normalized.includes("timeout")
  ) {
    return "upstream_timeout";
  }

  if (statusCode === 404 || normalized.includes("bad response status code 404")) {
    return "upstream_not_found";
  }

  if (statusCode === 400) {
    return "upstream_bad_request";
  }

  return undefined;
}

function readEmbeddedStatusCode(value: string): number | undefined {
  const match = value.match(/\bstatus_code\s*=\s*(\d{3})\b/i);
  if (!match) {
    return undefined;
  }

  return Number(match[1]);
}

function stripStatusCodePrefix(value: string): string {
  return value.replace(/^status_code\s*=\s*\d{3}\s*,?\s*/i, "").trim();
}

function buildOpenAIRequestDiagnostics(
  input: NormalizedGenerationInput,
  endpoint: OpenAIRequestDiagnostics["endpoint"]
): OpenAIRequestDiagnostics {
  return {
    endpoint,
    mode: input.mode,
    providerModel: input.providerModel,
    resolution: input.resolution,
    size: input.size
  };
}

function logOpenAIResponseFailure(
  response: Response,
  diagnostics: OpenAIRequestDiagnostics
): void {
  console.warn("[image-provider/openai] upstream failure", {
    ...diagnostics,
    status: response.status,
    contentType: response.headers.get("content-type") || null,
    requestId: response.headers.get("x-request-id") || null,
    cfRay: response.headers.get("cf-ray") || null
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
