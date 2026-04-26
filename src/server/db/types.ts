export type Actor =
  | {
      type: "user";
      userId: string;
      externalUserId: string;
      deviceId: string;
      ipHash: string;
    }
  | {
      type: "anonymous";
      anonymousDeviceId: string;
      deviceId: string;
      ipHash: string;
    };

export type DbQuotaState = {
  actorType: "anonymous" | "user";
  anonymousUsed: number;
  loginUsed: number;
  inviteCredits: number;
  paidCredits: number;
  ipDailyUsed: number;
};

export type GenerationTaskRecord = {
  id: string;
  userId: string | null;
  anonymousDeviceId: string | null;
  sessionId: string | null;
  mode: string;
  modelKey: string;
  provider: string;
  providerModel: string;
  prompt: string;
  status: "queued" | "running" | "succeeded" | "failed";
  errorMessage: string | null;
  resultCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PromptShareRecord = {
  id: string;
  prompt: string;
  imageUrl: string;
  imageStorageKey: string | null;
  imageMimeType: string | null;
  status: "active" | "reported";
  createdAt: string;
};
