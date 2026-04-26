export type ActorType = "anonymous" | "user";
export type SpendSource = "anonymous" | "login" | "invite" | "paid";

export type QuotaConfigEnv = Partial<
  Record<
    | "ANON_FREE_GENERATIONS"
    | "LOGIN_FREE_GENERATIONS"
    | "INVITE_REWARD_GENERATIONS"
    | "IP_DAILY_ANON_LIMIT",
    string
  >
>;

export type QuotaConfig = {
  anonymousFreeGenerations: number;
  loginFreeGenerations: number;
  inviteRewardGenerations: number;
  ipDailyAnonymousLimit: number;
};

export type QuotaSnapshotInput = {
  actorType: ActorType;
  anonymousUsed: number;
  loginUsed: number;
  inviteCredits: number;
  paidCredits: number;
  config?: QuotaConfig;
};

export type QuotaSnapshot = {
  actorType: ActorType;
  freeTotal: number;
  remaining: number;
  sources: Record<SpendSource, number>;
};

export type AnonymousQuotaCheck = {
  anonymousUsed: number;
  ipDailyUsed: number;
  config?: QuotaConfig;
};

export type AnonymousQuotaDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "device_quota_exhausted" | "ip_daily_limit_exhausted";
    };

export type SpendQuotaInput = QuotaSnapshotInput;

export type SpendQuotaResult =
  | {
      allowed: true;
      spendSource: SpendSource;
      nextAnonymousUsed: number;
      nextLoginUsed: number;
      nextInviteCredits: number;
      nextPaidCredits: number;
    }
  | {
      allowed: false;
      reason: "quota_exhausted";
    };

const DEFAULT_QUOTA_CONFIG: QuotaConfig = {
  anonymousFreeGenerations: 3,
  loginFreeGenerations: 3,
  inviteRewardGenerations: 0,
  ipDailyAnonymousLimit: 30
};

function numberFromEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function clamp(value: number): number {
  return Math.max(0, Math.floor(value));
}

export function getQuotaConfig(env: QuotaConfigEnv = process.env as QuotaConfigEnv): QuotaConfig {
  return {
    anonymousFreeGenerations: numberFromEnv(
      env.ANON_FREE_GENERATIONS,
      DEFAULT_QUOTA_CONFIG.anonymousFreeGenerations
    ),
    loginFreeGenerations: numberFromEnv(
      env.LOGIN_FREE_GENERATIONS,
      DEFAULT_QUOTA_CONFIG.loginFreeGenerations
    ),
    inviteRewardGenerations: DEFAULT_QUOTA_CONFIG.inviteRewardGenerations,
    ipDailyAnonymousLimit: numberFromEnv(
      env.IP_DAILY_ANON_LIMIT,
      DEFAULT_QUOTA_CONFIG.ipDailyAnonymousLimit
    )
  };
}

export function getQuotaSnapshot(input: QuotaSnapshotInput): QuotaSnapshot {
  const config = input.config ?? getQuotaConfig();
  const localTrialTotal = Math.min(
    config.anonymousFreeGenerations,
    config.loginFreeGenerations
  );
  const anonymousRemaining =
    input.actorType === "anonymous"
      ? Math.max(0, config.anonymousFreeGenerations - clamp(input.anonymousUsed))
      : 0;
  const loginRemaining =
    input.actorType === "user"
      ? Math.max(0, localTrialTotal - clamp(input.anonymousUsed) - clamp(input.loginUsed))
      : 0;

  const freeTotal =
    input.actorType === "anonymous"
      ? config.anonymousFreeGenerations
      : localTrialTotal;

  return {
    actorType: input.actorType,
    freeTotal,
    remaining: anonymousRemaining + loginRemaining,
    sources: {
      anonymous: anonymousRemaining,
      login: loginRemaining,
      invite: 0,
      paid: 0
    }
  };
}

export function canUseAnonymousQuota(input: AnonymousQuotaCheck): AnonymousQuotaDecision {
  const config = input.config ?? getQuotaConfig();

  if (clamp(input.anonymousUsed) >= config.anonymousFreeGenerations) {
    return { allowed: false, reason: "device_quota_exhausted" };
  }

  if (clamp(input.ipDailyUsed) >= config.ipDailyAnonymousLimit) {
    return { allowed: false, reason: "ip_daily_limit_exhausted" };
  }

  return { allowed: true };
}

export function spendQuota(input: SpendQuotaInput): SpendQuotaResult {
  const snapshot = getQuotaSnapshot(input);
  if (snapshot.remaining <= 0) {
    return { allowed: false, reason: "quota_exhausted" };
  }

  if (input.actorType === "anonymous") {
    return {
      allowed: true,
      spendSource: "anonymous",
      nextAnonymousUsed: clamp(input.anonymousUsed) + 1,
      nextLoginUsed: clamp(input.loginUsed),
      nextInviteCredits: clamp(input.inviteCredits),
      nextPaidCredits: clamp(input.paidCredits)
    };
  }

  if (snapshot.sources.login > 0) {
    return {
      allowed: true,
      spendSource: "login",
      nextAnonymousUsed: clamp(input.anonymousUsed),
      nextLoginUsed: clamp(input.loginUsed) + 1,
      nextInviteCredits: clamp(input.inviteCredits),
      nextPaidCredits: clamp(input.paidCredits)
    };
  }

  return { allowed: false, reason: "quota_exhausted" };
}
