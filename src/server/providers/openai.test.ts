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

  it("keeps drawing instructions separate from the user prompt", async () => {
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
      prompt: "画一张发光的蓝色圆形图标"
    });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      prompt: string;
    };
    expect(requestBody.prompt).toContain("System prompt:");
    expect(requestBody.prompt).toContain("User prompt:");
    expect(requestBody.prompt).toContain("You are in image generation mode");
    expect(requestBody.prompt).toMatch(/User prompt:\n画一张发光的蓝色圆形图标$/);
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

  it("sends reference asset URLs through the generations endpoint", async () => {
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
      mode: "image-to-image",
      prompt: "keep this pose and render cinematic lighting",
      referenceAssets: [
        {
          key: "uploads/reference.png",
          url: "https://cdn.example.com/reference.png",
          mimeType: "image/png"
        }
      ]
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lumio.games/v1/images/generations",
      expect.objectContaining({ method: "POST" })
    );

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      prompt: string;
      reference_images?: string[];
    };
    expect(requestBody.prompt).toContain("keep this pose");
    expect(requestBody.reference_images).toEqual(["https://cdn.example.com/reference.png"]);
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

  it("includes the complete upstream JSON error body for failed image responses", async () => {
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
              error: {
                message: "model overloaded",
                type: "server_error",
                code: "overloaded",
                param: null
              },
              request_id: "req_full_error",
              upstream: {
                provider: "openai",
                retry_after_seconds: 30
              }
            },
            { status: 502 }
          )
      )
    );

    await expect(new OpenAIImageProvider().generate(buildInput())).rejects.toThrow(
      "status_code=502, model overloaded"
    );
    await expect(new OpenAIImageProvider().generate(buildInput())).rejects.toThrow(
      '"request_id": "req_full_error"'
    );
    await expect(new OpenAIImageProvider().generate(buildInput())).rejects.toThrow(
      '"retry_after_seconds": 30'
    );
  });

  it("throws structured upstream diagnostics for failed image responses", async () => {
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
              error: {
                message: "status_code=400, 提示词违规 请检查提示词",
                code: "content_policy_violation",
                type: "content_policy"
              }
            },
            { status: 502 }
          )
      )
    );

    await expect(new OpenAIImageProvider().generate(buildInput())).rejects.toMatchObject({
      upstream: {
        statusCode: 400,
        gatewayStatus: 502,
        code: "content_policy_violation",
        type: "content_policy",
        message: "提示词违规 请检查提示词",
        rawResponse: {
          error: {
            message: "status_code=400, 提示词违规 请检查提示词",
            code: "content_policy_violation",
            type: "content_policy"
          }
        }
      }
    });
  });

  it.each([
    ["status_code=502, 提示词违规", 502, "prompt_violation", "提示词违规"],
    [
      "status_code=502, 图片生成失败(auth_required):上游返回 403 风控/盾页面,已切换账号重试",
      502,
      "auth_required",
      "图片生成失败(auth_required):上游返回 403 风控/盾页面,已切换账号重试"
    ],
    ["status_code=502, 需要提供参考图", 502, "reference_required", "需要提供参考图"],
    ["status_code=404, bad response status code 404", 404, "upstream_not_found", "bad response status code 404"],
    ["status_code=400, err", 400, "upstream_bad_request", "err"],
    ["status_code=502, 提示词没有触发画图模式", 502, "drawing_mode_not_triggered", "提示词没有触发画图模式"],
    [
      "status_code=502, 上游生图等待超时,已尝试切换账号/代理:context deadline exceeded",
      502,
      "upstream_timeout",
      "上游生图等待超时,已尝试切换账号/代理:context deadline exceeded"
    ]
  ])("infers upstream error code from gateway message %s", async (rawMessage, statusCode, code, message) => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              message: rawMessage
            }
          },
          { status: 502 }
        )
      )
    );

    await expect(new OpenAIImageProvider().generate(buildInput())).rejects.toMatchObject({
      upstream: {
        statusCode,
        gatewayStatus: 502,
        code,
        message,
        rawResponse: {
          error: {
            message: rawMessage
          }
        }
      }
    });
  });

  it("includes the complete upstream text body for non-JSON image errors", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            "status_code=502, 图片生成失败(auth_required):上游返回 403 风控/盾页面,已切换账号重试",
            {
              status: 502,
              headers: { "content-type": "text/plain; charset=utf-8" }
            }
          )
      )
    );

    await expect(new OpenAIImageProvider().generate(buildInput())).rejects.toThrow(
      "status_code=502, 图片生成失败(auth_required):上游返回 403 风控/盾页面,已切换账号重试"
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
