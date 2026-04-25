import { getAppConfig, requireEnv } from "../config";
import type { NormalizedGenerationInput } from "../domain/models";
import {
  base64ToGeneratedImage,
  fetchAsset,
  type GeneratedImage,
  type ImageProvider
} from "./types";

const defaultImageRequestTimeoutMs = 48_000;

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

export class GeminiImageProvider implements ImageProvider {
  async generate(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    const parts: unknown[] = [{ text: buildPrompt(input) }];

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${input.providerModel}:generateContent?key=${encodeURIComponent(
      requireEnv(getAppConfig().geminiApiKey, "GEMINI_API_KEY")
    )}`;

    const response = await fetchGemini(url, {
      method: "POST",
      headers: {
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
    });

    return parseGeminiResponse((await response.json()) as GeminiResponse, response.status);
  }
}

async function fetchGemini(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getImageRequestTimeoutMs());

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

function getImageRequestTimeoutMs(): number {
  const raw = process.env.IMAGE_PROVIDER_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : defaultImageRequestTimeoutMs;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultImageRequestTimeoutMs;
}

function buildPrompt(input: NormalizedGenerationInput): string {
  if (input.mode === "variation") {
    return `Generate ${input.count} visual variation(s) based on the reference image. ${input.prompt}`;
  }

  if (input.mode === "inpaint") {
    return `Edit only the masked area and keep the rest consistent. ${input.prompt}`;
  }

  return input.prompt;
}

function parseGeminiResponse(body: GeminiResponse, status: number): GeneratedImage[] {
  if (status >= 400) {
    throw new Error(body.error?.message || `Gemini image request failed: ${status}`);
  }

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

  if (!images.length) {
    throw new Error("Gemini response did not contain generated images");
  }

  return images;
}
