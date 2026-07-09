import { adminQuery, isLocalPreview } from "../db";

export type AdminUserRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  total: number;
  success: number;
  failed: number;
  shares: number;
  lastActive: string | null;
  spendSource: "paid" | "invite" | "login";
  createdAt: string;
};

export type AdminUsersPage = {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminUserDetail = AdminUserRow & {
  inviteCode: string | null;
  paidCredits: number;
  inviteCredits: number;
  deviceCount: number;
  ipCount: number;
  recentTasks: Array<{ id: string; status: string; model: string; provider: string; prompt: string; errorCode: string | null; createdAt: string }>;
  devices: Array<{ fingerprint: string; ipHash: string; lastSeen: string }>;
};

const PAGE_SIZE = 20;

function deriveSpend(paid: number, invite: number): "paid" | "invite" | "login" {
  if (paid > 0) return "paid";
  if (invite > 0) return "invite";
  return "login";
}

const MOCK_USERS: AdminUserRow[] = [
  { id: "u1", email: "designer@163.com", displayName: "设计师老王", total: 2880, success: 2840, failed: 40, shares: 142, lastActive: new Date(Date.now() - 5 * 60000).toISOString(), spendSource: "paid", createdAt: "2025-11-02T00:00:00Z" },
  { id: "u2", email: "whale_user@qq.com", displayName: null, total: 4120, success: 4001, failed: 119, shares: 31, lastActive: new Date(Date.now() - 3600000).toISOString(), spendSource: "paid", createdAt: "2025-09-18T00:00:00Z" },
  { id: "u3", email: "art_lover@qq.com", displayName: "小艺", total: 1240, success: 1228, failed: 12, shares: 98, lastActive: new Date(Date.now() - 2 * 3600000).toISOString(), spendSource: "invite", createdAt: "2026-01-20T00:00:00Z" },
  { id: "u4", email: "neo@gmail.com", displayName: "Neo", total: 860, success: 810, failed: 50, shares: 76, lastActive: new Date(Date.now() - 5 * 3600000).toISOString(), spendSource: "login", createdAt: "2026-03-11T00:00:00Z" },
  { id: "u5", email: "studio.k@gmail.com", displayName: "K Studio", total: 2010, success: 1972, failed: 38, shares: 44, lastActive: new Date(Date.now() - 12 * 3600000).toISOString(), spendSource: "paid", createdAt: "2025-12-05T00:00:00Z" },
  { id: "u6", email: "home.k@qq.com", displayName: "家居K", total: 540, success: 528, failed: 12, shares: 51, lastActive: new Date(Date.now() - 26 * 3600000).toISOString(), spendSource: "invite", createdAt: "2026-02-14T00:00:00Z" }
];

export async function listUsers(params: { search?: string; sort?: string; page?: number }): Promise<AdminUsersPage> {
  const page = Math.max(1, params.page || 1);

  if (isLocalPreview()) {
    const search = (params.search || "").toLowerCase();
    const filtered = search ? MOCK_USERS.filter((u) => (u.email || "").toLowerCase().includes(search)) : MOCK_USERS;
    return { rows: filtered, total: filtered.length, page, pageSize: PAGE_SIZE };
  }

  const sortColumn = params.sort === "recent" ? "last_active" : params.sort === "created" ? "u.created_at" : "total";
  const where = params.search ? `where u.email ilike $1` : "";
  const args = params.search ? [`%${params.search}%`] : [];

  const countResult = await adminQuery<{ total: string }>(`select count(*)::text as total from users u ${where}`, args);
  const total = Number(countResult.rows[0]?.total ?? 0);

  const offset = (page - 1) * PAGE_SIZE;
  const result = await adminQuery<{
    id: string; email: string | null; display_name: string | null; invite_code: string | null;
    created_at: string; total: string; success: string; failed: string; last_active: string | null;
    shares: string; paid_credits: string | null; invite_credits: string | null;
  }>(
    `
      select u.id, u.email, u.display_name, u.invite_code, u.created_at,
        count(t.*) filter (where t.status in ('succeeded','failed'))::text as total,
        count(t.*) filter (where t.status = 'succeeded')::text as success,
        count(t.*) filter (where t.status = 'failed')::text as failed,
        max(t.created_at) as last_active,
        (select count(*) from prompt_shares s where s.user_id = u.id)::text as shares,
        qb.paid_credits::text as paid_credits,
        qb.invite_credits::text as invite_credits
      from users u
      left join generation_tasks t on t.user_id = u.id
      left join quota_balances qb on qb.user_id = u.id
      ${where}
      group by u.id, qb.paid_credits, qb.invite_credits
      order by ${sortColumn} desc nulls last
      limit ${PAGE_SIZE} offset ${offset}
    `,
    args
  );

  return {
    rows: result.rows.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.display_name,
      total: Number(r.total),
      success: Number(r.success),
      failed: Number(r.failed),
      shares: Number(r.shares),
      lastActive: r.last_active,
      spendSource: deriveSpend(Number(r.paid_credits ?? 0), Number(r.invite_credits ?? 0)),
      createdAt: r.created_at
    })),
    total,
    page,
    pageSize: PAGE_SIZE
  };
}

