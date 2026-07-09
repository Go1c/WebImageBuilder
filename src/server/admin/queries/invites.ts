import { adminQuery, isLocalPreview } from "../db";

export type InviteStatus = "pending" | "rewarded" | "blocked";

export type InviteStats = {
  total: number;
  rewarded: number;
  pending: number;
  blocked: number;
};

export type AdminInviteRow = {
  id: string;
  inviterEmail: string | null;
  inviteeEmail: string | null;
  status: InviteStatus;
  rewardedAt: string | null;
  ipHash: string | null;
  fingerprint: string | null;
  createdAt: string;
};

const MOCK_STATS: InviteStats = { total: 6204, rewarded: 5410, pending: 712, blocked: 82 };

const MOCK_ROWS: AdminInviteRow[] = [
  { id: "iv_9f21", inviterEmail: "designer@163.com", inviteeEmail: "art_lover@qq.com", status: "rewarded", rewardedAt: new Date(Date.now() - 6 * 60000).toISOString(), ipHash: "120.24.x.x", fingerprint: "fp_2c9a1", createdAt: new Date(Date.now() - 8 * 60000).toISOString() },
  { id: "iv_7c1b", inviterEmail: "whale_user@qq.com", inviteeEmail: "neo@gmail.com", status: "rewarded", rewardedAt: new Date(Date.now() - 40 * 60000).toISOString(), ipHash: "58.211.x.x", fingerprint: "fp_88a0c", createdAt: new Date(Date.now() - 52 * 60000).toISOString() },
  { id: "iv_3d8e", inviterEmail: "studio.k@gmail.com", inviteeEmail: "home.k@qq.com", status: "pending", rewardedAt: null, ipHash: "101.89.x.x", fingerprint: "fp_44e0b", createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "iv_1a5f", inviterEmail: "art_lover@qq.com", inviteeEmail: "brush@163.com", status: "pending", rewardedAt: null, ipHash: "223.104.x.x", fingerprint: "fp_09b7c", createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: "iv_4e7d", inviterEmail: "neo@gmail.com", inviteeEmail: "neo.alt@gmail.com", status: "blocked", rewardedAt: null, ipHash: "120.24.x.x 同IP", fingerprint: "fp_2c9a1 同设备", createdAt: new Date(Date.now() - 9 * 3600000).toISOString() },
  { id: "iv_6b2c", inviterEmail: "home.k@qq.com", inviteeEmail: "home.k2@qq.com", status: "blocked", rewardedAt: null, ipHash: "101.89.x.x 同IP", fingerprint: "fp_44e0b 同设备", createdAt: new Date(Date.now() - 26 * 3600000).toISOString() }
];

export async function getInviteStats(): Promise<InviteStats> {
  if (isLocalPreview()) {
    return MOCK_STATS;
  }

  const result = await adminQuery<{ total: string; rewarded: string; pending: string; blocked: string }>(
    `
      select
        count(*)::text as total,
        count(*) filter (where status = 'rewarded')::text as rewarded,
        count(*) filter (where status = 'pending')::text as pending,
        count(*) filter (where status = 'blocked')::text as blocked
      from invites
    `
  );

  const row = result.rows[0];
  return {
    total: Number(row?.total ?? 0),
    rewarded: Number(row?.rewarded ?? 0),
    pending: Number(row?.pending ?? 0),
    blocked: Number(row?.blocked ?? 0)
  };
}

export async function listInvites(params: { status?: string }): Promise<AdminInviteRow[]> {
  const status = params.status === "rewarded" || params.status === "pending" || params.status === "blocked" ? params.status : "all";

  if (isLocalPreview()) {
    return status === "all" ? MOCK_ROWS : MOCK_ROWS.filter((r) => r.status === status);
  }

  const args: unknown[] = [];
  let where = "";
  if (status !== "all") {
    args.push(status);
    where = `where i.status = $${args.length}`;
  }

  const result = await adminQuery<{
    id: string; inviter_email: string | null; invitee_email: string | null; status: InviteStatus;
    rewarded_at: string | null; invitee_ip_hash: string | null; invitee_device_fingerprint: string | null; created_at: string;
  }>(
    `
      select i.id, iu.email as inviter_email, vu.email as invitee_email, i.status,
        i.rewarded_at, i.invitee_ip_hash, i.invitee_device_fingerprint, i.created_at
      from invites i
      left join users iu on iu.id = i.inviter_user_id
      left join users vu on vu.id = i.invitee_user_id
      ${where}
      order by i.created_at desc
      limit 100
    `,
    args
  );

  return result.rows.map((r) => ({
    id: r.id,
    inviterEmail: r.inviter_email,
    inviteeEmail: r.invitee_email,
    status: r.status,
    rewardedAt: r.rewarded_at,
    ipHash: r.invitee_ip_hash,
    fingerprint: r.invitee_device_fingerprint,
    createdAt: r.created_at
  }));
}
