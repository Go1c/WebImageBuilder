export type AspectRatioLabel = "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
export type ImageResolutionTier = "1K" | "2K" | "4K";

const ratioValues: Record<AspectRatioLabel, { width: number; height: number }> = {
  "1:1": { width: 1, height: 1 },
  "3:4": { width: 3, height: 4 },
  "4:3": { width: 4, height: 3 },
  "16:9": { width: 16, height: 9 },
  "9:16": { width: 9, height: 16 }
};

const resolutionLongEdges: Record<ImageResolutionTier, number> = {
  "1K": 1024,
  "2K": 2560,
  "4K": 3840
};

export const imageResolutionOptions: ImageResolutionTier[] = ["1K", "2K", "4K"];

export function buildGenerationSize(input: {
  ratio: AspectRatioLabel;
  resolution: ImageResolutionTier;
}): { size: `${number}x${number}`; meta: string } {
  const ratio = ratioValues[input.ratio];
  const longEdge = resolutionLongEdges[input.resolution];
  const scale = longEdge / Math.max(ratio.width, ratio.height);
  const width = Math.round(ratio.width * scale);
  const height = Math.round(ratio.height * scale);

  return {
    size: `${width}x${height}`,
    meta: `${width} × ${height}`
  };
}
