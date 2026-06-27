import { z } from "zod";

export type Provider = "openai" | "gemini";
export type ModelKey =
  | "gpt-image-2"
  | "gpt-image-2-2k"
  | "gpt-image-2-4k"
  | "gemini-3.1-flash-image-preview";
export type GenerationMode = "text-to-image" | "image-to-image" | "inpaint" | "variation";
export type ReleasePhase = "v1" | "v1.1";
export type ImageResolutionTier = "1K" | "2K" | "4K";

export type ModelOption = {
  key: ModelKey;
  label: string;
  provider: Provider;
  providerModel: string;
  description: string;
};

export type GenerationModeCapability = {
  mode: GenerationMode;
  label: string;
  release: ReleasePhase;
  requiresReferenceImage: boolean;
  requiresMask: boolean;
};

export type AssetReference = {
  key: string;
  url: string;
  mimeType?: string;
};

export type NormalizedGenerationInput = {
  prompt: string;
  mode: GenerationMode;
  model: ModelKey;
  provider: Provider;
  providerModel: string;
  size: `${number}x${number}`;
  resolution: ImageResolutionTier;
  quality: "standard" | "high";
  count: number;
  referenceAssets: AssetReference[];
  maskAsset?: AssetReference;
  sessionId?: string;
};

const modelOptions: Record<ModelKey, ModelOption> = {
  "gpt-image-2": {
    key: "gpt-image-2",
    label: "gpt-image-2",
    provider: "openai",
    providerModel: "gpt-image-2",
    description: "适合 1K 高质量文生图、参考图和编辑。"
  },
  "gpt-image-2-2k": {
    key: "gpt-image-2-2k",
    label: "gpt-image-2-2k",
    provider: "openai",
    providerModel: "gpt-image-2-2k",
    description: "适合 2K 高质量文生图、参考图和编辑。"
  },
  "gpt-image-2-4k": {
    key: "gpt-image-2-4k",
    label: "gpt-image-2-4k",
    provider: "openai",
    providerModel: "gpt-image-2-4k",
    description: "适合 4K 高质量文生图、参考图和编辑。"
  },
  "gemini-3.1-flash-image-preview": {
    key: "gemini-3.1-flash-image-preview",
    label: "gemini-3.1-flash-image-preview",
    provider: "gemini",
    providerModel: "gemini-3.1-flash-image-preview",
    description: "适合快速创意探索和多模态参考图编辑。"
  }
};

const modeCapabilities: Record<GenerationMode, GenerationModeCapability> = {
  "text-to-image": {
    mode: "text-to-image",
    label: "文生图",
    release: "v1",
    requiresReferenceImage: false,
    requiresMask: false
  },
  "image-to-image": {
    mode: "image-to-image",
    label: "参考图",
    release: "v1",
    requiresReferenceImage: true,
    requiresMask: false
  },
  inpaint: {
    mode: "inpaint",
    label: "局部重绘",
    release: "v1.1",
    requiresReferenceImage: true,
    requiresMask: true
  },
  variation: {
    mode: "variation",
    label: "变体",
    release: "v1.1",
    requiresReferenceImage: true,
    requiresMask: false
  }
};

const assetSchema = z.object({
  key: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string().optional()
});

const generationSizeSchema = z
  .string()
  .regex(/^[1-9]\d{1,4}x[1-9]\d{1,4}$/);

const generationInputSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  mode: z.enum(["text-to-image", "image-to-image", "inpaint", "variation"]),
  model: z.enum([
    "gpt-image-2",
    "gpt-image-2-2k",
    "gpt-image-2-4k",
    "gemini-3.1-flash-image-preview"
  ]),
  size: generationSizeSchema.default("1024x1024"),
  resolution: z.enum(["1K", "2K", "4K"]).default("1K"),
  quality: z.enum(["standard", "high"]).default("standard"),
  count: z.number().int().min(1).max(4).default(1),
  referenceAssets: z.array(assetSchema).default([]),
  maskAsset: assetSchema.optional(),
  sessionId: z.string().uuid().optional()
});

const gptImage2MinPixels = 655_360;
const gptImage2MaxPixels = 8_294_400;
const gptImage2MaxEdge = 3840;
const gptImage2MaxAspectRatio = 3;

export const modelKeys = Object.keys(modelOptions) as ModelKey[];
export const generationModes = Object.keys(modeCapabilities) as GenerationMode[];

export function getModelOption(key: ModelKey): ModelOption {
  return modelOptions[key];
}

export function listModelOptions(): ModelOption[] {
  return modelKeys.map((key) => getModelOption(key));
}

export function getGenerationModeCapabilities(mode: GenerationMode): GenerationModeCapability {
  return modeCapabilities[mode];
}

export function listGenerationModeCapabilities(): GenerationModeCapability[] {
  return generationModes.map((mode) => getGenerationModeCapabilities(mode));
}

export function getGenerationTimeoutMs(resolution: ImageResolutionTier): number {
  return resolution === "1K" ? 250_000 : 240_000;
}

export function normalizeGenerationInput(input: unknown): NormalizedGenerationInput {
  const parsed = generationInputSchema.parse(input);
  const capability = getGenerationModeCapabilities(parsed.mode);

  if (capability.requiresReferenceImage && parsed.referenceAssets.length === 0) {
    throw new Error(`${capability.label} requires at least one reference image`);
  }

  if (capability.requiresMask && !parsed.maskAsset) {
    throw new Error(`${capability.label} requires a mask image`);
  }

  const model = getModelOption(parsed.model);
  const size = parsed.size as NormalizedGenerationInput["size"];
  if (model.provider === "openai") {
    assertGptImage2SupportsSize(size);
  }

  return {
    ...parsed,
    prompt: parsed.prompt.trim(),
    size,
    provider: model.provider,
    providerModel: getProviderModelForResolution(model, parsed.resolution),
    count: parsed.count
  };
}

function getProviderModelForResolution(
  model: ModelOption,
  _resolution: ImageResolutionTier
): string {
  return model.providerModel;
}

function assertGptImage2SupportsSize(size: NormalizedGenerationInput["size"]): void {
  const [width, height] = size.split("x").map(Number);
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  const totalPixels = width * height;

  if (width % 16 !== 0 || height % 16 !== 0) {
    throw new Error("GPT Image 2 尺寸不支持，请确保宽高都为 16px 的倍数。");
  }

  if (longEdge > gptImage2MaxEdge) {
    throw new Error(`GPT Image 2 尺寸不支持，最大边不能超过 ${gptImage2MaxEdge}px。`);
  }

  if (size === "3840x2880") {
    throw new Error("GPT Image 2 尺寸不支持，3840x2880 超过官方总像素上限，请改用 3264x2448。");
  }

  if (size === "2880x3840") {
    throw new Error("GPT Image 2 尺寸不支持，2880x3840 超过官方总像素上限，请改用 2448x3264。");
  }

  if (longEdge / shortEdge > gptImage2MaxAspectRatio) {
    throw new Error(`GPT Image 2 尺寸不支持，长边与短边比例不能超过 ${gptImage2MaxAspectRatio}:1。`);
  }

  if (totalPixels < gptImage2MinPixels) {
    throw new Error(`GPT Image 2 尺寸不支持，总像素不能低于 ${gptImage2MinPixels.toLocaleString("en-US")}。`);
  }

  if (totalPixels > gptImage2MaxPixels) {
    throw new Error(`GPT Image 2 尺寸不支持，总像素不能超过 ${gptImage2MaxPixels.toLocaleString("en-US")}。`);
  }
}
