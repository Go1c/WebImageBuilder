import { afterEach, describe, expect, it, vi } from "vitest";
import type { NormalizedGenerationInput } from "../domain/models";
import { getImageProvider } from "./index";
import { GrokImageProvider } from "./grok";

describe("Grok image provider", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("prefers GROK_API_KEY for site-funded Grok requests", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "openai-key",
      GROK_API_KEY: "grok-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("grok image").toString("base64") }]
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await new GrokImageProvider().generate(buildInput());

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lumio.games/v1/images/generations",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer grok-key"
        })
      })
    );
  });

  it("routes grok through the dedicated JSON images adapter", () => {
    expect(getImageProvider("grok")).toBeInstanceOf(GrokImageProvider);
  });

  it("sends generations as JSON with b64_json and a 1K/2K billing size", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              b64_json: Buffer.from("grok image").toString("base64"),
              mime_type: "image/jpeg"
            }
          ]
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const images = await new GrokImageProvider().generate(buildInput());

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lumio.games/v1/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json"
        })
      })
    );

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<
      string,
      unknown
    >;
    expect(requestBody).toMatchObject({
      model: "grok-imagine-image-quality",
      prompt: "A blue circle icon",
      n: 1,
      response_format: "b64_json",
      size: "1K"
    });
    expect(requestBody.size).not.toBe("1024x1024");
    expect(images).toEqual([
      {
        buffer: Buffer.from("grok image"),
        mimeType: "image/jpeg"
      }
    ]);
  });

  it("sends 2K billing size for 2K and 4K Grok requests", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("grok image").toString("base64") }]
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await new GrokImageProvider().generate({
      ...buildInput(),
      resolution: "4K",
      size: "3840x2160"
    });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<
      string,
      unknown
    >;
    expect(requestBody.size).toBe("2K");
  });

  it("edits with JSON image url objects instead of multipart form data", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("edited").toString("base64") }]
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const referenceDataUrl = "data:image/png;base64,cmVmZXJlbmNl";
    await new GrokImageProvider().generate({
      ...buildInput(),
      mode: "image-to-image",
      prompt: "make it darker",
      referenceAssets: [
        {
          key: "local/reference.png",
          url: referenceDataUrl,
          mimeType: "image/png"
        }
      ]
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lumio.games/v1/images/edits",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json"
        })
      })
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "https://api.lumio.games/v1/images/generations",
      expect.anything()
    );

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<
      string,
      unknown
    >;
    expect(requestBody).toMatchObject({
      model: "grok-imagine-image-quality",
      prompt: "make it darker",
      response_format: "b64_json",
      image: { url: referenceDataUrl }
    });
    expect(fetchMock.mock.calls[0][1]?.body).not.toBeInstanceOf(FormData);
  });

  it("inlines remote reference images as data URLs before calling edits", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "https://cdn.example.com/reference.png") {
        return new Response(Buffer.from("remote-bytes"), {
          status: 200,
          headers: { "content-type": "image/png" }
        });
      }

      return new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("edited").toString("base64") }]
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await new GrokImageProvider().generate({
      ...buildInput(),
      mode: "image-to-image",
      prompt: "keep the subject",
      referenceAssets: [
        {
          key: "uploads/reference.png",
          url: "https://cdn.example.com/reference.png",
          mimeType: "image/png"
        }
      ]
    });

    const editRequest = fetchMock.mock.calls.find(
      ([url]) => String(url) === "https://api.lumio.games/v1/images/edits"
    );
    const requestBody = JSON.parse(String(editRequest?.[1]?.body)) as {
      image?: { url?: string };
    };
    expect(requestBody.image?.url).toBe(
      `data:image/png;base64,${Buffer.from("remote-bytes").toString("base64")}`
    );
  });
});

function buildInput(): NormalizedGenerationInput {
  return {
    prompt: "A blue circle icon",
    mode: "text-to-image",
    model: "grok-imagine-image-quality",
    provider: "grok",
    providerModel: "grok-imagine-image-quality",
    size: "1024x1024",
    resolution: "1K",
    quality: "standard",
    count: 1,
    referenceAssets: []
  };
}
