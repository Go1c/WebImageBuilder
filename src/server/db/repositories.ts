import type { PoolClient } from "pg";
import { randomUUID } from "crypto";
import { query, transaction } from "./client";
import type { Actor, DbQuotaState } from "./types";
import type { AuthenticatedUser } from "../auth";
import { getAppConfig } from "../config";
import { getQuotaConfig } from "../domain/quota";
import type { NormalizedGenerationInput } from "../domain/models";
import type { SpendSource } from "../domain/quota";

type AssetInput = {
  taskId?: string;
  userId?: string | null;
  anonymousDeviceId?: string | null;
  assetType: "reference" | "mask" | "result";
  storageKey: string;
  url: string;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
};

type LocalTask = {
  id: string;
  actor: Actor;
  generation: NormalizedGenerationInput;
  status: "running" | "succeeded" | "failed";
  errorMessage: string | null;
  spendSource: SpendSource | null;
  assets: Array<AssetInput & { id: string }>;
  createdAt: string;
  updatedAt: string;
};

type LocalSession = {
  id: string;
  actor: Actor;
  title: string;
  palette: string[];
  createdAt: string;
  updatedAt: string;
  lastTaskAt: string | null;
};

type LocalQuotaBalance = {
  loginUsed: number;
  inviteCredits: number;
  paidCredits: number;
};

type LocalRepository = {
  sessions: LocalSession[];
  tasks: LocalTask[];
  userBalances: Map<string, LocalQuotaBalance>;
};

