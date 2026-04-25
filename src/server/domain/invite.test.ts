import { describe, expect, it } from "vitest";
import { shouldAwardInviteReward } from "./invite";

describe("invite reward rules", () => {
  it("awards only after the invitee completes the first successful generation", () => {
    expect(
      shouldAwardInviteReward({
        alreadyRewarded: false,
        inviteeCompletedFirstGeneration: false,
        inviterUserId: "u1",
        inviteeUserId: "u2",
        sameDevice: false,
        sameIpHash: false
      })
    ).toEqual({ award: false, reason: "first_generation_required" });

    expect(
      shouldAwardInviteReward({
        alreadyRewarded: false,
        inviteeCompletedFirstGeneration: true,
        inviterUserId: "u1",
        inviteeUserId: "u2",
        sameDevice: false,
        sameIpHash: false
      })
    ).toEqual({ award: true });
  });

  it("does not award self-invites, duplicate rewards, or obvious same-device abuse", () => {
    expect(
      shouldAwardInviteReward({
        alreadyRewarded: false,
        inviteeCompletedFirstGeneration: true,
        inviterUserId: "u1",
        inviteeUserId: "u1",
        sameDevice: false,
        sameIpHash: false
      })
    ).toEqual({ award: false, reason: "self_invite" });

    expect(
      shouldAwardInviteReward({
        alreadyRewarded: true,
        inviteeCompletedFirstGeneration: true,
        inviterUserId: "u1",
        inviteeUserId: "u2",
        sameDevice: false,
        sameIpHash: false
      })
    ).toEqual({ award: false, reason: "already_rewarded" });

    expect(
      shouldAwardInviteReward({
        alreadyRewarded: false,
        inviteeCompletedFirstGeneration: true,
        inviterUserId: "u1",
        inviteeUserId: "u2",
        sameDevice: true,
        sameIpHash: false
      })
    ).toEqual({ award: false, reason: "same_device" });
  });
});
