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
  if (url.startsWith("data:")) {
    return parseDataUrlAsset(url);
  }

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

function parseDataUrlAsset(url: string): {
  buffer: Buffer;
  mimeType: string;
} {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url);
  if (!match) {
    throw new Error("Failed to parse asset data URL");
  }

  const mimeType = match[1] || "image/png";
  const isBase64 = Boolean(match[2]);
  const data = match[3] || "";

  return {
    buffer: isBase64 ? Buffer.from(data, "base64") : Buffer.from(decodeURIComponent(data)),
    mimeType
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
