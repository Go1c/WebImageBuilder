import { ApiError } from "../http";
import {
  canUseAnonymousQuota,
  getQuotaSnapshot,
  type SpendSource
} from "../domain/quota";
import { normalizeGenerationInput, type NormalizedGenerationInput } from "../domain/models";
import type { Actor } from "../db/types";
import {
  createTask,
  getQuotaState,
  markTaskFailed,
  markTaskSucceeded,
  settleInviteReward
} from "../db/repositories";
import { getImageProvider } from "../providers";
import { OpenAIImageProvider } from "../providers/openai";
import { uploadBuffer, type StoredAsset } from "../storage/s3";
import { getSub2ApiImageApiKey } from "../sub2api/client";
import { getAppConfig } from "../config";
import { chooseGenerationFunding } from "./funding";

export type GenerateResult = {
  taskId: string;
  status: "succeeded";
  images: StoredAsset[];
  quota: ReturnType<typeof getQuotaSnapshot>;
};

export async function generateImagesForActor(input: {
  actor: Actor;
  rawInput: unknown;
  sub2ApiAccessToken?: string;
}): Promise<GenerateResult> {
  const generation = normalizeGenerationInput(input.rawInput);
  const quotaState = await getQuotaState(input.actor);

  if (input.actor.type === "anonymous") {
    const anonymousDecision = canUseAnonymousQuota({
      anonymousUsed: quotaState.anonymousUsed,
      ipDailyUsed: quotaState.ipDailyUsed
    });

    if (!anonymousDecision.allowed) {
      if (anonymousDecision.reason === "device_quota_exhausted") {
        throw new ApiError(
          402,
          "quota_exhausted",
          "当前设备的免费体验次数已用完，请登录后使用 Lumio 账户 Key/余额继续生成。"
        );
      }

      throw new ApiError(429, "rate_limited", anonymousDecision.reason);
    }
  }

  const funding = chooseGenerationFunding({
    quotaState,
    allowSub2ApiFallback: input.actor.type === "user" && generation.provider === "openai",
    allowSiteFunding: generation.resolution === "1K"
  });

  if (funding.kind === "blocked") {
    if (funding.reason === "trial_resolution_unsupported") {
      throw new ApiError(
        402,
        "trial_resolution_unsupported",
        "免费 3 次体验只支持 1K。请选择 1K，或登录后使用 Lumio 账户生成 2K/4K。"
      );
    }

    throw new ApiError(402, "quota_exhausted", "No available generation quota");
  }

  const taskId = await createTask({ actor: input.actor, generation });

  try {
    const generated =
      funding.kind === "sub2api"
        ? await generateWithSub2ApiAccount({
            generation,
            accessToken: input.sub2ApiAccessToken
          })
        : await getImageProvider(generation.provider).generate(generation);
    const stored = await Promise.all(
      generated.map((image) =>
        uploadBuffer({
          buffer: image.buffer,
          mimeType: image.mimeType,
          prefix: buildResultPrefix(input.actor, taskId)
        })
      )
    );

    await markTaskSucceeded({
      taskId,
      actor: input.actor,
      spendSource: funding.kind === "site" ? (funding.spendSource as SpendSource) : null,
      assets: stored.map((asset) => ({
        assetType: "result",
        storageKey: asset.key,
        url: asset.url,
        mimeType: asset.mimeType
      }))
    });

    if (input.actor.type === "user") {
      await settleInviteReward(input.actor.userId);
    }

    return {
      taskId,
      status: "succeeded",
      images: stored,
      quota:
        funding.kind === "site"
          ? getQuotaSnapshot({
              actorType: quotaState.actorType,
              anonymousUsed: funding.nextAnonymousUsed,
              loginUsed: funding.nextLoginUsed,
              inviteCredits: funding.nextInviteCredits,
              paidCredits: funding.nextPaidCredits
            })
          : getQuotaSnapshot(quotaState)
    };
  } catch (error) {
    await markTaskFailed(taskId, error instanceof Error ? error.message : "Generation failed");
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      502,
      "provider_error",
      error instanceof Error ? error.message : "Generation failed"
    );
  }
}

async function generateWithSub2ApiAccount(input: {
  generation: NormalizedGenerationInput;
  accessToken?: string;
}) {
  if (!input.accessToken) {
    throw new ApiError(401, "unauthorized", "Sub2API 账号生成需要重新登录。");
  }

  const apiKey = await getSub2ApiImageApiKey(input.accessToken);
  return new OpenAIImageProvider({
    apiKey,
    baseUrl: getAppConfig().lumioApiBaseUrl
  }).generate(input.generation);
}

export function summarizeGeneration(input: NormalizedGenerationInput): string {
  return `${input.model} ${input.mode} ${input.size} x${input.count}`;
}

function buildResultPrefix(actor: Actor, taskId: string): string {
  const owner = actor.type === "user" ? actor.userId : actor.anonymousDeviceId;
  return `generated/${owner}/${taskId}`;
}
