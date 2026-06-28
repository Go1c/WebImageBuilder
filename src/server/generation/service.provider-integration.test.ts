import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTask, getQuotaState, markTaskFailed } from "../db/repositories";
import { jsonError, type ApiError } from "../http";
import { generateImagesForActor } from "./service";

vi.mock("../db/repositories", () => ({
  createTask: vi.fn(),
  getOwnedAsset: vi.fn(),
  getQuotaState: vi.fn(),
  markTaskFailed: vi.fn(),
  markTaskSucceeded: vi.fn(),
  settleInviteReward: vi.fn()
}));

describe("generation service provider integration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games",
      LUMIO_LOCAL_MODE: "true"
    };
    vi.mocked(getQuotaState).mockResolvedValue({
      actorType: "anonymous",
      anonymousUsed: 0,
      loginUsed: 0,
      inviteCredits: 0,
      paidCredits: 0,
      ipDailyUsed: 0
    });
    vi.mocked(createTask).mockResolvedValue("task-provider-path");
  });

  it("passes wrapped prompt violations through the real OpenAI provider path as public 400 errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              message: "status_code=502, 提示词违规",
              type: "upstream_error"
            }
          },
          { status: 502 }
        )
      )
    );

    const error = await catchGenerationError();

    expect(error).toMatchObject<Partial<ApiError>>({
      status: 400,
      code: "provider_error",
      upstream: {
        statusCode: 502,
        gatewayStatus: 502,
        code: "prompt_violation",
        message: "提示词违规"
      }
    });
    expect(markTaskFailed).toHaveBeenCalledWith(
      "task-provider-path",
      expect.stringContaining("status_code=502, 提示词违规")
    );
  });

  it("keeps true upstream outages as public 502 errors but returns structured upstream diagnostics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              message: "Upstream service temporarily unavailable",
              type: "upstream_error"
            }
          },
          { status: 502 }
        )
      )
    );

    const error = await catchGenerationError();
    const response = jsonError(error);

    expect(error).toMatchObject<Partial<ApiError>>({
      status: 502,
      code: "provider_error",
      upstream: {
        statusCode: 502,
        gatewayStatus: 502,
        code: "upstream_unavailable",
        type: "upstream_error",
        message: "Upstream service temporarily unavailable"
      }
    });
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "provider_error",
        message: expect.stringContaining("Upstream service temporarily unavailable"),
        upstream: {
          statusCode: 502,
          gatewayStatus: 502,
          code: "upstream_unavailable",
          type: "upstream_error",
          message: "Upstream service temporarily unavailable"
        }
      }
    });
  });
});

async function catchGenerationError(): Promise<ApiError> {
  try {
    await generateImagesForActor({
      actor: {
        type: "anonymous",
        anonymousDeviceId: "anon-1",
        deviceId: "device-1",
        ipHash: "ip-1"
      },
      rawInput: {
        prompt: "simple test image",
        mode: "text-to-image",
        model: "gpt-image-2",
        size: "1024x1024",
        resolution: "1K",
        quality: "standard",
        count: 1,
        referenceAssets: []
      }
    });
  } catch (error) {
    return error as ApiError;
  }

  throw new Error("Expected generation to fail");
}
