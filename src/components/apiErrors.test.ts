import { describe, expect, it } from "vitest";
import { readApiError } from "./apiErrors";

describe("API error parsing", () => {
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
});