export type SessionRecord = {
  id: string;
  title: string;
  description: string | null;
  palette: string[];
  coverImageUrl: string | null;
  recentImages: string[];
  taskCount: number;
  lastTaskAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SessionTaskRecord = {
  id: string;
  mode: string;
  modelKey: string;
  provider: string;
  prompt: string;
  params: Record<string, unknown>;
  status: string;
  createdAt: string;
  assets: Array<{
    id: string;
    type: string;
    url: string;
    width: number | null;
    height: number | null;
  }>;
};

declare global {
  // eslint-disable-next-line no-var
  var lumioLocalRepository: LocalRepository | undefined;
}

function shouldUseLocalRepository(): boolean {
  const config = getAppConfig();
  return config.localMode && !config.databaseUrl;
}

function getLocalRepository(): LocalRepository {
  if (!globalThis.lumioLocalRepository) {
    globalThis.lumioLocalRepository = {
      sessions: [],
      tasks: [],
      userBalances: new Map()
    };
  }

  return globalThis.lumioLocalRepository;
}

export async function resolveActor(input: {
  authUser: AuthenticatedUser | null;
  deviceId: string;
  ipHash: string;
}): Promise<Actor> {
  if (shouldUseLocalRepository()) {
    if (input.authUser) {
      return {
        type: "user",
        userId: `local-user-${input.authUser.externalUserId}`,
        externalUserId: input.authUser.externalUserId,
        deviceId: input.deviceId,
        ipHash: input.ipHash
      };
    }

    return {
      type: "anonymous",
      anonymousDeviceId: `local-anon-${input.deviceId}`,
      deviceId: input.deviceId,
      ipHash: input.ipHash
    };
  }

  if (input.authUser) {
    const result = await query<{ id: string }>(
      `
        insert into users (external_user_id, email, display_name)
        values ($1, $2, $3)
        on conflict (external_user_id)
        do update set email = excluded.email, display_name = excluded.display_name, updated_at = now()
        returning id
      `,
      [input.authUser.externalUserId, input.authUser.email ?? null, input.authUser.name ?? null]
    );
    const userId = result.rows[0].id;

    await query(
      `
        insert into user_device_links (user_id, device_fingerprint, ip_hash)
        values ($1, $2, $3)
        on conflict (user_id, device_fingerprint)
        do update set ip_hash = excluded.ip_hash, last_seen_at = now()
      `,
      [userId, input.deviceId, input.ipHash]
    );

    return {
      type: "user",
      userId,
      externalUserId: input.authUser.externalUserId,
      deviceId: input.deviceId,
      ipHash: input.ipHash
    };
  }

  const result = await query<{ id: string }>(
    `
      insert into anonymous_devices (device_fingerprint, ip_hash)
      values ($1, $2)
      on conflict (device_fingerprint)
      do update set ip_hash = excluded.ip_hash, last_seen_at = now()
      returning id
    `,
    [input.deviceId, input.ipHash]
  );

  return {
    type: "anonymous",
    anonymousDeviceId: result.rows[0].id,
    deviceId: input.deviceId,
    ipHash: input.ipHash
  };
}

export async function getQuotaState(actor: Actor): Promise<DbQuotaState> {
  if (shouldUseLocalRepository()) {
    const store = getLocalRepository();
    const today = new Date().toISOString().slice(0, 10);
    const ipDailyUsed = store.tasks.filter(
      (task) =>
        task.actor.type === "anonymous" &&
        task.actor.ipHash === actor.ipHash &&
        task.createdAt.slice(0, 10) === today
    ).length;

    if (actor.type === "anonymous") {
      return {
        actorType: "anonymous",
        anonymousUsed: store.tasks.filter(
          (task) =>
            task.actor.type === "anonymous" &&
            task.actor.anonymousDeviceId === actor.anonymousDeviceId &&
            task.status === "succeeded"
        ).length,
        loginUsed: 0,
        inviteCredits: 0,
        paidCredits: 0,
        ipDailyUsed
      };
    }

    const balance = getLocalUserBalance(actor.userId);
    return {
      actorType: "user",
      anonymousUsed: 0,
      loginUsed: balance.loginUsed,
      inviteCredits: balance.inviteCredits,
      paidCredits: balance.paidCredits,
      ipDailyUsed
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const ipResult = await query<{ count: string }>(
    `
      select count(*)::text as count
      from generation_tasks
      where ip_hash = $1
        and actor_type = 'anonymous'
        and created_at >= $2::date
        and created_at < ($2::date + interval '1 day')
    `,
    [actor.ipHash, today]
  );

  if (actor.type === "anonymous") {
    const usage = await query<{ used: string }>(
      `
        select count(*)::text as used
        from generation_tasks
        where anonymous_device_id = $1
          and status = 'succeeded'
      `,
      [actor.anonymousDeviceId]
    );

    return {
      actorType: "anonymous",
      anonymousUsed: Number(usage.rows[0]?.used ?? 0),
      loginUsed: 0,
      inviteCredits: 0,
      paidCredits: 0,
      ipDailyUsed: Number(ipResult.rows[0]?.count ?? 0)
    };
  }

  await query(
    `
      insert into quota_balances (user_id)
      values ($1)
      on conflict (user_id) do nothing
    `,
    [actor.userId]
  );

  const usage = await query<{
    login_used: number | null;
    invite_credits: number | null;
    paid_credits: number | null;
  }>(
    `
      select login_used, invite_credits, paid_credits
      from quota_balances
      where user_id = $1
    `,
    [actor.userId]
  );

  const row = usage.rows[0];
  return {
    actorType: "user",
    anonymousUsed: 0,
    loginUsed: Number(row?.login_used ?? 0),
    inviteCredits: Number(row?.invite_credits ?? 0),
    paidCredits: Number(row?.paid_credits ?? 0),
    ipDailyUsed: Number(ipResult.rows[0]?.count ?? 0)
  };
}

export async function createTask(input: {
  actor: Actor;
  generation: NormalizedGenerationInput;
}): Promise<string> {
  const id = randomUUID();
  if (shouldUseLocalRepository()) {
    const now = new Date().toISOString();
    getLocalRepository().tasks.unshift({
      id,
      actor: input.actor,
      generation: input.generation,
      status: "running",
      errorMessage: null,
      spendSource: null,
      assets: [],
      createdAt: now,
      updatedAt: now
    });

    if (input.generation.sessionId) {
      const session = findLocalSession(input.actor, input.generation.sessionId);
      if (session) {
        session.lastTaskAt = now;
        session.updatedAt = now;
      }
    }
    return id;
  }

  await query(
    `
      insert into generation_tasks (
        id, actor_type, user_id, anonymous_device_id, session_id, ip_hash,
        mode, model_key, provider, provider_model, prompt, params, status, result_count
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'running', $13)
    `,
    [
      id,
      input.actor.type,
      input.actor.type === "user" ? input.actor.userId : null,
      input.actor.type === "anonymous" ? input.actor.anonymousDeviceId : null,
      input.generation.sessionId ?? null,
      input.actor.ipHash,
      input.generation.mode,
      input.generation.model,
      input.generation.provider,
      input.generation.providerModel,
      input.generation.prompt,
      JSON.stringify(buildGenerationParams(input.generation)),
      input.generation.count
    ]
  );

  return id;
}

export async function markTaskSucceeded(input: {
  taskId: string;
  actor: Actor;
  spendSource: SpendSource;
  assets: AssetInput[];
}): Promise<void> {
  if (shouldUseLocalRepository()) {
    const task = findLocalTask(input.actor, input.taskId);
    if (task) {
      task.status = "succeeded";
      task.spendSource = input.spendSource;
      task.updatedAt = new Date().toISOString();
      task.assets = input.assets.map((asset) => ({
        ...asset,
        id: randomUUID(),
        taskId: input.taskId,
        userId: input.actor.type === "user" ? input.actor.userId : null,
        anonymousDeviceId:
          input.actor.type === "anonymous" ? input.actor.anonymousDeviceId : null
      }));
    }

    if (input.actor.type === "user") {
      const balance = getLocalUserBalance(input.actor.userId);
      if (input.spendSource === "login") {
        balance.loginUsed += 1;
      } else if (input.spendSource === "invite") {
        balance.inviteCredits = Math.max(0, balance.inviteCredits - 1);
      } else if (input.spendSource === "paid") {
        balance.paidCredits = Math.max(0, balance.paidCredits - 1);
      }
    }
    return;
  }

  await transaction(async (client) => {
    await client.query(
      `
        update generation_tasks
        set status = 'succeeded', spend_source = $2, updated_at = now()
        where id = $1
      `,
      [input.taskId, input.spendSource]
    );

    for (const asset of input.assets) {
      await insertAsset(client, {
        ...asset,
        taskId: input.taskId,
        userId: input.actor.type === "user" ? input.actor.userId : null,
        anonymousDeviceId:
          input.actor.type === "anonymous" ? input.actor.anonymousDeviceId : null
      });
    }

    if (input.actor.type === "user") {
      await client.query(
        `
          insert into quota_balances (user_id)
          values ($1)
          on conflict (user_id) do nothing
        `,
        [input.actor.userId]
      );

      if (input.spendSource === "login") {
        await client.query(
          "update quota_balances set login_used = login_used + 1, updated_at = now() where user_id = $1",
          [input.actor.userId]
        );
      } else if (input.spendSource === "invite") {
        await client.query(
          "update quota_balances set invite_credits = greatest(invite_credits - 1, 0), updated_at = now() where user_id = $1",
          [input.actor.userId]
        );
      } else if (input.spendSource === "paid") {
        await client.query(
          "update quota_balances set paid_credits = greatest(paid_credits - 1, 0), updated_at = now() where user_id = $1",
          [input.actor.userId]
        );
      }
    }
  });
}

export async function markTaskFailed(taskId: string, message: string): Promise<void> {
  if (shouldUseLocalRepository()) {
    const task = getLocalRepository().tasks.find((item) => item.id === taskId);
    if (task) {
      task.status = "failed";
      task.errorMessage = message.slice(0, 1000);
      task.updatedAt = new Date().toISOString();
    }
    return;
  }

  await query(
    `
      update generation_tasks
      set status = 'failed', error_message = $2, updated_at = now()
      where id = $1
    `,
    [taskId, message.slice(0, 1000)]
  );
}

export async function listHistory(actor: Actor): Promise<unknown[]> {
  if (shouldUseLocalRepository()) {
    return getLocalRepository().tasks.filter((task) => ownsLocalTask(actor, task)).map(localTaskToRow);
  }

  const ownerClause =
    actor.type === "user" ? "user_id = $1" : "anonymous_device_id = $1";
  const ownerId = actor.type === "user" ? actor.userId : actor.anonymousDeviceId;

  const result = await query(
    `
      select
        t.id,
        t.mode,
        t.model_key as "modelKey",
        t.provider,
        t.prompt,
        t.status,
        t.error_message as "errorMessage",
        t.result_count as "resultCount",
        t.created_at as "createdAt",
        coalesce(
          json_agg(
            json_build_object(
              'id', a.id,
              'type', a.asset_type,
              'url', a.url,
              'width', a.width,
              'height', a.height
            )
          ) filter (where a.id is not null),
          '[]'
        ) as assets
      from generation_tasks t
      left join assets a on a.task_id = t.id
      where t.${ownerClause}
      group by t.id
      order by t.created_at desc
      limit 50
    `,
    [ownerId]
  );

  return result.rows;
}

export async function getTask(actor: Actor, taskId: string): Promise<unknown | null> {
  if (shouldUseLocalRepository()) {
    const task = findLocalTask(actor, taskId);
    return task ? localTaskToRow(task) : null;
  }

  const ownerClause =
    actor.type === "user" ? "t.user_id = $2" : "t.anonymous_device_id = $2";
  const ownerId = actor.type === "user" ? actor.userId : actor.anonymousDeviceId;
  const result = await query(
    `
      select
        t.id,
        t.mode,
        t.model_key as "modelKey",
        t.provider,
        t.prompt,
        t.status,
        t.error_message as "errorMessage",
        t.created_at as "createdAt",
        coalesce(
          json_agg(
            json_build_object(
              'id', a.id,
              'type', a.asset_type,
              'url', a.url,
              'width', a.width,
              'height', a.height
            )
          ) filter (where a.id is not null),
          '[]'
        ) as assets
      from generation_tasks t
      left join assets a on a.task_id = t.id
      where t.id = $1 and ${ownerClause}
      group by t.id
    `,
    [taskId, ownerId]
  );

  return result.rows[0] ?? null;
}

export async function recordUploadedAsset(input: AssetInput): Promise<string> {
  if (shouldUseLocalRepository()) {
    return randomUUID();
  }

  return transaction((client) => insertAsset(client, input));
}

export async function createSession(input: {
  actor: Actor;
  title?: string;
}): Promise<SessionRecord> {
  const now = new Date().toISOString();
  const title = input.title?.trim() || "未命名项目";

  if (shouldUseLocalRepository()) {
    const session: LocalSession = {
      id: randomUUID(),
      actor: input.actor,
      title,
      palette: [],
      createdAt: now,
      updatedAt: now,
      lastTaskAt: null
    };
    getLocalRepository().sessions.unshift(session);
    return localSessionToRow(input.actor, session);
  }

  const result = await query<{
    id: string;
    title: string;
    palette: string[] | null;
    createdAt: string;
    updatedAt: string;
  }>(
    `
      insert into sessions (user_id, anonymous_device_id, title)
      values ($1, $2, $3)
      returning
        id,
        title,
        palette,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      input.actor.type === "user" ? input.actor.userId : null,
      input.actor.type === "anonymous" ? input.actor.anonymousDeviceId : null,
      title
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    title: row.title,
    description: null,
    palette: row.palette ?? [],
    coverImageUrl: null,
    recentImages: [],
    taskCount: 0,
    lastTaskAt: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function listSessions(actor: Actor): Promise<SessionRecord[]> {
  if (shouldUseLocalRepository()) {
    return getLocalRepository()
      .sessions.filter((session) => ownsLocalSession(actor, session))
      .map((session) => localSessionToRow(actor, session))
      .sort((a, b) => {
        const aTime = a.lastTaskAt ?? a.updatedAt;
        const bTime = b.lastTaskAt ?? b.updatedAt;
        return bTime.localeCompare(aTime);
      });
  }

  const ownerColumn = actor.type === "user" ? "user_id" : "anonymous_device_id";
  const ownerId = actor.type === "user" ? actor.userId : actor.anonymousDeviceId;
  const result = await query<SessionRecord>(
    `
      select
        s.id,
        s.title,
        null::text as description,
        coalesce(s.palette, '{}') as palette,
        cover.url as "coverImageUrl",
        coalesce(
          array_remove(array_agg(a.url order by a.created_at desc), null),
          '{}'
        ) as "recentImages",
        count(distinct t.id)::int as "taskCount",
        max(t.created_at) as "lastTaskAt",
        s.created_at as "createdAt",
        s.updated_at as "updatedAt"
      from sessions s
      left join generation_tasks t on t.session_id = s.id and t.status = 'succeeded'
      left join assets a on a.task_id = t.id and a.asset_type = 'result'
      left join assets cover on cover.id = s.cover_asset_id
      where s.${ownerColumn} = $1
      group by s.id, s.title, s.palette, cover.url, s.created_at, s.updated_at
      order by coalesce(max(t.created_at), s.updated_at) desc
    `,
    [ownerId]
  );

  return result.rows;
}

export async function getSession(actor: Actor, sessionId: string): Promise<SessionRecord | null> {
  if (shouldUseLocalRepository()) {
    const session = findLocalSession(actor, sessionId);
    return session ? localSessionToRow(actor, session) : null;
  }

  const ownerColumn = actor.type === "user" ? "user_id" : "anonymous_device_id";
  const ownerId = actor.type === "user" ? actor.userId : actor.anonymousDeviceId;
  const result = await query<SessionRecord>(
    `
      select
        s.id,
        s.title,
        null::text as description,
        coalesce(s.palette, '{}') as palette,
        cover.url as "coverImageUrl",
        coalesce(
          array_remove(array_agg(a.url order by a.created_at desc), null),
          '{}'
        ) as "recentImages",
        count(distinct t.id)::int as "taskCount",
        max(t.created_at) as "lastTaskAt",
        s.created_at as "createdAt",
        s.updated_at as "updatedAt"
      from sessions s
      left join generation_tasks t on t.session_id = s.id and t.status = 'succeeded'
      left join assets a on a.task_id = t.id and a.asset_type = 'result'
      left join assets cover on cover.id = s.cover_asset_id
      where s.id = $1 and s.${ownerColumn} = $2
      group by s.id, s.title, s.palette, cover.url, s.created_at, s.updated_at
    `,
    [sessionId, ownerId]
  );

  return result.rows[0] ?? null;
}

export async function updateSession(input: {
  actor: Actor;
  sessionId: string;
  title?: string;
  palette?: string[];
}): Promise<SessionRecord | null> {
  const title = input.title?.trim();
  const palette = input.palette?.filter((color) => /^#[0-9a-f]{6}$/i.test(color)).slice(0, 8);

  if (shouldUseLocalRepository()) {
    const session = findLocalSession(input.actor, input.sessionId);
    if (!session) {
      return null;
    }
    if (title) {
      session.title = title;
    }
    if (palette) {
      session.palette = palette;
    }
    session.updatedAt = new Date().toISOString();
    return localSessionToRow(input.actor, session);
  }

  const ownerColumn = input.actor.type === "user" ? "user_id" : "anonymous_device_id";
  const ownerId = input.actor.type === "user" ? input.actor.userId : input.actor.anonymousDeviceId;
  await query(
    `
      update sessions
      set
        title = coalesce($3, title),
        palette = coalesce($4, palette),
        updated_at = now()
      where id = $1 and ${ownerColumn} = $2
    `,
    [input.sessionId, ownerId, title ?? null, palette ?? null]
  );

  return getSession(input.actor, input.sessionId);
}

export async function listSessionTasks(
  actor: Actor,
  sessionId: string
): Promise<SessionTaskRecord[]> {
  if (shouldUseLocalRepository()) {
    return getLocalRepository()
      .tasks.filter((task) => ownsLocalTask(actor, task) && task.generation.sessionId === sessionId)
      .map(localTaskToSessionTask)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const ownerColumn = actor.type === "user" ? "user_id" : "anonymous_device_id";
  const ownerId = actor.type === "user" ? actor.userId : actor.anonymousDeviceId;
  const result = await query<SessionTaskRecord>(
    `
      select
        t.id,
        t.mode,
        t.model_key as "modelKey",
        t.provider,
        t.prompt,
        t.params,
        t.status,
        t.created_at as "createdAt",
        coalesce(
          json_agg(
            json_build_object(
              'id', a.id,
              'type', a.asset_type,
              'url', a.url,
              'width', a.width,
              'height', a.height
            ) order by a.created_at
          ) filter (where a.id is not null),
          '[]'
        ) as assets
      from generation_tasks t
      left join assets a on a.task_id = t.id
      where t.session_id = $1 and t.${ownerColumn} = $2 and t.status = 'succeeded'
      group by t.id
      order by t.created_at desc
      limit 200
    `,
    [sessionId, ownerId]
  );

  return result.rows;
}

async function insertAsset(client: PoolClient, input: AssetInput): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      insert into assets (
        task_id, user_id, anonymous_device_id, asset_type,
        storage_key, url, mime_type, width, height
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning id
    `,
    [
      input.taskId ?? null,
      input.userId ?? null,
      input.anonymousDeviceId ?? null,
      input.assetType,
      input.storageKey,
      input.url,
      input.mimeType ?? null,
      input.width ?? null,
      input.height ?? null
    ]
  );

  return result.rows[0].id;
}

export async function claimInvite(input: {
  inviteCode: string;
  inviteeUserId: string;
  deviceFingerprint: string;
  ipHash: string;
}): Promise<void> {
  if (shouldUseLocalRepository()) {
    return;
  }

  await query(
    `
      insert into invites (
        invite_code, inviter_user_id, invitee_user_id, invitee_device_fingerprint, invitee_ip_hash, status
      )
      select
        $1,
        u.id,
        $2,
        $3,
        $4,
        case when abuse.user_id is null then 'pending' else 'blocked' end
      from users u
      left join user_device_links abuse
        on abuse.user_id = u.id
       and (abuse.device_fingerprint = $3 or abuse.ip_hash = $4)
      where u.invite_code = $1 and u.id <> $2
      on conflict (invitee_user_id) do nothing
    `,
    [input.inviteCode, input.inviteeUserId, input.deviceFingerprint, input.ipHash]
  );
}

export async function getUserInviteCode(userId: string): Promise<string | null> {
  if (shouldUseLocalRepository()) {
    return `local-${hashString(userId)}`;
  }

  const result = await query<{ invite_code: string }>(
    "select invite_code from users where id = $1",
    [userId]
  );

  return result.rows[0]?.invite_code ?? null;
}

export async function settleInviteReward(inviteeUserId: string): Promise<void> {
  if (shouldUseLocalRepository()) {
    return;
  }

  const config = getQuotaConfig();
  await query(
    `
      with eligible as (
        update invites
        set status = 'rewarded', rewarded_at = now()
        where invitee_user_id = $1 and status = 'pending'
        returning inviter_user_id
      )
      insert into quota_balances (user_id, invite_credits)
      select inviter_user_id, $2
      from eligible
      on conflict (user_id)
      do update set
        invite_credits = quota_balances.invite_credits + excluded.invite_credits,
        updated_at = now()
    `,
    [inviteeUserId, config.inviteRewardGenerations]
  );
}

function getLocalUserBalance(userId: string): LocalQuotaBalance {
  const store = getLocalRepository();
  let balance = store.userBalances.get(userId);
  if (!balance) {
    balance = {
      loginUsed: 0,
      inviteCredits: 0,
      paidCredits: 0
    };
    store.userBalances.set(userId, balance);
  }

  return balance;
}

function ownsLocalTask(actor: Actor, task: LocalTask): boolean {
  if (actor.type === "user") {
    return task.actor.type === "user" && task.actor.userId === actor.userId;
  }

  return (
    task.actor.type === "anonymous" &&
    task.actor.anonymousDeviceId === actor.anonymousDeviceId
  );
}

function findLocalTask(actor: Actor, taskId: string): LocalTask | undefined {
  return getLocalRepository().tasks.find((task) => task.id === taskId && ownsLocalTask(actor, task));
}

function ownsLocalSession(actor: Actor, session: LocalSession): boolean {
  if (actor.type === "user") {
    return session.actor.type === "user" && session.actor.userId === actor.userId;
  }

  return (
    session.actor.type === "anonymous" &&
    session.actor.anonymousDeviceId === actor.anonymousDeviceId
  );
}

function findLocalSession(actor: Actor, sessionId: string): LocalSession | undefined {
  return getLocalRepository().sessions.find(
    (session) => session.id === sessionId && ownsLocalSession(actor, session)
  );
}

function hashString(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function buildGenerationParams(generation: NormalizedGenerationInput): Record<string, unknown> {
  return {
    size: generation.size,
    quality: generation.quality,
    count: generation.count,
    references: generation.referenceAssets,
    mask: generation.maskAsset,
    seed: generation.seed ?? null,
    cfg: generation.cfg ?? null,
    steps: generation.steps ?? null,
    negativePrompt: generation.negativePrompt ?? null
  };
}

function localTaskToRow(task: LocalTask): unknown {
  return {
    id: task.id,
    mode: task.generation.mode,
    modelKey: task.generation.model,
    provider: task.generation.provider,
    prompt: task.generation.prompt,
    status: task.status,
    errorMessage: task.errorMessage,
    resultCount: task.generation.count,
    createdAt: task.createdAt,
    assets: task.assets.map((asset) => ({
      id: asset.id,
      type: asset.assetType,
      url: asset.url,
      width: asset.width ?? null,
      height: asset.height ?? null
    }))
  };
}

function localTaskToSessionTask(task: LocalTask): SessionTaskRecord {
  return {
    id: task.id,
    mode: task.generation.mode,
    modelKey: task.generation.model,
    provider: task.generation.provider,
    prompt: task.generation.prompt,
    params: buildGenerationParams(task.generation),
    status: task.status,
    createdAt: task.createdAt,
    assets: task.assets.map((asset) => ({
      id: asset.id,
      type: asset.assetType,
      url: asset.url,
      width: asset.width ?? null,
      height: asset.height ?? null
    }))
  };
}

function localSessionToRow(actor: Actor, session: LocalSession): SessionRecord {
  const tasks = getLocalRepository()
    .tasks.filter((task) => ownsLocalTask(actor, task) && task.generation.sessionId === session.id);
  const recentImages = tasks
    .flatMap((task) =>
      task.assets
        .filter((asset) => asset.assetType === "result")
        .map((asset) => asset.url)
    )
    .slice(0, 6);

  return {
    id: session.id,
    title: session.title,
    description: null,
    palette: session.palette,
    coverImageUrl: recentImages[0] ?? null,
    recentImages,
    taskCount: tasks.length,
    lastTaskAt: session.lastTaskAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}
