import type { GenerationMode, ModelKey } from "@/server/domain/models";
import {
  negativePromptProviderSupportNote,
  type PromptStylePreset,
  type PromptTypeKey
} from "./promptEnhancers";

export type GenerationRequestPreviewInput = {
  prompt: string;
  rawPrompt?: string;
  finalPrompt?: string;
  selectedTypes?: readonly PromptTypeKey[];
  selectedStyle?: Pick<PromptStylePreset, "key" | "label"> | null;
  negativePrompt?: string;
  providerSupportNotes?: readonly string[];
  model: ModelKey;
  mode: GenerationMode;
  size: string;
  quality: string;
  count: number;
  referenceCount: number;
  hasMask: boolean;
};

export function buildGenerationRequestPreview(input: GenerationRequestPreviewInput): string {
  const rawPrompt = (input.rawPrompt ?? input.prompt).trim();
  const finalPrompt = (input.finalPrompt ?? input.prompt).trim();
  const negativePrompt = (input.negativePrompt || "").trim();
  const providerSupportNotes = uniqueNotes([
    ...(input.providerSupportNotes || []),
    ...(negativePrompt ? [negativePromptProviderSupportNote] : [])
  ]);

  return JSON.stringify(
    {
      prompt: {
        raw: rawPrompt,
        final: finalPrompt,
        selectedTypes: [...(input.selectedTypes || [])],
        selectedStyle: input.selectedStyle
          ? {
              key: input.selectedStyle.key,
              label: input.selectedStyle.label
            }
          : null,
        negative: negativePrompt,
        providerSupportNotes
      },
      request: {
        model: input.model,
        mode: input.mode,
        size: input.size,
        quality: input.quality,
        count: input.count,
        referenceCount: input.referenceCount,
        hasMask: input.hasMask
      }
    },
    null,
    2
  );
}

function uniqueNotes(notes: readonly string[]): string[] {
  return [...new Set(notes.map((note) => note.trim()).filter(Boolean))];
}
