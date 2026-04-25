import { getAppConfig, requireEnv } from "../config";
import type { NormalizedGenerationInput } from "../domain/models";
import {
  base64ToGeneratedImage,
  fetchAsset,
  type GeneratedImage,
  type ImageProvider
} from "./types";

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

const defaultImageRequestTimeoutMs = 48_000;

export class OpenAIImageProvider implements ImageProvider {
  async generate(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    if (input.mode === "text-to-image") {
      return this.generateTextToImage(input);
    }

    return this.generateEdit(input);
  }

  private async generateTextToImage(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    const config = getAppConfig();
    const response = await fetchOpenAI(openAIUrl("/v1/images/generations", config.openaiBaseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv(config.openaiApiKey, "OPENAI_API_KEY")}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: input.providerModel,
        prompt: input.prompt,
        n: input.count,
        size: input.size,
        quality: input.quality,
        response_format: "b64_json"
      })
    });

    return parseOpenAIResponse(response);
  }

  private async generateEdit(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    const form = new FormData();
    form.set("model", input.providerModel);
    form.set("prompt", buildEditPrompt(input));
    form.set("n", String(input.count));
    form.set("size", input.size);
    form.set("response_format", "b64_json");

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
    const response = await fetchOpenAI(openAIUrl("/v1/images/edits", config.openaiBaseUrl), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${requireEnv(config.openaiApiKey, "OPENAI_API_KEY")}`
      },
      body: form
    });

    return parseOpenAIResponse(response);
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

function openAIUrl(path: string, baseUrl = getAppConfig().openaiBaseUrl): string {
  return `${baseUrl}${path}`;
}

async function fetchOpenAI(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getImageRequestTimeoutMs());

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

function getImageRequestTimeoutMs(): number {
  const raw = process.env.IMAGE_PROVIDER_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : defaultImageRequestTimeoutMs;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultImageRequestTimeoutMs;
}

async function parseOpenAIResponse(response: Response): Promise<GeneratedImage[]> {
  const body = await readOpenAIJson(response);

  if (response.status >= 400) {
    if (response.status === 524 || response.status === 504 || response.status === 408) {
      throw new Error("图像网关超时，请稍后重试或先使用单页生成");
    }

    throw new Error(body.error?.message || `OpenAI image request failed: ${response.status}`);
  }

  const images = body.data
    ?.map((item) => {
      if (item.b64_json) {
        return base64ToGeneratedImage(item.b64_json);
      }
      return null;
    })
    .filter(Boolean) as GeneratedImage[] | undefined;

  if (!images?.length) {
    throw new Error("OpenAI response did not contain generated images");
  }

  return images;
}

async function readOpenAIJson(response: Response): Promise<OpenAIImageResponse> {
  const text = await response.text();

  try {
    return JSON.parse(text) as OpenAIImageResponse;
  } catch {
    const contentType = response.headers.get("content-type") || "unknown content type";
    throw new Error(`图像网关返回了非 JSON 响应（${response.status}, ${contentType}），请稍后重试`);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
