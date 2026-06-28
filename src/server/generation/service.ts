import { ApiError } from "../http";
import {
  canUseAnonymousQuota,
  getQuotaSnapshot,
  type SpendSource
} from "../domain/quota";
import {
  normalizeGenerationInput,
  type AssetReference,
  type NormalizedGenerationInput
} from "../domain/models";
import type { Actor } from "../db/types";
import {
  createTask,
  getOwnedAsset,
  getQuotaState,
  markTaskFailed,
  markTaskSucceeded,
  settleInviteReward
} from "../db/repositories";
import { getImageProvider } from "../providers";
import { GeminiImageProvider } from "../providers/gemini";
import { OpenAIImageProvider } from "../providers/openai";
import { UpstreamProviderError, type ProviderUpstreamErrorDetail } from "../providers/upstream";
import { downloadStoredAsset, uploadBuffer, type StoredAsset } from "../storage/s3";
import { getSub2ApiGenerationApiKey } from "../sub2api/client";
import { getAppConfig } from "../config";
import { chooseGenerationFunding, type GenerationFundingDecision } from "./funding";
import type { DbQuotaState } from "../db/types";

export type GenerateResult = {
  taskId: string;
  status: "succeeded";
  images: StoredAsset[];
  quota: ReturnType<typeof getQuotaSnapshot>;
};

export type StartGenerationResult = {
  taskId: string;
  status: "running";
  quota: ReturnType<typeof getQuotaSnapshot>;
};

type ActiveFunding = Exclude<GenerationFundingDecision, { kind: "blocked" }>;

type PreparedGeneration = {
  taskId: string;
  generation: NormalizedGenerationInput;
  funding: ActiveFunding;
  quotaState: DbQuotaState;
  sub2ApiApiKey?: string;
};

type GenerationActorInput = {
  actor: Actor;
  rawInput: unknown;
  sub2ApiAccessToken?: string;
};

