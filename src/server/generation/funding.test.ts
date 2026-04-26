import { describe, expect, it } from "vitest";
import { chooseGenerationFunding } from "./funding";

describe("generation funding", () => {
  it("uses site-funded login quota before Sub2API account fallback", () => {
    const decision = chooseGenerationFunding({
      quotaState: {
        actorType: "user",
        anonymousUsed: 0,
        loginUsed: 1,
        inviteCredits: 0,
        paidCredits: 0,
        ipDailyUsed: 0
      },
      allowSub2ApiFallback: true,
      allowSiteFunding: true,
      config: {
        anonymousFreeGenerations: 3,
        loginFreeGenerations: 2,
        inviteRewardGenerations: 0,
        ipDailyAnonymousLimit: 30
      }
    });

    expect(decision).toEqual(
      expect.objectContaining({
        kind: "site",
        spendSource: "login",
        nextLoginUsed: 2
      })
    );
  });

  it("falls back to the logged-in Sub2API account when site-funded quota is exhausted", () => {
    const decision = chooseGenerationFunding({
      quotaState: {
        actorType: "user",
        anonymousUsed: 0,
        loginUsed: 2,
        inviteCredits: 0,
        paidCredits: 0,
        ipDailyUsed: 0
      },
      allowSub2ApiFallback: true,
      allowSiteFunding: true,
      config: {
        anonymousFreeGenerations: 3,
        loginFreeGenerations: 2,
        inviteRewardGenerations: 0,
        ipDailyAnonymousLimit: 30
      }
    });

    expect(decision).toEqual({ kind: "sub2api" });
  });

  it("falls back to Sub2API after the same device used all local trial generations", () => {
    const decision = chooseGenerationFunding({
      quotaState: {
        actorType: "user",
        anonymousUsed: 3,
        loginUsed: 0,
        inviteCredits: 0,
        paidCredits: 0,
        ipDailyUsed: 0
      },
      allowSub2ApiFallback: true,
      allowSiteFunding: true,
      config: {
        anonymousFreeGenerations: 3,
        loginFreeGenerations: 3,
        inviteRewardGenerations: 0,
        ipDailyAnonymousLimit: 30
      }
    });

    expect(decision).toEqual({ kind: "sub2api" });
  });

  it("uses the logged-in Sub2API account for 2K and 4K instead of site free trial quota", () => {
    const decision = chooseGenerationFunding({
      quotaState: {
        actorType: "user",
        anonymousUsed: 0,
        loginUsed: 0,
        inviteCredits: 0,
        paidCredits: 0,
        ipDailyUsed: 0
      },
      allowSub2ApiFallback: true,
      allowSiteFunding: false,
      config: {
        anonymousFreeGenerations: 3,
        loginFreeGenerations: 3,
        inviteRewardGenerations: 0,
        ipDailyAnonymousLimit: 30
      }
    });

    expect(decision).toEqual({ kind: "sub2api" });
  });

  it("blocks anonymous 2K and 4K requests because free trial only supports 1K", () => {
    const decision = chooseGenerationFunding({
      quotaState: {
        actorType: "anonymous",
        anonymousUsed: 0,
        loginUsed: 0,
        inviteCredits: 0,
        paidCredits: 0,
        ipDailyUsed: 0
      },
      allowSub2ApiFallback: false,
      allowSiteFunding: false,
      config: {
        anonymousFreeGenerations: 3,
        loginFreeGenerations: 3,
        inviteRewardGenerations: 0,
        ipDailyAnonymousLimit: 30
      }
    });

    expect(decision).toEqual({ kind: "blocked", reason: "trial_resolution_unsupported" });
  });
});
