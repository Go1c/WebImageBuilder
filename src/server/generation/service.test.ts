import { describe, expect, it, vi, beforeEach } from "vitest";
import { createTask, getOwnedAsset, getQuotaState, markTaskFailed } from "../db/repositories";
import { ApiError } from "../http";
import { getImageProvider } from "../providers";
import { UpstreamProviderError } from "../providers/upstream";
import { downloadStoredAsset, uploadBuffer } from "../storage/s3";
import { getSub2ApiGenerationApiKey } from "../sub2api/client";
import { generateImagesForActor } from "./service";

vi.mock("../db/repositories", () => ({
  createTask: vi.fn(),
  getOwnedAsset: vi.fn(),
  getQuotaState: vi.fn(),
  markTaskFailed: vi.fn(),
  markTaskSucceeded: vi.fn(),
  settleInviteReward: vi.fn()
}));

vi.mock("../providers", () => ({
  getImageProvider: vi.fn()
}));

vi.mock("../storage/s3", () => ({
  downloadStoredAsset: vi.fn(),
  uploadBuffer: vi.fn()
}));

vi.mock("../sub2api/client", () => ({
  getSub2ApiGenerationApiKey: vi.fn()
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

  it("returns Gemini key setup guidance before creating a Sub2API-funded task", async () => {
    vi.mocked(getQuotaState).mockResolvedValueOnce({
      actorType: "user",
      anonymousUsed: 3,
      loginUsed: 0,
      inviteCredits: 0,
      paidCredits: 0,
      ipDailyUsed: 0
    });
    vi.mocked(getSub2ApiGenerationApiKey).mockRejectedValueOnce(
      new ApiError(
        402,
        "account_unavailable",
        "未找到可用于图片生成的 active Gemini API Key。请在 Sub2API 创建或启用一个 Key，并绑定到平台为 Gemini、分组名包含 gemini 或 image 的分组，例如 Gemini（生图专用）。"
      )
    );

    await expect(
      generateImagesForActor({
        actor: {
          type: "user",
          userId: "user-1",
          externalUserId: "sub2api:1",
          deviceId: "device-1",
          ipHash: "ip-1"
        },
        sub2ApiAccessToken: "access-token",
        rawInput: {
          prompt: "simple test image",
          mode: "text-to-image",
          model: "gemini-3.1-flash-image-preview",
          size: "1024x1024",
          resolution: "1K",
          quality: "standard",
          count: 1,
          referenceAssets: []
        }
      })
    ).rejects.toMatchObject<Partial<ApiError>>({
      status: 402,
      code: "account_unavailable",
      message: expect.stringContaining("Gemini")
    });
    expect(createTask).not.toHaveBeenCalled();
  });

  it("looks up the user's Gemini group key even when local 1K quota remains", async () => {
    vi.mocked(getQuotaState).mockResolvedValueOnce({
      actorType: "user",
      anonymousUsed: 0,
      loginUsed: 0,
      inviteCredits: 0,
      paidCredits: 0,
      ipDailyUsed: 0
    });
    vi.mocked(getSub2ApiGenerationApiKey).mockRejectedValueOnce(
      new ApiError(
        402,
        "account_unavailable",
        "未找到可用于图片生成的 active Gemini API Key。"
      )
    );

    await expect(
      generateImagesForActor({
        actor: {
          type: "user",
          userId: "user-1",
          externalUserId: "sub2api:1",
          deviceId: "device-1",
          ipHash: "ip-1"
        },
        sub2ApiAccessToken: "access-token",
        rawInput: {
          prompt: "simple test image",
          mode: "text-to-image",
          model: "gemini-3.1-flash-image-preview",
          size: "1024x1024",
          resolution: "1K",
          quality: "standard",
          count: 1,
          referenceAssets: []
        }
      })
    ).rejects.toMatchObject<Partial<ApiError>>({
      status: 402,
      code: "account_unavailable"
    });
    expect(getSub2ApiGenerationApiKey).toHaveBeenCalledWith("access-token", "gemini");
    expect(createTask).not.toHaveBeenCalled();
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

  it("hydrates owned reference asset keys from storage before calling the provider", async () => {
    const providerGenerate = vi.fn(async () => [
      {
        buffer: Buffer.from("generated image"),
        mimeType: "image/png"
      }
    ]);
    vi.mocked(getQuotaState).mockResolvedValueOnce({
      actorType: "anonymous",
      anonymousUsed: 0,
      loginUsed: 0,
      inviteCredits: 0,
      paidCredits: 0,
      ipDailyUsed: 0
    });
    vi.mocked(createTask).mockResolvedValueOnce("task-1");
    vi.mocked(getOwnedAsset).mockResolvedValueOnce({
      storageKey: "reference/anon-1/ref.png",
      url: "https://cdn.example.com/reference/anon-1/ref.png",
      mimeType: "image/png"
    });
    vi.mocked(downloadStoredAsset).mockResolvedValueOnce({
      buffer: Buffer.from("reference image"),
      mimeType: "image/png"
    });
    vi.mocked(uploadBuffer).mockResolvedValueOnce({
      key: "generated/anon-1/task-1/result.png",
      url: "data:image/png;base64,cmVzdWx0",
      mimeType: "image/png"
    });
    vi.mocked(getImageProvider).mockReturnValueOnce({
      generate: providerGenerate
    });

    await generateImagesForActor({
      actor: {
        type: "anonymous",
        anonymousDeviceId: "anon-1",
        deviceId: "device-1",
        ipHash: "ip-1"
      },
      rawInput: {
        prompt: "use this reference",
        mode: "image-to-image",
        model: "gpt-image-2",
        size: "1024x1024",
        resolution: "1K",
        quality: "standard",
        count: 1,
        referenceAssets: [
          {
            key: "reference/anon-1/ref.png",
            url: "https://cdn.example.com/reference/anon-1/ref.png",
            mimeType: "image/png"
          }
        ]
      }
    });

    expect(getOwnedAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "anonymous",
        anonymousDeviceId: "anon-1"
      }),
      {
        storageKey: "reference/anon-1/ref.png",
        url: "https://cdn.example.com/reference/anon-1/ref.png"
      }
    );
    expect(downloadStoredAsset).toHaveBeenCalledWith("reference/anon-1/ref.png");
    expect(providerGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceAssets: [
          expect.objectContaining({
            key: "reference/anon-1/ref.png",
            url: `data:image/png;base64,${Buffer.from("reference image").toString("base64")}`,
            mimeType: "image/png"
          })
        ]
      })
    );
  });

  it.each([
    ["prompt_violation", 502, 400],
    ["reference_required", 502, 400],
    ["drawing_mode_not_triggered", 502, 400],
    ["upstream_bad_request", 502, 400],
    ["upstream_timeout", 502, 504],
    ["auth_required", 502, 502],
    ["upstream_not_found", 404, 502]
  ])(
    "maps wrapped upstream %s errors to the public HTTP status %s",
    async (code, upstreamStatusCode, publicStatus) => {
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
          throw new UpstreamProviderError(`status_code=${upstreamStatusCode}, ${code}`, {
            statusCode: upstreamStatusCode,
            gatewayStatus: 502,
            code,
            message: code,
            rawResponse: {
              error: {
                message: `status_code=${upstreamStatusCode}, ${code}`
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
        status: publicStatus,
        code: "provider_error",
        upstream: {
          statusCode: upstreamStatusCode,
          code
        }
      });
    }
  );
});
