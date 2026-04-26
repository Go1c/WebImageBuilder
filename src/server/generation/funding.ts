import {
  spendQuota,
  type QuotaConfig,
  type SpendQuotaResult,
  type SpendSource
} from "../domain/quota";
import type { DbQuotaState } from "../db/types";

export type SiteGenerationFunding = Extract<SpendQuotaResult, { allowed: true }> & {
  kind: "site";
  spendSource: SpendSource;
};

export type GenerationFundingDecision =
  | SiteGenerationFunding
  | { kind: "sub2api" }
  | { kind: "blocked"; reason: "quota_exhausted" };

export function chooseGenerationFunding(input: {
  quotaState: DbQuotaState;
  allowSub2ApiFallback: boolean;
  config?: QuotaConfig;
}): GenerationFundingDecision {
  const spend = spendQuota({
    actorType: input.quotaState.actorType,
    anonymousUsed: input.quotaState.anonymousUsed,
    loginUsed: input.quotaState.loginUsed,
    inviteCredits: input.quotaState.inviteCredits,
    paidCredits: input.quotaState.paidCredits,
    config: input.config
  });

  if (spend.allowed) {
    return {
      kind: "site",
      ...spend
    };
  }

  if (input.quotaState.actorType === "user" && input.allowSub2ApiFallback) {
    return { kind: "sub2api" };
  }

  return { kind: "blocked", reason: spend.reason };
}
