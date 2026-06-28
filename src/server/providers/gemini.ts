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

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
        inline_data?: {
          mime_type?: string;
          data?: string;
        };
      }>;
    };
  }>;
  error?: {
    code?: unknown;
    message?: string;
    status?: unknown;
    type?: unknown;
  };
  message?: string;
  code?: unknown;
  status?: unknown;
  type?: unknown;
};

type GeminiImageProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
};

export class GeminiImageProvider implements ImageProvider {
  constructor(private readonly options: GeminiImageProviderOptions = {}) {}

  async generate(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    const requests = Array.from({ length: input.count }, (_, index) => index);
    const results = await runWithConcurrency(requests, 2, async (index) => {
      const prompt = buildPrompt(input, input.count > 1 ? index : undefined);
      return this.generateSingle(input, prompt);
    });

    return results.flat().slice(0, input.count);
  }

  private async generateSingle(input: NormalizedGenerationInput, prompt: string): Promise<GeneratedImage[]> {
    const parts: unknown[] = [{ text: prompt }];

    for (const asset of input.referenceAssets) {
      const fetched = await fetchAsset(asset.url);
      parts.push({
        inline_data: {
          mime_type: fetched.mimeType,
          data: fetched.buffer.toString("base64")
        }
      });
    }

    if (input.maskAsset) {
      const mask = await fetchAsset(input.maskAsset.url);
      parts.push({
        text: "Use the following mask to constrain the edited area."
      });
      parts.push({
        inline_data: {
          mime_type: mask.mimeType,
          data: mask.buffer.toString("base64")
        }
      });
    }

    const apiKey = this.options.apiKey || requireEnv(getAppConfig().geminiApiKey, "GEMINI_API_KEY");
    const gatewayBaseUrl = this.options.baseUrl;
    const url = gatewayBaseUrl
      ? `${gatewayBaseUrl.replace(/\/+$/, "")}/v1beta/models/${input.providerModel}:streamGenerateContent?alt=sse`
      : `https://generativelanguage.googleapis.com/v1beta/models/${input.providerModel}:streamGenerateContent?alt=sse`;

    const response = await fetchGeminiWithRetry(
      url,
      {
        method: "POST",
        headers: {
          ...(gatewayBaseUrl
            ? { Authorization: `Bearer ${apiKey}` }
            : { "x-goog-api-key": apiKey }),
          Accept: "text/event-stream, application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts
            }
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              aspectRatio: getGeminiAspectRatio(input.size)
            }
          }
        })
      },
      getGenerationTimeoutMs(input.resolution)
    );

    return parseGeminiResponseBody(response);
  }
}

const transientGeminiRetryDelayMs = process.env.NODE_ENV === "test" ? 0 : 1_200;
const transientGeminiMaxRetries = 1;

async function fetchGeminiWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  for (let attempt = 0; attempt <= transientGeminiMaxRetries; attempt += 1) {
    try {
      const response = await fetchGemini(url, init, timeoutMs);
      if (!isRetryableGeminiStatus(response.status)) {
        return response;
      }

      const body = await readUpstreamResponseBody<GeminiResponse>(response);
      const error = getGeminiError(body, response.status);
      if (attempt >= transientGeminiMaxRetries) {
        throw new UpstreamProviderError(error.message, error.upstream);
      }

      await sleep(transientGeminiRetryDelayMs);
    } catch (error) {
      if (
        attempt < transientGeminiMaxRetries &&
        !(error instanceof Error && error.name === "AbortError") &&
        !(error instanceof UpstreamProviderError)
      ) {
        await sleep(transientGeminiRetryDelayMs);
        continue;
      }

      throw error;
    }
  }

  throw new Error("Gemini image request failed");
}

