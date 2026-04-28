import { describe, expect, it, vi, beforeEach } from "vitest";
import { getQuotaState } from "../db/repositories";
import { ApiError } from "../http";
import { generateImagesForActor } from "./service";

vi.mock("../db/repositories", () => ({
  createTask: vi.fn(),
  getQuotaState: vi.fn(),
  markTaskFailed: vi.fn(),
  markTaskSucceeded: vi.fn(),
  settleInviteReward: vi.fn()
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

  it("reports invalid 4K square requests as client errors", async () => {
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
      message: expect.stringContaining("4K 不支持 1:1")
    });

    expect(getQuotaState).not.toHaveBeenCalled();
  });
});
