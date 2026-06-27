export type AspectRatioLabel = "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
export type ImageResolutionTier = "1K" | "2K" | "4K";
export type CustomGenerationSizeInput = {
  width: string | number;
  height: string | number;
};
export type CustomGenerationSizeUnsupportedCode =
  | "invalid_number"
  | "dimension_step"
  | "max_edge"
  | "max_aspect_ratio"
  | "min_pixels"
  | "max_pixels";
export type CustomGenerationSizeValidation =
  | {
      supported: true;
      width: number;
      height: number;
      size: `${number}x${number}`;
    }
  | {
      supported: false;
      code: CustomGenerationSizeUnsupportedCode;
      width: number | null;
      height: number | null;
      sizeLabel: string;
      reason: string;
    };

const gptImage2MinPixels = 655_360;
const gptImage2MaxPixels = 8_294_400;
const gptImage2MaxEdge = 3840;
const gptImage2MaxAspectRatio = 3;
const gptImage2DimensionStep = 16;

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

export function getGenerationRequestTimeoutMs(
  resolution: ImageResolutionTier,
  count = 1
): number {
  const baseTimeoutMs = resolution === "1K" ? 250_000 : 240_000;
  const requestWaves = Math.ceil(Math.max(1, Math.floor(count)) / 2);
  return baseTimeoutMs * requestWaves;
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

export function buildCustomGenerationSize(input: {
  width: number;
  height: number;
}): { size: `${number}x${number}`; meta: string } {
  return {
    size: `${input.width}x${input.height}`,
    meta: `${input.width} × ${input.height}`
  };
}

export function validateCustomGenerationSize(
  input: CustomGenerationSizeInput
): CustomGenerationSizeValidation {
  const width = parseCustomDimension(input.width);
  const height = parseCustomDimension(input.height);
  const sizeLabel = formatCustomSizeLabel(width, height);

  if (!width || !height) {
    return buildUnsupportedCustomSize({
      code: "invalid_number",
      width,
      height,
      sizeLabel,
      reason: "请输入正整数宽度和高度。"
    });
  }

  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  const totalPixels = width * height;

  if (width % gptImage2DimensionStep !== 0 || height % gptImage2DimensionStep !== 0) {
    return buildUnsupportedCustomSize({
      code: "dimension_step",
      width,
      height,
      sizeLabel,
      reason: `宽高都必须是 ${gptImage2DimensionStep}px 的倍数。`
    });
  }

  if (longEdge > gptImage2MaxEdge) {
    return buildUnsupportedCustomSize({
      code: "max_edge",
      width,
      height,
      sizeLabel,
      reason: `最大边不能超过 ${gptImage2MaxEdge}px。`
    });
  }

  if (longEdge / shortEdge > gptImage2MaxAspectRatio) {
    return buildUnsupportedCustomSize({
      code: "max_aspect_ratio",
      width,
      height,
      sizeLabel,
      reason: `长短边比例不能超过 ${gptImage2MaxAspectRatio}:1。`
    });
  }

  if (totalPixels < gptImage2MinPixels) {
    return buildUnsupportedCustomSize({
      code: "min_pixels",
      width,
      height,
      sizeLabel,
      reason: `当前总像素 ${formatLimit(totalPixels)}，低于最小支持值。`
    });
  }

  if (totalPixels > gptImage2MaxPixels) {
    return buildUnsupportedCustomSize({
      code: "max_pixels",
      width,
      height,
      sizeLabel,
      reason: `当前总像素 ${formatLimit(totalPixels)}，超过最大支持值。`
    });
  }

  return {
    supported: true,
    width,
    height,
    size: `${width}x${height}`
  };
}

export function getCustomSizeUnsupportedMessage(
  validation: CustomGenerationSizeValidation
): string {
  if (validation.supported) {
    return "";
  }

  return [
    `Image2 不支持 ${validation.sizeLabel} 分辨率。`,
    validation.reason,
    `最小支持 ${formatLimit(gptImage2MinPixels)} 总像素（例如 640 × 1024），最大支持 ${formatLimit(gptImage2MaxPixels)} 总像素（例如 3840 × 2160）；宽高需为 ${gptImage2DimensionStep}px 的倍数，最大边不超过 ${gptImage2MaxEdge}px，长短边比例不超过 ${gptImage2MaxAspectRatio}:1。`
  ].join("");
}

export function getEffectiveResolutionTier(size: `${number}x${number}`): ImageResolutionTier {
  const [width, height] = size.split("x").map(Number);
  const longEdge = Math.max(width, height);

  if (longEdge <= 1280) {
    return "1K";
  }

  if (longEdge <= 2048) {
    return "2K";
  }

  return "4K";
}

function parseCustomDimension(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return null;
  }

  return Number(trimmed);
}

function buildUnsupportedCustomSize(input: {
  code: CustomGenerationSizeUnsupportedCode;
  width: number | null;
  height: number | null;
  sizeLabel: string;
  reason: string;
}): CustomGenerationSizeValidation {
  return {
    supported: false,
    code: input.code,
    width: input.width,
    height: input.height,
    sizeLabel: input.sizeLabel,
    reason: input.reason
  };
}

function formatCustomSizeLabel(width: number | null, height: number | null): string {
  if (!width || !height) {
    return "当前输入";
  }

  return `${width} × ${height}`;
}

function formatLimit(value: number): string {
  return value.toLocaleString("en-US");
}
