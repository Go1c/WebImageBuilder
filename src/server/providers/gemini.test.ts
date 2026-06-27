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

  it("runs one Gemini request per requested image with distinct variation prompts", async () => {
    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: "site-key"
    };

    let responseIndex = 0;
    const fetchMock = vi.fn(async () => {
      responseIndex += 1;
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: Buffer.from(`image ${responseIndex}`).toString("base64")
                  }
                }
              ]
            }
          }
        ]
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const images = await new GeminiImageProvider().generate({
      ...buildInput(),
      count: 4
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const prompts = fetchMock.mock.calls.map((call) => {
      const body = JSON.parse(String(call[1]?.body)) as {
        contents: Array<{ parts: Array<{ text?: string }> }>;
      };
      return body.contents[0].parts[0].text || "";
    });
    expect(prompts[0]).toContain("Variation 1");
    expect(prompts[1]).toContain("Variation 2");
    expect(prompts[2]).toContain("Variation 3");
    expect(prompts[3]).toContain("Variation 4");
    expect(images).toHaveLength(4);
    expect(images.map((image) => image.buffer.toString())).toEqual([
      "image 1",
      "image 2",
      "image 3",
      "image 4"
    ]);
  });

  it("uses a supplied Gemini API key when provided", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: Buffer.from("image").toString("base64")
                  }
                }
              ]
            }
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await new GeminiImageProvider({ apiKey: "user-gemini-key" }).generate(buildInput());

    expect(String(fetchMock.mock.calls[0][0])).toContain("key=user-gemini-key");
  });
});

function buildInput(): NormalizedGenerationInput {
  return {
    prompt: "A blue circle icon",
    mode: "text-to-image",
    model: "gemini-3.1-flash-image-preview",
    provider: "gemini",
    providerModel: "gemini-2.5-flash-image",
    size: "1024x1024",
    resolution: "1K",
    quality: "standard",
    count: 1,
    referenceAssets: []
  };
}
