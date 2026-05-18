import { describe, expect, it } from "vitest";
import { ApiError, jsonError } from "./http";

describe("HTTP error responses", () => {
  it("returns structured upstream error diagnostics with provider errors", async () => {
    const response = jsonError(
      new ApiError(400, "provider_error", "status_code=400, 提示词违规 请检查提示词", {
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
      })
    );

    await expect(response.json()).resolves.toEqual({
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
    });
  });
});