async function fetchGemini(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("图像网关超时，请稍后重试或降低图片数量");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isRetryableGeminiStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt(input: NormalizedGenerationInput, variationIndex?: number): string {
  const variationPrompt =
    typeof variationIndex === "number"
      ? `\n\nVariation ${variationIndex + 1}: choose a distinct composition, lighting, color palette, camera angle, or detail treatment while preserving the user's core intent.`
      : "";

  if (input.mode === "variation") {
    return `Generate one visual variation based on the reference image. ${input.prompt}${variationPrompt}`;
  }

  if (input.mode === "inpaint") {
    return `Edit only the masked area and keep the rest consistent. ${input.prompt}${variationPrompt}`;
  }

  return `${input.prompt}${variationPrompt}`;
}

async function parseGeminiResponseBody(response: Response): Promise<GeneratedImage[]> {
  const contentType = response.headers.get("content-type") || "";
  if (response.status >= 400 || !contentType.includes("text/event-stream")) {
    return parseGeminiResponse(
      await readUpstreamResponseBody<GeminiResponse>(response),
      response.status
    );
  }

  return parseGeminiStream(await response.text());
}

function parseGeminiResponse(
  body: UpstreamResponseBody<GeminiResponse>,
  status: number
): GeneratedImage[] {
  if (status >= 400) {
    const error = getGeminiError(body, status);
    throw new UpstreamProviderError(error.message, error.upstream);
  }

  if (!body.json) {
    throw new Error(formatNonJsonUpstreamResponse({ body, label: "Gemini 图像网关", status }));
  }

  const images: GeneratedImage[] = [];
  for (const candidate of body.json.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      const inline = part.inlineData
        ? {
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType
          }
        : {
            data: part.inline_data?.data,
            mimeType: part.inline_data?.mime_type
          };
      const mimeType = inline.mimeType || "image/png";
      if (inline?.data && mimeType.startsWith("image/")) {
        images.push(base64ToGeneratedImage(inline.data, mimeType));
      }
    }
  }

  if (!images.length) {
    throw new Error("Gemini response did not contain generated images");
  }

  return images;
}

function parseGeminiStream(text: string): GeneratedImage[] {
  const images: GeneratedImage[] = [];

  for (const event of parseServerSentEvents(text)) {
    const trimmed = event.trim();
    if (!trimmed || trimmed === "[DONE]") {
      continue;
    }

    let body: GeminiResponse;
    try {
      body = JSON.parse(trimmed) as GeminiResponse;
    } catch (error) {
      throw new Error(
        `Gemini 图像网关返回了无法解析的流式响应: ${
          error instanceof Error ? error.message : "invalid SSE JSON"
        }`
      );
    }

    if (body.error?.message) {
      const responseBody: UpstreamResponseBody<GeminiResponse> = {
        contentType: "text/event-stream",
        json: body,
        text: trimmed
      };
      const error = getGeminiError(responseBody, 200);
      throw new UpstreamProviderError(error.message, error.upstream);
    }

    images.push(...extractGeminiImages(body));
  }

  if (!images.length) {
    throw new Error("Gemini response did not contain generated images");
  }

  return images;
}

function getGeminiError(
  body: UpstreamResponseBody<GeminiResponse>,
  status: number
): {
  message: string;
  upstream: ProviderUpstreamErrorDetail;
} {
  const primaryMessage =
    readMessage(body.json?.error?.message) ||
    readMessage(body.json?.message) ||
    (status === 504 ? "Gemini 图像网关超时，请稍后重试或降低图片数量" : "");
  const message = formatUpstreamErrorMessage({
    body,
    fallbackMessage: `Gemini image request failed: ${status}`,
    primaryMessage,
    status
  });

  return {
    message,
    upstream: buildGeminiUpstreamDetail({ body, message: primaryMessage || message, status })
  };
}

