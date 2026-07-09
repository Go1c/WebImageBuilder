import { randomUUID } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "./client";
import {
  createTask,
  createPromptShare,
  getGlobalGenerationStats,
  getPromptShare,
  getUserInviteCode,
  getQuotaState,
  listHistory,
  markTaskFailed,
  markTaskSucceeded,
  reportPromptShare,
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

  it("counts successful local generation tasks for global stats", async () => {
    const before = await getGlobalGenerationStats();
    const actor = await resolveActor({
      authUser: null,
      deviceId: `device-${randomUUID()}`,
      ipHash: `ip-${randomUUID()}`
    });
    const succeededTaskId = await createTask({ actor, generation: buildGeneration() });
    const failedTaskId = await createTask({ actor, generation: buildGeneration() });

    await markTaskSucceeded({
      taskId: succeededTaskId,
      actor,
      spendSource: "anonymous",
      assets: []
    });
    await markTaskFailed(failedTaskId, "provider failed");

    await expect(getGlobalGenerationStats()).resolves.toEqual({
      totalGenerations: before.totalGenerations + 1
    });
  });

  it("stores complete local failure messages for history", async () => {
    const actor = await resolveActor({
      authUser: null,
      deviceId: `device-${randomUUID()}`,
      ipHash: `ip-${randomUUID()}`
    });
    const taskId = await createTask({ actor, generation: buildGeneration() });
    const upstreamError = `status_code=502, 图片生成失败(auth_required):${"上游返回 403 风控/盾页面 ".repeat(80)}complete-tail`;

    await markTaskFailed(taskId, upstreamError);

    const history = await listHistory(actor);
    expect(history[0]).toMatchObject({
      id: taskId,
      status: "failed",
      errorMessage: upstreamError
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

  it("creates a public share for an owned local generation result", async () => {
    const actor = await resolveActor({
      authUser: null,
      deviceId: `device-${randomUUID()}`,
      ipHash: `ip-${randomUUID()}`
    });
    const taskId = await createTask({ actor, generation: buildGeneration() });
    await markTaskSucceeded({
      taskId,
      actor,
      spendSource: "anonymous",
      assets: [
        {
          assetType: "result",
          storageKey: "generated/local/result.png",
          url: "data:image/png;base64,ZmFrZQ==",
          mimeType: "image/png"
        }
      ]
    });

    const share = await createPromptShare({
      actor,
      taskId,
      imageUrl: "data:image/png;base64,ZmFrZQ=="
    });
    const publicShare = await getPromptShare(share.id);

    expect(share.id).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(publicShare).toMatchObject({
      id: share.id,
      prompt: "A blue circle",
      imageUrl: "data:image/png;base64,ZmFrZQ==",
      imageStorageKey: "generated/local/result.png",
      imageMimeType: "image/png"
    });
  });

  it("does not create a local share for a task owned by another actor", async () => {
    const owner = await resolveActor({
      authUser: null,
      deviceId: `device-${randomUUID()}`,
      ipHash: `ip-${randomUUID()}`
    });
    const otherActor = await resolveActor({
      authUser: null,
      deviceId: `device-${randomUUID()}`,
      ipHash: `ip-${randomUUID()}`
    });
    const taskId = await createTask({ actor: owner, generation: buildGeneration() });
    await markTaskSucceeded({
      taskId,
      actor: owner,
      spendSource: "anonymous",
      assets: [
        {
          assetType: "result",
          storageKey: "generated/local/result.png",
          url: "data:image/png;base64,ZmFrZQ==",
          mimeType: "image/png"
        }
      ]
    });

    await expect(
      createPromptShare({
        actor: otherActor,
        taskId,
        imageUrl: "data:image/png;base64,ZmFrZQ=="
      })
    ).resolves.toBeNull();
  });

  it("makes a local share unavailable after a report", async () => {
    const actor = await resolveActor({
      authUser: null,
      deviceId: `device-${randomUUID()}`,
      ipHash: `ip-${randomUUID()}`
    });
    const taskId = await createTask({ actor, generation: buildGeneration() });
    await markTaskSucceeded({
      taskId,
      actor,
      spendSource: "anonymous",
      assets: [
        {
          assetType: "result",
          storageKey: "generated/local/result.png",
          url: "data:image/png;base64,ZmFrZQ==",
          mimeType: "image/png"
        }
      ]
    });
    const share = await createPromptShare({
      actor,
      taskId,
      imageUrl: "data:image/png;base64,ZmFrZQ=="
    });
    if (!share) {
      throw new Error("Expected local share");
    }

    await expect(reportPromptShare(share.id)).resolves.toBe(true);
    await expect(getPromptShare(share.id)).resolves.toBeNull();
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

  it("counts successful postgres generation tasks for global stats", async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ total: "42" }] } as never);

    await expect(getGlobalGenerationStats()).resolves.toEqual({ totalGenerations: 42 });

    const [sql, values] = mockedQuery.mock.calls[0];
    expect(sql).toContain("from generation_tasks");
    expect(sql).toContain("status = 'succeeded'");
    expect(values).toEqual([]);
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

  it("stores complete postgres failure messages", async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [] } as never);
    const upstreamError = `status_code=400, 参考图解析失败:第 1 张参考图:${"context deadline exceeded ".repeat(80)}complete-tail`;

    await markTaskFailed("task-1", upstreamError);

    const [sql, values] = mockedQuery.mock.calls[0];
    expect(sql).toContain("error_message = $2");
    expect(values).toEqual(["task-1", upstreamError, null, null]);
  });

  it("creates a public share from an owned postgres task result", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "share-public-1",
          prompt: "A blue circle",
          imageUrl: "https://cdn.lumio.games/generated/result.png",
          imageStorageKey: "generated/user-1/task-1/result.png",
          imageMimeType: "image/png",
          createdAt: "2026-04-27T10:00:00.000Z"
        }
      ]
    } as never);

    const share = await createPromptShare({
      actor: buildUserActor("user-1", "device-1"),
      taskId: "00000000-0000-4000-8000-000000000001",
      imageUrl: "https://cdn.lumio.games/generated/result.png"
    });

    expect(share).toMatchObject({
      id: "share-public-1",
      prompt: "A blue circle",
      imageUrl: "https://cdn.lumio.games/generated/result.png"
    });
    const [sql, values] = mockedQuery.mock.calls[0];
    expect(sql).toContain("insert into prompt_shares");
    expect(sql).toContain("t.user_id = $5");
    expect(sql).toContain("a.asset_type = 'result'");
    expect(values).toContain("00000000-0000-4000-8000-000000000001");
    expect(values).toContain("https://cdn.lumio.games/generated/result.png");
    expect(values).toContain("user-1");
  });

  it("reads a public postgres share without actor ownership checks", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "share-public-1",
          prompt: "A blue circle",
          imageUrl: "https://cdn.lumio.games/generated/result.png",
          imageStorageKey: "generated/user-1/task-1/result.png",
          imageMimeType: "image/png",
          createdAt: "2026-04-27T10:00:00.000Z"
        }
      ]
    } as never);

    await expect(getPromptShare("share-public-1")).resolves.toMatchObject({
      id: "share-public-1",
      prompt: "A blue circle",
      imageUrl: "https://cdn.lumio.games/generated/result.png"
    });

    const [sql, values] = mockedQuery.mock.calls[0];
    expect(sql).toContain("from prompt_shares");
    expect(sql).toContain("status = 'active'");
    expect(sql).not.toContain("user_id =");
    expect(values).toEqual(["share-public-1"]);
  });

  it("marks a postgres share as reported so it is unavailable", async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: "share-public-1" }] } as never);

    await expect(reportPromptShare("share-public-1")).resolves.toBe(true);

    const [sql, values] = mockedQuery.mock.calls[0];
    expect(sql).toContain("update prompt_shares");
    expect(sql).toContain("set status = 'reported'");
    expect(sql).toContain("where id = $1 and status = 'active'");
    expect(values).toEqual(["share-public-1"]);
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