export async function getUserDetail(id: string): Promise<AdminUserDetail | null> {
  if (isLocalPreview()) {
    const base = MOCK_USERS.find((u) => u.id === id) || MOCK_USERS[0];
    return {
      ...base,
      inviteCode: "a3f9c1",
      paidCredits: base.spendSource === "paid" ? 1200 : 0,
      inviteCredits: base.spendSource === "invite" ? 15 : 0,
      deviceCount: 2,
      ipCount: 1,
      recentTasks: [
        { id: "t_a1", status: "succeeded", model: "gpt-image-2", provider: "openai", prompt: "极简北欧客厅渲染", errorCode: null, createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
        { id: "t_a2", status: "succeeded", model: "gpt-image-2", provider: "openai", prompt: "高级美食摄影", errorCode: null, createdAt: new Date(Date.now() - 18 * 60000).toISOString() },
        { id: "t_a3", status: "failed", model: "gemini-2.5-flash-image", provider: "google", prompt: "赛博霓虹街景", errorCode: "provider_error", createdAt: new Date(Date.now() - 42 * 60000).toISOString() }
      ],
      devices: [{ fingerprint: "fp_2c9a1", ipHash: "120.24.x.x", lastSeen: new Date(Date.now() - 5 * 60000).toISOString() }]
    };
  }

  const [userResult, tasksResult, devicesResult] = await Promise.all([
    adminQuery<{
      id: string; email: string | null; display_name: string | null; invite_code: string | null; created_at: string;
      total: string; success: string; failed: string; last_active: string | null; shares: string;
      paid_credits: string | null; invite_credits: string | null; device_count: string; ip_count: string;
    }>(
      `
        select u.id, u.email, u.display_name, u.invite_code, u.created_at,
          count(t.*) filter (where t.status in ('succeeded','failed'))::text as total,
          count(t.*) filter (where t.status = 'succeeded')::text as success,
          count(t.*) filter (where t.status = 'failed')::text as failed,
          max(t.created_at) as last_active,
          (select count(*) from prompt_shares s where s.user_id = u.id)::text as shares,
          qb.paid_credits::text as paid_credits, qb.invite_credits::text as invite_credits,
          (select count(*) from user_device_links l where l.user_id = u.id)::text as device_count,
          (select count(distinct l.ip_hash) from user_device_links l where l.user_id = u.id)::text as ip_count
        from users u
        left join generation_tasks t on t.user_id = u.id
        left join quota_balances qb on qb.user_id = u.id
        where u.id = $1
        group by u.id, qb.paid_credits, qb.invite_credits
      `,
      [id]
    ),
    adminQuery<{ id: string; status: string; model_key: string; provider: string; prompt: string; error_code: string | null; created_at: string }>(
      `select id, status, model_key, provider, prompt, error_code, created_at from generation_tasks where user_id = $1 order by created_at desc limit 10`,
      [id]
    ),
    adminQuery<{ device_fingerprint: string; ip_hash: string; last_seen_at: string }>(
      `select device_fingerprint, ip_hash, last_seen_at from user_device_links where user_id = $1 order by last_seen_at desc limit 10`,
      [id]
    )
  ]);

  const u = userResult.rows[0];
  if (!u) {
    return null;
  }

  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    total: Number(u.total),
    success: Number(u.success),
    failed: Number(u.failed),
    shares: Number(u.shares),
    lastActive: u.last_active,
    spendSource: deriveSpend(Number(u.paid_credits ?? 0), Number(u.invite_credits ?? 0)),
    createdAt: u.created_at,
    inviteCode: u.invite_code,
    paidCredits: Number(u.paid_credits ?? 0),
    inviteCredits: Number(u.invite_credits ?? 0),
    deviceCount: Number(u.device_count ?? 0),
    ipCount: Number(u.ip_count ?? 0),
    recentTasks: tasksResult.rows.map((r) => ({ id: r.id, status: r.status, model: r.model_key, provider: r.provider, prompt: r.prompt, errorCode: r.error_code, createdAt: r.created_at })),
    devices: devicesResult.rows.map((r) => ({ fingerprint: r.device_fingerprint, ipHash: r.ip_hash, lastSeen: r.last_seen_at }))
  };
}
