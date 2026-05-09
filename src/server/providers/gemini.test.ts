import { afterEach, describe, expect, it, vi } from "vitest";
import type { NormalizedGenerationInput } from "../domain/models";
import { GeminiImageProvider } from "./gemini";

describe("Gemini image provider", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("includes the complete upstream JSON error body for failed image responses", async () => {
    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: "test-key"
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          Response.json(
            {
              error: {
                code: 429,
                message: "quota exceeded",
                status: "RESOURCE_EXHAUSTED",
                details: [
                  {
                    "@type": "type.googleapis.com/google.rpc.RetryInfo",
                    retryDelay: "30s"
                  }
                ]
              }
            },
            { status: 429 }
          )
      )
    );

    await expect(new GeminiImageProvider().generate(buildInput())).rejects.toThrow(
      "status_code=429, quota exceeded"
    );
    await expect(new GeminiImageProvider().generate(buildInput())).rejects.toThrow(
      '"status": "RESOURCE_EXHAUSTED"'
    );
    await expect(new GeminiImageProvider().generate(buildInput())).rejects.toThrow(
      '"retryDelay": "30s"'
    );
  });
});

function buildInput(): NormalizedGenerationInput {
  return {
    prompt: "A blue circle icon",
    mode: "text-to-image",
    model: "gemini",
    provider: "gemini",
    providerModel: "gemini-2.5-flash-image",
    size: "1024x1024",
    resolution: "1K",
    quality: "standard",
    count: 1,
    referenceAssets: []
  };
}