// Validates quota/funding (throwing synchronous errors the caller surfaces to
// the client) and creates the task row. Both the synchronous and asynchronous
// entry points share this so they reject identical bad requests the same way.
async function prepareGeneration(input: GenerationActorInput): Promise<PreparedGeneration> {
  const generation = normalizeGenerationInputOrThrowBadRequest(input.rawInput);
  const quotaState = await getQuotaState(input.actor);

  if (input.actor.type === "anonymous") {
    const anonymousDecision = canUseAnonymousQuota({
      anonymousUsed: quotaState.anonymousUsed,
      ipDailyUsed: quotaState.ipDailyUsed,
      amount: generation.count
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
    allowSub2ApiFallback:
      input.actor.type === "user" && ["openai", "gemini"].includes(generation.provider),
    allowSiteFunding:
      generation.resolution === "1K" &&
      !(input.actor.type === "user" && generation.provider === "gemini"),
    amount: generation.count
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

  // Validate the sub2api session up front so the client gets 401 immediately
  // instead of waiting for the background task to fail. When a user-funded
  // model is selected, validate the matching provider group key up front too
  // so setup guidance can be returned directly to the client.
  let sub2ApiApiKey: string | undefined;
  if (funding.kind === "sub2api" && !input.sub2ApiAccessToken) {
    throw new ApiError(401, "unauthorized", "Sub2API 账号生成需要重新登录。");
  }

  if (funding.kind === "sub2api") {
    sub2ApiApiKey = await getSub2ApiGenerationApiKey(
      input.sub2ApiAccessToken as string,
      generation.provider
    );
  }

  const taskId = await createTask({ actor: input.actor, generation });

  return { taskId, generation, funding, quotaState, sub2ApiApiKey };
}

// Runs the slow part (provider call + upload + persistence). Persists failures
// via markTaskFailed before rethrowing so a polling client always sees a final
// task status, even when this runs detached in the background.
async function executeGenerationTask(
  input: PreparedGeneration & { actor: Actor; sub2ApiAccessToken?: string }
): Promise<GenerateResult> {
  const { actor, taskId, generation, funding, quotaState } = input;

  try {
    const providerGeneration = await resolveStoredGenerationAssets(actor, generation);
    const generated =
      funding.kind === "sub2api"
        ? await generateWithSub2ApiAccount({
            generation: providerGeneration,
            accessToken: input.sub2ApiAccessToken,
            apiKey: input.sub2ApiApiKey
          })
        : await getImageProvider(providerGeneration.provider).generate(providerGeneration);
    const stored = await Promise.all(
      generated.map((image) =>
        uploadBuffer({
          buffer: image.buffer,
          mimeType: image.mimeType,
          prefix: buildResultPrefix(actor, taskId)
        })
      )
    );

    await markTaskSucceeded({
      taskId,
      actor,
      spendSource: funding.kind === "site" ? (funding.spendSource as SpendSource) : null,
      assets: stored.map((asset) => ({
        assetType: "result",
        storageKey: asset.key,
        url: asset.url,
        mimeType: asset.mimeType
      }))
    });

    if (actor.type === "user") {
      await settleInviteReward(actor.userId);
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

    if (error instanceof UpstreamProviderError) {
      throw new ApiError(
        getProviderErrorHttpStatus(error.upstream),
        "provider_error",
        error.message,
        { upstream: error.upstream }
      );
    }

    throw new ApiError(
      502,
      "provider_error",
      error instanceof Error ? error.message : "Generation failed"
    );
  }
}

async function resolveStoredGenerationAssets(
  actor: Actor,
  generation: NormalizedGenerationInput
): Promise<NormalizedGenerationInput> {
  if (!generation.referenceAssets.length && !generation.maskAsset) {
    return generation;
  }

  return {
    ...generation,
    referenceAssets: await Promise.all(
      generation.referenceAssets.map((asset) => resolveStoredAssetReference(actor, asset))
    ),
    ...(generation.maskAsset
      ? { maskAsset: await resolveStoredAssetReference(actor, generation.maskAsset) }
      : {})
  };
}

async function resolveStoredAssetReference(
  actor: Actor,
  asset: AssetReference
): Promise<AssetReference> {
  const ownedAsset = await getOwnedAsset(actor, {
    storageKey: asset.key,
    url: asset.url
  });

  if (!ownedAsset) {
    return asset;
  }

  if (ownedAsset.url.startsWith("data:")) {
    return {
      ...asset,
      key: ownedAsset.storageKey,
      url: ownedAsset.url,
      mimeType: ownedAsset.mimeType || asset.mimeType
    };
  }

  const downloaded = await downloadStoredAsset(ownedAsset.storageKey);
  return {
    ...asset,
    key: ownedAsset.storageKey,
    url: buildDataUrl(downloaded.buffer, downloaded.mimeType),
    mimeType: downloaded.mimeType
  };
}

function buildDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

// Synchronous flow: waits for the whole pipeline and returns the images. Kept
// for tests and any caller that wants the result inline.
export async function generateImagesForActor(input: GenerationActorInput): Promise<GenerateResult> {
  const prepared = await prepareGeneration(input);
  return executeGenerationTask({
    ...prepared,
    actor: input.actor,
    sub2ApiAccessToken: input.sub2ApiAccessToken
  });
}

// Asynchronous flow: returns a taskId as soon as the task is created and runs
// the slow provider call detached in the background. This keeps the HTTP
// request short so platform/proxy timeouts (e.g. the gateway in front of the
// app) can't drop a successful generation. The client polls GET /api/tasks/:id.
export async function startGeneration(input: GenerationActorInput): Promise<StartGenerationResult> {
  const prepared = await prepareGeneration(input);

  void executeGenerationTask({
    ...prepared,
    actor: input.actor,
    sub2ApiAccessToken: input.sub2ApiAccessToken
  }).catch((error) => {
    // Failure is already persisted via markTaskFailed; this only prevents an
    // unhandled rejection from the detached promise.
    console.error("[api/generate] background generation failed", {
      taskId: prepared.taskId,
      error: error instanceof Error ? error.message : error
    });
  });

  return {
    taskId: prepared.taskId,
    status: "running",
    quota: getQuotaSnapshot(prepared.quotaState)
  };
}

async function generateWithSub2ApiAccount(input: {
  generation: NormalizedGenerationInput;
  accessToken?: string;
  apiKey?: string;
}) {
  if (!input.accessToken) {
    throw new ApiError(401, "unauthorized", "Sub2API 账号生成需要重新登录。");
  }

  const apiKey =
    input.apiKey || (await getSub2ApiGenerationApiKey(input.accessToken, input.generation.provider));

  if (input.generation.provider === "gemini") {
    return new GeminiImageProvider({
      apiKey,
      baseUrl: getAppConfig().lumioApiBaseUrl
    }).generate(input.generation);
  }

  return new OpenAIImageProvider({
    apiKey,
    baseUrl: getAppConfig().lumioApiBaseUrl
  }).generate(input.generation);
}

export function summarizeGeneration(input: NormalizedGenerationInput): string {
  return `${input.model} ${input.mode} ${input.size} x${input.count}`;
}

function normalizeGenerationInputOrThrowBadRequest(input: unknown): NormalizedGenerationInput {
  try {
    return normalizeGenerationInput(input);
  } catch (error) {
    throw new ApiError(400, "bad_request", readGenerationInputErrorMessage(error));
  }
}

function readGenerationInputErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Invalid generation request";
}

function getProviderErrorHttpStatus(upstream: ProviderUpstreamErrorDetail): number {
  switch (upstream.code) {
    case "content_policy_violation":
    case "prompt_violation":
    case "reference_required":
    case "drawing_mode_not_triggered":
    case "upstream_bad_request":
      return 400;
    case "upstream_timeout":
      return 504;
    case "upstream_not_found":
      return 502;
    default:
      break;
  }

  if (upstream.statusCode && upstream.statusCode >= 400 && upstream.statusCode < 500) {
    return upstream.statusCode;
  }

  return 502;
}

function buildResultPrefix(actor: Actor, taskId: string): string {
  const owner = actor.type === "user" ? actor.userId : actor.anonymousDeviceId;
  return `generated/${owner}/${taskId}`;
}
