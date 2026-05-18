import { describe, expect, it } from "vitest";
import { readApiError, readApiErrorDetail } from "./apiErrors";

describe("API error parsing", () => {
  it("preserves structured JSON error codes and messages", async () => {
    const response = Response.json(
      {
        error: {
          code: "quota_exhausted",
          message: "No available generation quota"
        }
      },
      { status: 402, statusText: "Payment Required" }
    );

    await expect(readApiErrorDetail(response)).resolves.toMatchObject({
      code: "quota_exhausted",
      isStructured: true,
      message: "No available generation quota",
      status: 402,
      statusText: "Payment Required"
    });
  });

  it("keeps readApiError compatible for existing string callers", async () => {
    const response = Response.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many requests"
        }
      },
      { status: 429 }
    );

    await expect(readApiError(response)).resolves.toBe(
      "请求失败：429 - Too many requests"
    );
  });

  it("uses structured JSON error messages", async () => {
    const response = Response.json(
      {
        error: {
          message: "Missing required environment variable: OPENAI_API_KEY"
        }
      },
      { status: 502 }
    );

    await expect(readApiError(response)).resolves.toBe(
      "请求失败：502 - Missing required environment variable: OPENAI_API_KEY"
    );
  });

  it("preserves complete structured provider error messages", async () => {
    const providerMessage = `OpenAI image request failed: 502
Upstream response:
{
  "error": {
    "message": "model overloaded",
    "code": "overloaded"
  },
  "request_id": "req_full_error",
  "debug": "${"upstream detail ".repeat(80)}complete-tail"
}`;
    const response = Response.json(
      {
        error: {
          code: "provider_error",
          message: providerMessage
        }
      },
      { status: 502 }
    );

    const detail = await readApiErrorDetail(response);

    expect(detail.message).toContain('"request_id": "req_full_error"');
    expect(detail.message).toContain("complete-tail");
    expect(detail.message.endsWith("...")).toBe(false);
  });

  it("preserves structured upstream provider diagnostics", async () => {
    const response = Response.json(
      {
        error: {
          code: "provider_error",
          message: "status_code=400, 提示词违规 请检查提示词",
          upstream: {
            statusCode: 400,
            gatewayStatus: 502,
            code: "content_policy_violation",
            type: "content_policy",
            message: "提示词违规 请检查提示词",
            rawResponse: {
              error: {
                message: "提示词违规 请检查提示词",
                code: "content_policy_violation",
                type: "content_policy"
              }
            }
          }
        }
      },
      { status: 400 }
    );

    await expect(readApiErrorDetail(response)).resolves.toMatchObject({
      code: "provider_error",
      isStructured: true,
      message: "status_code=400, 提示词违规 请检查提示词",
      status: 400,
      upstream: {
        statusCode: 400,
        gatewayStatus: 502,
        code: "content_policy_violation",
        type: "content_policy",
        message: "提示词违规 请检查提示词",
        rawResponse: {
          error: {
            message: "提示词违规 请检查提示词",
            code: "content_policy_violation",
            type: "content_policy"
          }
        }
      }
    });
  });

  it("includes plain text gateway error bodies", async () => {
    const response = new Response("Bad Gateway: upstream closed before response", {
      status: 502,
      statusText: "Bad Gateway",
      headers: {
        "content-type": "text/plain"
      }
    });

    await expect(readApiError(response)).resolves.toBe(
      "请求失败：502 Bad Gateway - Bad Gateway: upstream closed before response"
    );
  });

  it("strips HTML gateway responses into readable text", async () => {
    const response = new Response(
      "<html><body><h1>502 Bad Gateway</h1><p>upstream timed out</p></body></html>",
      {
        status: 502,
        statusText: "Bad Gateway",
        headers: {
          "content-type": "text/html"
        }
      }
    );

    await expect(readApiError(response)).resolves.toBe(
      "请求失败：502 Bad Gateway - 502 Bad Gateway upstream timed out"
    );
  });

  it("sanitizes and truncates HTML error bodies", async () => {
    const longHtml = `<html><head><style>body { color: red; }</style><script>alert("token")</script></head><body><h1>502 Bad Gateway</h1><p>${"upstream unavailable ".repeat(60)}</p></body></html>`;
    const response = new Response(longHtml, {
      status: 502,
      statusText: "Bad Gateway",
      headers: {
        "content-type": "text/html"
      }
    });

    const message = await readApiError(response);

    expect(message).toContain("请求失败：502 Bad Gateway - 502 Bad Gateway upstream unavailable");
    expect(message).not.toContain("<html");
    expect(message).not.toContain("alert");
    expect(message.length).toBeLessThan(570);
    expect(message.endsWith("...")).toBe(true);
  });
});
