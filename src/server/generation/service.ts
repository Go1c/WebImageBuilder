import { ApiError } from "../http";
import {
  canUseAnonymousQuota,
  getQuotaSnapshot,
  spendQuota,
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
import { uploadBuffer, type StoredAsset } from "../storage/s3";

export type GenerateResult = {
  taskId: string;
  status: "succeeded";
  images: StoredAsset[];
  quota: ReturnType<typeof getQuotaSnapshot>;
};

export async function generateImagesForActor(input: {
  actor: Actor;
  rawInput: unknown;
}): Promise<GenerateResult> {
  const generation = normalizeGenerationInput(input.rawInput);
  const quotaState = await getQuotaState(input.actor);

  if (input.actor.type === "anonymous") {
    const anonymousDecision = canUseAnonymousQuota({
      anonymousUsed: quotaState.anonymousUsed,
      ipDailyUsed: quotaState.ipDailyUsed
    });

    if (!anonymousDecision.allowed) {
      throw new ApiError(429, "rate_limited", anonymousDecision.reason);
    }
  }

  const spend = spendQuota({
    actorType: quotaState.actorType,
    anonymousUsed: quotaState.anonymousUsed,
    loginUsed: quotaState.loginUsed,
    inviteCredits: quotaState.inviteCredits,
    paidCredits: quotaState.paidCredits
  });

  if (!spend.allowed) {
    throw new ApiError(402, "quota_exhausted", "No available generation quota");
  }

  const taskId = await createTask({ actor: input.actor, generation });

  try {
    const generated = await getImageProvider(generation.provider).generate(generation);
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
      spendSource: spend.spendSource as SpendSource,
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
      quota: getQuotaSnapshot({
        actorType: quotaState.actorType,
        anonymousUsed: spend.nextAnonymousUsed,
        loginUsed: spend.nextLoginUsed,
        inviteCredits: spend.nextInviteCredits,
        paidCredits: spend.nextPaidCredits
      })
    };
  } catch (error) {
    await markTaskFailed(taskId, error instanceof Error ? error.message : "Generation failed");
    throw new ApiError(
      502,
      "provider_error",
      error instanceof Error ? error.message : "Generation failed"
    );
  }
}

export function summarizeGeneration(input: NormalizedGenerationInput): string {
  return `${input.model} ${input.mode} ${input.size} x${input.count}`;
}

function buildResultPrefix(actor: Actor, taskId: string): string {
  const owner = actor.type === "user" ? actor.userId : actor.anonymousDeviceId;
  return `generated/${owner}/${taskId}`;
}
