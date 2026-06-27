export type PromptStylePresetKey =
  | "cinematic"
  | "cyberpunk"
  | "minimal-japanese"
  | "watercolor-illustration"
  | "studio-3d-render"
  | "black-and-white-film";

export type PromptStylePreset = {
  key: PromptStylePresetKey;
  label: string;
  guidance: string;
};

export const promptStylePresets = [
  {
    key: "cinematic",
    label: "电影感",
    guidance: "cinematic lighting, soft morning light, mountain lake, minimal composition"
  },
  {
    key: "cyberpunk",
    label: "赛博朋克",
    guidance: "cyberpunk neon street, high-contrast lighting, future city"
  },
  {
    key: "minimal-japanese",
    label: "极简日系",
    guidance: "minimal Japanese composition, soft colors, open negative space, quiet atmosphere"
  },
  {
    key: "watercolor-illustration",
    label: "水彩插画",
    guidance: "watercolor illustration, translucent color, paper texture"
  },
  {
    key: "studio-3d-render",
    label: "3D 渲染",
    guidance: "3D render, refined materials, soft studio lighting"
  },
  {
    key: "black-and-white-film",
    label: "黑白胶片",
    guidance: "black-and-white film, premium grayscale, grain texture, strong composition"
  }
] as const satisfies readonly PromptStylePreset[];

export const negativePromptProviderSupportNote =
  "Negative prompt is captured as preview metadata only; the current generation API accepts one prompt string and does not send a separate negativePrompt field.";

export type PromptEnhancementMetadata = {
  rawPrompt: string;
  finalPrompt: string;
  selectedStyle: PromptStylePreset | null;
  negativePrompt: string;
  providerSupportNotes: string[];
};

export type PromptEnhancementInput = {
  userPrompt: string;
  selectedStyle?: PromptStylePresetKey | null;
  negativePrompt?: string;
};

export function buildPromptEnhancementMetadata(
  input: PromptEnhancementInput
): PromptEnhancementMetadata {
  const rawPrompt = input.userPrompt.trim();
  const selectedStyle = input.selectedStyle
    ? promptStylePresets.find((preset) => preset.key === input.selectedStyle) || null
    : null;
  const negativePrompt = (input.negativePrompt || "").trim();
  const guidanceParts: string[] = selectedStyle ? [selectedStyle.guidance] : [];

  return {
    rawPrompt,
    finalPrompt: [rawPrompt, ...guidanceParts].filter(Boolean).join("\n\n"),
    selectedStyle,
    negativePrompt,
    providerSupportNotes: negativePrompt ? [negativePromptProviderSupportNote] : []
  };
}
