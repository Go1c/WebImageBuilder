import type { Provider } from "../domain/models";
import { GeminiImageProvider } from "./gemini";
import { OpenAIImageProvider } from "./openai";
import type { ImageProvider } from "./types";

export function getImageProvider(provider: Provider): ImageProvider {
  if (provider === "openai") {
    return new OpenAIImageProvider();
  }

  return new GeminiImageProvider();
}
