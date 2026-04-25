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

export class OpenAIImageProvider implements ImageProvider {
  async generate(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    if (input.mode === "text-to-image") {
      return this.generateTextToImage(input);
    }

    return this.generateEdit(input);
  }

  private async generateTextToImage(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv(getAppConfig().openaiApiKey, "OPENAI_API_KEY")}`,
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

    return parseOpenAIResponse(await response.json(), response.status);
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

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv(getAppConfig().openaiApiKey, "OPENAI_API_KEY")}`
      },
      body: form
    });

    return parseOpenAIResponse(await response.json(), response.status);
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

function parseOpenAIResponse(body: OpenAIImageResponse, status: number): GeneratedImage[] {
  if (status >= 400) {
    throw new Error(body.error?.message || `OpenAI image request failed: ${status}`);
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
