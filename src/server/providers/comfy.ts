/**
 * P3 stub: ComfyUI workflow bridge
 *
 * NOT WIRED to a provider yet — when the ComfyUI runner is deployed,
 * this module will:
 *   1. Convert NormalizedGenerationInput → Comfy workflow JSON
 *   2. POST to ${COMFYUI_URL}/prompt
 *   3. Poll /history/{prompt_id} for completion
 *   4. Pull the resulting image bytes
 *
 * Activate by setting COMFYUI_URL and registering this as a provider in
 * src/server/providers/index.ts (a third entry alongside openai/gemini).
 */
import type { NormalizedGenerationInput } from "../domain/models";

export type ComfyWorkflow = Record<string, unknown>;

export function buildComfyWorkflow(input: NormalizedGenerationInput): ComfyWorkflow {
  // Minimal SDXL text-to-image graph skeleton — not validated against a
  // real Comfy install. Treat as a starting point.
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed: input.seed ?? 0,
        steps: input.steps ?? 30,
        cfg: input.cfg ?? 7,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1
      }
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: input.prompt }
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { text: input.negativePrompt ?? "" }
    }
  };
}

export async function runComfyWorkflow(_workflow: ComfyWorkflow): Promise<{ buffer: Buffer; mimeType: string }[]> {
  throw new Error("ComfyUI bridge not implemented — set COMFYUI_URL and finish src/server/providers/comfy.ts");
}
