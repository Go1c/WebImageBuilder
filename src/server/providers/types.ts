import type { NormalizedGenerationInput } from "../domain/models";

export type GeneratedImage = {
  buffer: Buffer;
  mimeType: string;
};

export type ImageProvider = {
  generate(input: NormalizedGenerationInput): Promise<GeneratedImage[]>;
};

export type ProviderFetchAsset = (url: string) => Promise<{
  buffer: Buffer;
  mimeType: string;
}>;

export async function fetchAsset(url: string): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: response.headers.get("content-type") || "image/png"
  };
}

export function base64ToGeneratedImage(
  b64: string,
  mimeType = "image/png"
): GeneratedImage {
  return {
    buffer: Buffer.from(b64, "base64"),
    mimeType
  };
}
