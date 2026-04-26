export type PromptTypeKey =
  | "UI"
  | "UE"
  | "立绘"
  | "3D"
  | "二次元"
  | "写实"
  | "特效"
  | "场景原画";

export type PromptTypeChoice = {
  key: PromptTypeKey;
  label: string;
  guidance: string;
};

export const promptTypeChoices = [
  {
    key: "UI",
    label: "UI",
    guidance: "interface design, hierarchy, clear components, modern product visuals"
  },
  {
    key: "UE",
    label: "UE",
    guidance: "game experience, interaction flow, feedback, playability expression"
  },
  {
    key: "立绘",
    label: "立绘",
    guidance: "character pose, costume, silhouette, full/half body design"
  },
  {
    key: "3D",
    label: "3D",
    guidance: "volume, PBR materials, render lighting, studio presentation"
  },
  {
    key: "二次元",
    label: "二次元",
    guidance: "anime/illustration style, linework, cel/anime rendering"
  },
  {
    key: "写实",
    label: "写实",
    guidance: "realistic photography, lens language, natural light, material detail"
  },
  {
    key: "特效",
    label: "特效",
    guidance: "particles, magic/skill effects, energy flow, impact"
  },
  {
    key: "场景原画",
    label: "场景原画",
    guidance: "environmental concept art, spatial depth, atmosphere, narrative"
  }
] as const satisfies readonly PromptTypeChoice[];

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
  selectedTypes: PromptTypeKey[];
  selectedTypeEnhancers: PromptTypeChoice[];
  selectedStyle: PromptStylePreset | null;
  negativePrompt: string;
  providerSupportNotes: string[];
};

export type PromptEnhancementInput = {
  userPrompt: string;
  selectedTypes: readonly PromptTypeKey[];
  selectedStyle?: PromptStylePresetKey | null;
  negativePrompt?: string;
};

export function buildPromptEnhancementMetadata(
  input: PromptEnhancementInput
): PromptEnhancementMetadata {
  const rawPrompt = input.userPrompt.trim();
  const selectedTypeSet = new Set(input.selectedTypes);
  const selectedTypeEnhancers = promptTypeChoices.filter((choice) => selectedTypeSet.has(choice.key));
  const selectedStyle = input.selectedStyle
    ? promptStylePresets.find((preset) => preset.key === input.selectedStyle) || null
    : null;
  const negativePrompt = (input.negativePrompt || "").trim();
  const guidanceParts: string[] = [
    ...selectedTypeEnhancers.map((choice) => choice.guidance),
    ...(selectedStyle ? [selectedStyle.guidance] : [])
  ];

  return {
    rawPrompt,
    finalPrompt: [rawPrompt, ...guidanceParts].filter(Boolean).join("\n\n"),
    selectedTypes: selectedTypeEnhancers.map((choice) => choice.key),
    selectedTypeEnhancers,
    selectedStyle,
    negativePrompt,
    providerSupportNotes: negativePrompt ? [negativePromptProviderSupportNote] : []
  };
}
