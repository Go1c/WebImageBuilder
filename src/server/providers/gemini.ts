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
    message?: string;
  };
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
      ? `${gatewayBaseUrl.replace(/\/+$/, "")}/v1beta/models/${input.providerModel}:generateContent`
      : `https://generativelanguage.googleapis.com/v1beta/models/${input.providerModel}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`;

    const response = await fetchGemini(
      url,
      {
        method: "POST",
        headers: {
          ...(gatewayBaseUrl ? { Authorization: `Bearer ${apiKey}` } : {}),
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
            responseModalities: ["TEXT", "IMAGE"]
          }
        })
      },
      getGenerationTimeoutMs(input.resolution)
    );

    return parseGeminiResponse(await readUpstreamResponseBody<GeminiResponse>(response), response.status);
  }
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

function parseGeminiResponse(body: UpstreamResponseBody<GeminiResponse>, status: number): GeneratedImage[] {
  if (status >= 400) {
    throw new Error(
      formatUpstreamErrorMessage({
        body,
        fallbackMessage: `Gemini image request failed: ${status}`,
        primaryMessage: body.json?.error?.message,
        status
      })
    );
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
