import type { PoolClient } from "pg";
import { randomUUID } from "crypto";
import { query, transaction } from "./client";
import type { Actor, DbQuotaState } from "./types";
import type { AuthenticatedUser } from "../auth";
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

export async function resolveActor(input: {
  authUser: AuthenticatedUser | null;
  deviceId: string;
  ipHash: string;
}): Promise<Actor> {
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
      JSON.stringify({
        size: input.generation.size,
        quality: input.generation.quality,
        count: input.generation.count,
        references: input.generation.referenceAssets,
        mask: input.generation.maskAsset
      }),
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
  return transaction((client) => insertAsset(client, input));
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

export async function settleInviteReward(inviteeUserId: string): Promise<void> {
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
