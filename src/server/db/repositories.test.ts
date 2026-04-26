import { randomUUID } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "./client";
import {
  createTask,
  getUserInviteCode,
  getQuotaState,
  listHistory,
  markTaskSucceeded,
  resolveActor
} from "./repositories";
import type { Actor } from "./types";
import type { NormalizedGenerationInput } from "../domain/models";

vi.mock("./client", () => ({
  query: vi.fn(),
  transaction: vi.fn()
}));

const mockedQuery = vi.mocked(query);

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

  it("carries anonymous device usage into authenticated quota state", async () => {
    const deviceId = `device-${randomUUID()}`;
    const ipHash = `ip-${randomUUID()}`;
    const anonymousActor = await resolveActor({
      authUser: null,
      deviceId,
      ipHash
    });

    for (let index = 0; index < 3; index += 1) {
      const taskId = await createTask({ actor: anonymousActor, generation: buildGeneration() });
      await markTaskSucceeded({
        taskId,
        actor: anonymousActor,
        spendSource: "anonymous",
        assets: []
      });
    }

    const userActor = await resolveActor({
      authUser: {
        externalUserId: `external-${randomUUID()}`,
        raw: {}
      },
      deviceId,
      ipHash
    });

    await expect(getQuotaState(userActor)).resolves.toMatchObject({
      actorType: "user",
      anonymousUsed: 3,
      loginUsed: 0
    });
  });

  it("carries authenticated local trial usage back to the same anonymous device", async () => {
    const deviceId = `device-${randomUUID()}`;
    const ipHash = `ip-${randomUUID()}`;
    const userActor = await resolveActor({
      authUser: {
        externalUserId: `external-${randomUUID()}`,
        raw: {}
      },
      deviceId,
      ipHash
    });

    for (let index = 0; index < 3; index += 1) {
      const taskId = await createTask({ actor: userActor, generation: buildGeneration() });
      await markTaskSucceeded({
        taskId,
        actor: userActor,
        spendSource: "login",
        assets: []
      });
    }

    const anonymousActor = await resolveActor({
      authUser: null,
      deviceId,
      ipHash
    });

    await expect(getQuotaState(anonymousActor)).resolves.toMatchObject({
      actorType: "anonymous",
      anonymousUsed: 3
    });
  });

  it("carries authenticated local trial usage across accounts on the same device", async () => {
    const deviceId = `device-${randomUUID()}`;
    const ipHash = `ip-${randomUUID()}`;
    const firstUserActor = await resolveActor({
      authUser: {
        externalUserId: `external-${randomUUID()}`,
        raw: {}
      },
      deviceId,
      ipHash
    });

    for (let index = 0; index < 3; index += 1) {
      const taskId = await createTask({ actor: firstUserActor, generation: buildGeneration() });
      await markTaskSucceeded({
        taskId,
        actor: firstUserActor,
        spendSource: "login",
        assets: []
      });
    }

    const secondUserActor = await resolveActor({
      authUser: {
        externalUserId: `external-${randomUUID()}`,
        raw: {}
      },
      deviceId,
      ipHash
    });

    await expect(getQuotaState(secondUserActor)).resolves.toMatchObject({
      actorType: "user",
      anonymousUsed: 3,
      loginUsed: 0
    });
  });
});

describe("postgres repository queries", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgres://lumio.test/db",
      LUMIO_LOCAL_MODE: "false"
    };
    mockedQuery.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("stores the request device fingerprint on generation tasks", async () => {
    mockedQuery.mockResolvedValue({ rows: [] } as never);

    const actor = buildUserActor("user-1", "device-1");
    await createTask({ actor, generation: buildGeneration() });

    expect(mockedQuery).toHaveBeenCalledTimes(1);
    const [sql, values] = mockedQuery.mock.calls[0];
    expect(sql).toContain("device_fingerprint");
    expect(values).toContain("device-1");
  });

  it("counts site-funded trials by the generation task device fingerprint", async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ count: "0" }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({
        rows: [{ login_used: 0, invite_credits: 0, paid_credits: 0 }]
      } as never)
      .mockResolvedValueOnce({ rows: [{ used: "3" }] } as never);

    await expect(getQuotaState(buildUserActor("user-2", "device-1"))).resolves.toMatchObject({
      actorType: "user",
      anonymousUsed: 3
    });

    const [sql, values] = mockedQuery.mock.calls[3];
    expect(sql).toContain("t.device_fingerprint = $1");
    expect(sql).toContain("t.ip_hash = $2");
    expect(sql).toContain("t.spend_source = 'login'");
    expect(values).toEqual(["device-1", "ip-1"]);
  });
});

function buildUserActor(userId: string, deviceId: string): Actor {
  return {
    type: "user",
    userId,
    externalUserId: `sub2api:${userId}`,
    deviceId,
    ipHash: "ip-1"
  };
}

function buildGeneration(): NormalizedGenerationInput {
  return {
    prompt: "A blue circle",
    mode: "text-to-image",
    model: "gpt-image-2",
    provider: "openai",
    providerModel: "gpt-image-2",
    size: "1024x1024",
    quality: "standard",
    count: 1,
    referenceAssets: []
  };
}
