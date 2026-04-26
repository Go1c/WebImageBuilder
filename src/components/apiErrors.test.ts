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
