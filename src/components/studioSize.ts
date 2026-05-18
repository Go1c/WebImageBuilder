export type AspectRatioLabel = "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
export type ImageResolutionTier = "1K" | "2K" | "4K";

const generationSizes: Record<ImageResolutionTier, Record<AspectRatioLabel, `${number}x${number}`>> = {
  "1K": {
    "1:1": "1024x1024",
    "3:4": "768x1024",
    "4:3": "1024x768",
    "16:9": "1280x720",
    "9:16": "720x1280"
  },
  "2K": {
    "1:1": "2048x2048",
    "3:4": "1536x2048",
    "4:3": "2048x1536",
    "16:9": "2048x1152",
    "9:16": "1152x2048"
  },
  "4K": {
    "1:1": "2880x2880",
    "3:4": "2448x3264",
    "4:3": "3264x2448",
    "16:9": "3840x2160",
    "9:16": "2160x3840"
  }
};

export const imageResolutionOptions: ImageResolutionTier[] = ["1K", "2K", "4K"];

export function getGenerationRequestTimeoutMs(resolution: ImageResolutionTier): number {
  return resolution === "1K" ? 250_000 : 240_000;
}

export function getRecommendedRatioForResolution(
  resolution: ImageResolutionTier
): AspectRatioLabel | null {
  return null;
}

export function getUnsupportedGenerationSizeReason(input: {
  ratio: AspectRatioLabel;
  resolution: ImageResolutionTier;
}): string | null {
  return null;
}

export function buildGenerationSize(input: {
  ratio: AspectRatioLabel;
  resolution: ImageResolutionTier;
}): { size: `${number}x${number}`; meta: string } {
  const size = generationSizes[input.resolution][input.ratio];
  const [width, height] = size.split("x").map(Number);

  return {
    size,
    meta: `${width} × ${height}`
  };
}
