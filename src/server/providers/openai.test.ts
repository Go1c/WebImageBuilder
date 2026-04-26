import { afterEach, describe, expect, it, vi } from "vitest";
import type { NormalizedGenerationInput } from "../domain/models";
import { OpenAIImageProvider } from "./openai";

describe("OpenAI image provider", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("uses the configured OpenAI-compatible base URL for generations", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("fake image").toString("base64") }]
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await new OpenAIImageProvider().generate(buildInput());

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lumio.games/v1/images/generations",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends an explicit image-generation instruction to trigger drawing mode", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("fake image").toString("base64") }]
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await new OpenAIImageProvider().generate({
      ...buildInput(),
      prompt: "blue circle icon"
    });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      prompt: string;
    };
    expect(requestBody.prompt).toContain("Generate an image");
    expect(requestBody.prompt).toContain("blue circle icon");
    expect(requestBody.prompt).not.toBe("blue circle icon");
  });

  it("can route a request through a supplied Sub2API gateway key", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "site-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("fake image").toString("base64") }]
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await new OpenAIImageProvider({
      apiKey: "user-sub2api-key",
      baseUrl: "https://api.lumio.games/"
    }).generate(buildInput());

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lumio.games/v1/images/generations",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer user-sub2api-key"
        })
      })
    );
  });

  it("reports non-JSON image gateway responses clearly", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<!DOCTYPE html><html></html>", {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" }
          })
      )
    );

    await expect(new OpenAIImageProvider().generate(buildInput())).rejects.toThrow(
      "图像网关返回了非 JSON 响应"
    );
  });

  it("reports gateway timeout responses clearly", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 524 }))
    );

    await expect(new OpenAIImageProvider().generate(buildInput())).rejects.toThrow(
      "图像网关超时"
    );
  });

  it("uses gateway envelope messages for failed image responses", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          Response.json(
            {
              message: "Upstream service temporarily unavailable"
            },
            { status: 502 }
          )
      )
    );

    await expect(new OpenAIImageProvider().generate(buildInput())).rejects.toThrow(
      "Upstream service temporarily unavailable"
    );
  });

  it("logs sanitized upstream failure diagnostics", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          Response.json(
            {
              message: "origin failed"
            },
            {
              status: 502,
              headers: {
                "cf-ray": "test-ray",
                "content-type": "application/json",
                "x-request-id": "upstream-request-id"
              }
            }
          )
      )
    );

    await expect(
      new OpenAIImageProvider().generate({
        ...buildInput(),
        prompt: "do not log this prompt"
      })
    ).rejects.toThrow("origin failed");

    expect(warnSpy).toHaveBeenCalledWith(
      "[image-provider/openai] upstream failure",
      expect.objectContaining({
        cfRay: "test-ray",
        contentType: "application/json",
        endpoint: "/v1/images/generations",
        mode: "text-to-image",
        providerModel: "gpt-image-2",
        requestId: "upstream-request-id",
        resolution: "1K",
        size: "1024x1024",
        status: 502
      })
    );
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain("do not log this prompt");
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain("test-key");
  });
});

function buildInput(): NormalizedGenerationInput {
  return {
    prompt: "A blue circle icon",
    mode: "text-to-image",
    model: "gpt-image-2",
    provider: "openai",
    providerModel: "gpt-image-2",
    size: "1024x1024",
    resolution: "1K",
    quality: "standard",
    count: 1,
    referenceAssets: []
  };
}
