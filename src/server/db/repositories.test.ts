import { randomUUID } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTask,
  createSession,
  getUserInviteCode,
  getQuotaState,
  getSession,
  listSessionTasks,
  listSessions,
  listHistory,
  markTaskSucceeded,
  resolveActor
} from "./repositories";
import type { NormalizedGenerationInput } from "../domain/models";

describe("local repository fallback", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: "",
      LUMIO_LOCAL_MODE: "true"
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("supports anonymous quota and history without DATABASE_URL", async () => {
    const actor = await resolveActor({
      authUser: null,
      deviceId: `device-${randomUUID()}`,
      ipHash: `ip-${randomUUID()}`
    });

    expect(actor.type).toBe("anonymous");
    expect(await getQuotaState(actor)).toMatchObject({
      actorType: "anonymous",
      anonymousUsed: 0,
      ipDailyUsed: 0
    });

    const taskId = await createTask({ actor, generation: buildGeneration() });
    await markTaskSucceeded({
      taskId,
      actor,
      spendSource: "anonymous",
      assets: [
        {
          assetType: "result",
          storageKey: "local/test.png",
          url: "data:image/png;base64,ZmFrZQ==",
          mimeType: "image/png"
        }
      ]
    });

    const quota = await getQuotaState(actor);
    const history = await listHistory(actor);

    expect(quota.anonymousUsed).toBe(1);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: taskId,
      prompt: "A blue circle",
      status: "succeeded",
      assets: [{ type: "result", url: "data:image/png;base64,ZmFrZQ==" }]
    });
  });

  it("returns a stable local invite code for authenticated users without DATABASE_URL", async () => {
    const actor = await resolveActor({
      authUser: {
        externalUserId: `external-${randomUUID()}`,
        raw: {}
      },
      deviceId: `device-${randomUUID()}`,
      ipHash: `ip-${randomUUID()}`
    });

    expect(actor.type).toBe("user");
    if (actor.type !== "user") {
      throw new Error("Expected local authenticated actor");
    }

    const inviteCode = await getUserInviteCode(actor.userId);
    const secondInviteCode = await getUserInviteCode(actor.userId);

    expect(inviteCode).toMatch(/^local-[a-z0-9]+$/);
    expect(secondInviteCode).toBe(inviteCode);
  });

  it("tracks local v2 sessions and their generated tasks", async () => {
    const actor = await resolveActor({
      authUser: {
        externalUserId: `external-${randomUUID()}`,
        raw: {}
      },
      deviceId: `device-${randomUUID()}`,
      ipHash: `ip-${randomUUID()}`
    });

    const session = await createSession({ actor, title: "角色设定" });
    const generation = buildGeneration({ sessionId: session.id, seed: 42, cfg: 7.5, steps: 28 });
    const taskId = await createTask({ actor, generation });
    await markTaskSucceeded({
      taskId,
      actor,
      spendSource: "login",
      assets: [
        {
          assetType: "result",
          storageKey: "local/v2.png",
          url: "data:image/png;base64,djI=",
          mimeType: "image/png"
        }
      ]
    });

    await expect(listSessions(actor)).resolves.toMatchObject([
      {
        id: session.id,
        title: "角色设定",
        taskCount: 1,
        recentImages: ["data:image/png;base64,djI="]
      }
    ]);
    await expect(getSession(actor, session.id)).resolves.toMatchObject({
      id: session.id,
      title: "角色设定"
    });
    await expect(listSessionTasks(actor, session.id)).resolves.toMatchObject([
      {
        id: taskId,
        params: {
          seed: 42,
          cfg: 7.5,
          steps: 28
        },
        assets: [{ type: "result", url: "data:image/png;base64,djI=" }]
      }
    ]);
  });
});

function buildGeneration(
  overrides: Partial<NormalizedGenerationInput> = {}
): NormalizedGenerationInput {
  return {
    prompt: "A blue circle",
    mode: "text-to-image",
    model: "gpt-image-2",
    provider: "openai",
    providerModel: "gpt-image-2",
    size: "1024x1024",
    quality: "standard",
    count: 1,
    referenceAssets: [],
    ...overrides
  };
}
