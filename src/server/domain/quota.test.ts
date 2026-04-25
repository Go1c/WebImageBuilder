import { describe, expect, it } from "vitest";
import {
  canUseAnonymousQuota,
  getQuotaConfig,
  getQuotaSnapshot,
  spendQuota
} from "./quota";

describe("quota rules", () => {
  it("calculates anonymous quota from configurable defaults", () => {
    const config = getQuotaConfig({
      ANON_FREE_GENERATIONS: "4",
      LOGIN_FREE_GENERATIONS: "16",
      INVITE_REWARD_GENERATIONS: "7",
      IP_DAILY_ANON_LIMIT: "12"
    });

    const snapshot = getQuotaSnapshot({
      actorType: "anonymous",
      anonymousUsed: 1,
      loginUsed: 0,
      inviteCredits: 0,
      paidCredits: 0,
      config
    });

    expect(snapshot.freeTotal).toBe(4);
    expect(snapshot.remaining).toBe(3);
    expect(snapshot.sources).toEqual({
      anonymous: 3,
      login: 0,
      invite: 0,
      paid: 0
    });
  });

  it("combines login, invite, and paid credits for authenticated users", () => {
    const config = getQuotaConfig({
      LOGIN_FREE_GENERATIONS: "20",
      INVITE_REWARD_GENERATIONS: "5"
    });

    const snapshot = getQuotaSnapshot({
      actorType: "user",
      anonymousUsed: 0,
      loginUsed: 6,
      inviteCredits: 10,
      paidCredits: 3,
      config
    });

    expect(snapshot.freeTotal).toBe(30);
    expect(snapshot.remaining).toBe(27);
    expect(snapshot.sources).toEqual({
      anonymous: 0,
      login: 14,
      invite: 10,
      paid: 3
    });
  });

  it("blocks anonymous generation when either device or IP daily quota is exhausted", () => {
    const config = getQuotaConfig({
      ANON_FREE_GENERATIONS: "2",
      IP_DAILY_ANON_LIMIT: "3"
    });

    expect(
      canUseAnonymousQuota({
        anonymousUsed: 2,
        ipDailyUsed: 0,
        config
      })
    ).toEqual({ allowed: false, reason: "device_quota_exhausted" });

    expect(
      canUseAnonymousQuota({
        anonymousUsed: 0,
        ipDailyUsed: 3,
        config
      })
    ).toEqual({ allowed: false, reason: "ip_daily_limit_exhausted" });
  });

  it("spends paid credits last so free grants are consumed first", () => {
    const config = getQuotaConfig({
      LOGIN_FREE_GENERATIONS: "2"
    });

    const result = spendQuota({
      actorType: "user",
      anonymousUsed: 0,
      loginUsed: 1,
      inviteCredits: 0,
      paidCredits: 4,
      config
    });

    expect(result).toEqual({
      allowed: true,
      spendSource: "login",
      nextLoginUsed: 2,
      nextAnonymousUsed: 0,
      nextInviteCredits: 0,
      nextPaidCredits: 4
    });
  });
});
