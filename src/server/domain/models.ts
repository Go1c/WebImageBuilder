import { z } from "zod";

export type Provider = "openai" | "gemini";
export type ModelKey = "gpt-image-2" | "gemini-image";
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
    label: "GPT Image 2",
    provider: "openai",
    providerModel: getOpenAIProviderModel("1K"),
    description: "适合高质量文生图、参考图和编辑。1K 请求使用 gpt-image-2，2K/4K 请求使用 gpt-image-2pro。"
  },
  "gemini-image": {
    key: "gemini-image",
    label: "Gemini",
    provider: "gemini",
    providerModel: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
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
  model: z.enum(["gpt-image-2", "gemini-image"]),
  size: generationSizeSchema.default("1024x1024"),
  resolution: z.enum(["1K", "2K", "4K"]).default("1K"),
  quality: z.enum(["standard", "high"]).default("standard"),
  count: z.number().int().min(1).max(16).default(1),
  referenceAssets: z.array(assetSchema).default([]),
  maskAsset: assetSchema.optional(),
  sessionId: z.string().uuid().optional()
});

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

  return {
    ...parsed,
    prompt: parsed.prompt.trim(),
    size,
    provider: model.provider,
    providerModel: getProviderModelForResolution(model, parsed.resolution),
    count: Math.min(parsed.count, 4)
  };
}

function getProviderModelForResolution(
  model: ModelOption,
  resolution: ImageResolutionTier
): string {
  if (model.key === "gpt-image-2") {
    return getOpenAIProviderModel(resolution);
  }

  return model.providerModel;
}

function getOpenAIProviderModel(resolution: ImageResolutionTier): string {
  if (resolution === "1K") {
    return process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  }

  return process.env.OPENAI_IMAGE_PRO_MODEL || "gpt-image-2pro";
}
