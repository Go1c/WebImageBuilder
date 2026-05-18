import { describe, expect, it, vi, beforeEach } from "vitest";
import { createTask, getQuotaState, markTaskFailed } from "../db/repositories";
import { ApiError } from "../http";
import { getImageProvider } from "../providers";
import { UpstreamProviderError } from "../providers/upstream";
import { generateImagesForActor } from "./service";

vi.mock("../db/repositories", () => ({
  createTask: vi.fn(),
  getQuotaState: vi.fn(),
  markTaskFailed: vi.fn(),
  markTaskSucceeded: vi.fn(),
  settleInviteReward: vi.fn()
}));

vi.mock("../providers", () => ({
  getImageProvider: vi.fn()
}));

describe("generation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports exhausted anonymous device trials as quota exhaustion, not request frequency", async () => {
    vi.mocked(getQuotaState).mockResolvedValueOnce({
      actorType: "anonymous",
      anonymousUsed: 3,
      loginUsed: 0,
      inviteCredits: 0,
      paidCredits: 0,
      ipDailyUsed: 0
    });

    await expect(
      generateImagesForActor({
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
      })
    ).rejects.toMatchObject<Partial<ApiError>>({
      status: 402,
      code: "quota_exhausted"
    });
  });

  it("reports GPT Image 2 sizes outside official constraints as client errors", async () => {
    await expect(
      generateImagesForActor({
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
          size: "3840x3840",
          resolution: "4K",
          quality: "standard",
          count: 1,
          referenceAssets: []
        }
      })
    ).rejects.toMatchObject<Partial<ApiError>>({
      status: 400,
      code: "bad_request",
      message: expect.stringContaining("8,294,400")
    });

    expect(getQuotaState).not.toHaveBeenCalled();
  });

  it("preserves upstream provider diagnostics when generation fails", async () => {
    vi.mocked(getQuotaState).mockResolvedValueOnce({
      actorType: "anonymous",
      anonymousUsed: 0,
      loginUsed: 0,
      inviteCredits: 0,
      paidCredits: 0,
      ipDailyUsed: 0
    });
    vi.mocked(createTask).mockResolvedValueOnce("task-1");
    vi.mocked(getImageProvider).mockReturnValueOnce({
      generate: vi.fn(async () => {
        throw new UpstreamProviderError("status_code=400, 提示词违规 请检查提示词", {
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
        });
      })
    });

    await expect(
      generateImagesForActor({
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
      })
    ).rejects.toMatchObject<Partial<ApiError>>({
      status: 400,
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
    });
    expect(markTaskFailed).toHaveBeenCalledWith("task-1", "status_code=400, 提示词违规 请检查提示词");
  });
});
