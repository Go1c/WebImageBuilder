export type AspectRatioLabel = "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
export type ImageResolutionTier = "1K" | "2K" | "4K";

const generationSizes: Record<ImageResolutionTier, Record<AspectRatioLabel, `${number}x${number}`>> = {
  "1K": {
    "1:1": "1024x1024",
    "3:4": "768x1024",
    "4:3": "1024x768",
    "16:9": "1024x576",
    "9:16": "576x1024"
  },
  "2K": {
    "1:1": "2560x2560",
    "3:4": "1920x2560",
    "4:3": "2560x1920",
    "16:9": "2560x1440",
    "9:16": "1440x2560"
  },
  "4K": {
    "1:1": "3840x3840",
    "3:4": "2480x3312",
    "4:3": "3312x2480",
    "16:9": "3840x2160",
    "9:16": "2160x3840"
  }
};

export const imageResolutionOptions: ImageResolutionTier[] = ["1K", "2K", "4K"];

export function getGenerationRequestTimeoutMs(resolution: ImageResolutionTier): number {
  return resolution === "1K" ? 120_000 : 240_000;
}

export function getRecommendedRatioForResolution(
  resolution: ImageResolutionTier
): AspectRatioLabel | null {
  return resolution === "4K" ? "16:9" : null;
}

export function getUnsupportedGenerationSizeReason(input: {
  ratio: AspectRatioLabel;
  resolution: ImageResolutionTier;
}): string | null {
  if (input.resolution === "4K" && input.ratio === "1:1") {
    return "4K 不支持 1:1 尺寸，请改用 16:9（推荐 3840x2160）。";
  }

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