function buildGeminiUpstreamDetail(input: {
  body: UpstreamResponseBody<GeminiResponse>;
  message: string;
  status: number;
}): ProviderUpstreamErrorDetail {
  const rawResponse = input.body.json ?? input.body.text.trim();
  const oneLineBody = input.body.text.replace(/\s+/g, " ").trim();
  const primaryMessage = input.message || oneLineBody;
  const effectiveStatusCode =
    readEmbeddedStatusCode(primaryMessage) ?? readEmbeddedStatusCode(oneLineBody) ?? input.status;
  const cleanMessage = stripStatusCodePrefix(primaryMessage || oneLineBody);
  const explicitCode =
    readMessage(input.body.json?.error?.code) || readMessage(input.body.json?.code);
  const explicitType =
    readMessage(input.body.json?.error?.type) ||
    readMessage(input.body.json?.error?.status) ||
    readMessage(input.body.json?.type) ||
    readMessage(input.body.json?.status);
  const inferredCode =
    explicitCode || inferGeminiUpstreamCode(cleanMessage || oneLineBody, effectiveStatusCode);

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

function inferGeminiUpstreamCode(message: string, statusCode: number): string | undefined {
  const normalized = message.toLowerCase();
  const embeddedCode = message.match(/图片生成失败\(([a-z0-9_-]+)\)/i)?.[1];

  if (embeddedCode) {
    return embeddedCode;
  }

  if (
    normalized.includes("upstream service temporarily unavailable") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("upstream_error") ||
    normalized.includes("overloaded") ||
    normalized.includes("unavailable")
  ) {
    return "upstream_unavailable";
  }

  if (
    normalized.includes("api key not valid") ||
    normalized.includes("invalid api key") ||
    normalized.includes("permission_denied") ||
    normalized.includes("unauthenticated")
  ) {
    return "auth_required";
  }

  if (
    message.includes("提示词违规") ||
    normalized.includes("content_policy") ||
    normalized.includes("policy violation") ||
    normalized.includes("safety")
  ) {
    return "prompt_violation";
  }

  if (
    message.includes("等待超时") ||
    normalized.includes("context deadline") ||
    normalized.includes("deadline exceeded") ||
    normalized.includes("timeout")
  ) {
    return "upstream_timeout";
  }

  if (statusCode === 404 || normalized.includes("not found")) {
    return "upstream_not_found";
  }

  if (statusCode === 400) {
    return "upstream_bad_request";
  }

  return undefined;
}

function readMessage(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readEmbeddedStatusCode(message: string): number | undefined {
  const match = message.match(/\bstatus_code\s*=\s*(\d{3})\b/i);
  return match ? Number(match[1]) : undefined;
}

function stripStatusCodePrefix(message: string): string {
  return message.replace(/^status_code\s*=\s*\d{3}\s*,\s*/i, "").trim();
}

function parseServerSentEvents(text: string): string[] {
  return text
    .split(/\r?\n\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
    )
    .filter(Boolean);
}

function extractGeminiImages(body: GeminiResponse): GeneratedImage[] {
  const images: GeneratedImage[] = [];
  for (const candidate of body.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      const inline = part.inlineData
        ? {
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType
          }
        : {
            data: part.inline_data?.data,
            mimeType: part.inline_data?.mime_type
          };
      const mimeType = inline.mimeType || "image/png";
      if (inline?.data && mimeType.startsWith("image/")) {
        images.push(base64ToGeneratedImage(inline.data, mimeType));
      }
    }
  }

  return images;
}

function getGeminiAspectRatio(size: NormalizedGenerationInput["size"]): string {
  const [width, height] = size.split("x").map(Number);
  const divisor = greatestCommonDivisor(width, height);
  const ratio = `${width / divisor}:${height / divisor}`;

  if (["1:1", "3:4", "4:3", "16:9", "9:16"].includes(ratio)) {
    return ratio;
  }

  return "1:1";
}

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y > 0) {
    const next = x % y;
    x = y;
    y = next;
  }

  return x || 1;
}

async function runWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    const index = nextIndex;
    nextIndex += 1;

    if (index >= items.length) {
      return;
    }

    results[index] = await worker(items[index]);
    await runNext();
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runNext())
  );

  return results;
}
