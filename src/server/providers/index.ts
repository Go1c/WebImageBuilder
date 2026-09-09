import type { Provider } from "../domain/models";
import { GeminiImageProvider } from "./gemini";
import { GrokImageProvider } from "./grok";
import { OpenAIImageProvider } from "./openai";
import type { ImageProvider } from "./types";

export function getImageProvider(provider: Provider): ImageProvider {
  if (provider === "openai") {
    return new OpenAIImageProvider();
  }

  if (provider === "grok") {
    return new GrokImageProvider();
  }

  return new GeminiImageProvider();
}
