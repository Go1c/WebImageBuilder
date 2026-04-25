import type { GenerationMode, ModelKey } from "@/server/domain/models";

export type GenerationRequestPreviewInput = {
  prompt: string;
  model: ModelKey;
  mode: GenerationMode;
  size: string;
  quality: string;
  count: number;
  referenceCount: number;
  hasMask: boolean;
};

export function buildGenerationRequestPreview(input: GenerationRequestPreviewInput): string {
  return JSON.stringify(
    {
      prompt: input.prompt.trim(),
      model: input.model,
      mode: input.mode,
      size: input.size,
      quality: input.quality,
      count: input.count,
      referenceCount: input.referenceCount,
      hasMask: input.hasMask
    },
    null,
    2
  );
}
