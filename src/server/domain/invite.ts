export type InviteRewardInput = {
  alreadyRewarded: boolean;
  inviteeCompletedFirstGeneration: boolean;
  inviterUserId: string;
  inviteeUserId: string;
  sameDevice: boolean;
  sameIpHash: boolean;
};

export type InviteRewardDecision =
  | { award: true }
  | {
      award: false;
      reason:
        | "already_rewarded"
        | "first_generation_required"
        | "self_invite"
        | "same_device"
        | "same_ip";
    };

export function shouldAwardInviteReward(input: InviteRewardInput): InviteRewardDecision {
  if (input.alreadyRewarded) {
    return { award: false, reason: "already_rewarded" };
  }

  if (!input.inviteeCompletedFirstGeneration) {
    return { award: false, reason: "first_generation_required" };
  }

  if (input.inviterUserId === input.inviteeUserId) {
    return { award: false, reason: "self_invite" };
  }

  if (input.sameDevice) {
    return { award: false, reason: "same_device" };
  }

  if (input.sameIpHash) {
    return { award: false, reason: "same_ip" };
  }

  return { award: true };
}
