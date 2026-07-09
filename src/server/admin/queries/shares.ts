import { adminQuery, isLocalPreview } from "../db";

export type AdminShareRow = {
  id: string;
  prompt: string;
  email: string | null;
  actorType: string;
  status: string;
  reportCount: number;
  imageUrl: string;
  createdAt: string;
};

export type AdminShareRankRow = {
  userId: string;
  email: string | null;
  shares: number;
  reported: number;
  lastShare: string;
};

const MOCK_SHARES: AdminShareRow[] = [
  { id: "sh_9f2a10", prompt: "极简北欧风客厅，柔和自然光，杂志级室内摄影", email: "designer@163.com", actorType: "user", status: "reported", reportCount: 3, imageUrl: "https://picsum.photos/seed/sh1/400", createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: "sh_7c1b44", prompt: "赛博朋克霓虹街景，雨夜，电影感构图", email: "art_lover@qq.com", actorType: "user", status: "active", reportCount: 0, imageUrl: "https://picsum.photos/seed/sh2/400", createdAt: new Date(Date.now() - 40 * 60000).toISOString() },
  { id: "sh_3d8e77", prompt: "高级美食摄影，日式怀石料理，暗调背景", email: null, actorType: "anonymous", status: "active", reportCount: 0, imageUrl: "https://picsum.photos/seed/sh3/400", createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "sh_1a5f09", prompt: "不良内容示例，已被管理员下架处理", email: "neo@gmail.com", actorType: "user", status: "removed", reportCount: 6, imageUrl: "https://picsum.photos/seed/sh4/400", createdAt: new Date(Date.now() - 6 * 3600000).toISOString() },
  { id: "sh_4e7d21", prompt: "梦幻森林精灵，柔光粒子，插画风", email: "studio.k@gmail.com", actorType: "user", status: "active", reportCount: 0, imageUrl: "https://picsum.photos/seed/sh5/400", createdAt: new Date(Date.now() - 26 * 3600000).toISOString() },
  { id: "sh_88f2aa", prompt: "复古胶片质感人像，暖色调，浅景深", email: "home.k@qq.com", actorType: "user", status: "active", reportCount: 1, imageUrl: "https://picsum.photos/seed/sh6/400", createdAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString() }
];

const MOCK_RANK: AdminShareRankRow[] = [
  { userId: "u1", email: "designer@163.com", shares: 142, reported: 3, lastShare: new Date(Date.now() - 12 * 60000).toISOString() },
  { userId: "u3", email: "art_lover@qq.com", shares: 98, reported: 1, lastShare: new Date(Date.now() - 40 * 60000).toISOString() },
  { userId: "u4", email: "neo@gmail.com", shares: 76, reported: 6, lastShare: new Date(Date.now() - 6 * 3600000).toISOString() },
  { userId: "u6", email: "home.k@qq.com", shares: 51, reported: 1, lastShare: new Date(Date.now() - 3 * 24 * 3600000).toISOString() },
  { userId: "u5", email: "studio.k@gmail.com", shares: 44, reported: 0, lastShare: new Date(Date.now() - 26 * 3600000).toISOString() },
  { userId: "u2", email: "whale_user@qq.com", shares: 31, reported: 0, lastShare: new Date(Date.now() - 2 * 24 * 3600000).toISOString() }
];

export async function listShares(params: { status?: string; days?: number }): Promise<{ rows: AdminShareRow[] }> {
  const status = params.status || "all";
  const days = params.days === undefined ? 7 : params.days;

  if (isLocalPreview()) {
    let rows = MOCK_SHARES;
    if (status !== "all") {
      rows = rows.filter((r) => r.status === status);
    }
    rows = [...rows].sort((a, b) => {
      const ra = a.status === "reported" ? 1 : 0;
      const rb = b.status === "reported" ? 1 : 0;
      if (ra !== rb) return rb - ra;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return { rows };
  }

  const conditions: string[] = [];
  const args: unknown[] = [];
  if (status !== "all") {
    args.push(status);
    conditions.push(`s.status = $${args.length}`);
  }
  if (days > 0) {
    args.push(`${days} days`);
    conditions.push(`s.created_at >= now() - ($${args.length})::interval`);
  }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const result = await adminQuery<{
    id: string; prompt: string; email: string | null; actor_type: string; status: string;
    report_count: string; image_url: string; created_at: string;
  }>(
    `
      select s.id, s.prompt, u.email, s.actor_type, s.status,
        s.report_count::text as report_count, s.image_url, s.created_at
      from prompt_shares s
      left join users u on u.id = s.user_id
      ${where}
      order by (s.status = 'reported') desc, s.created_at desc
      limit 200
    `,
    args
  );

  return {
    rows: result.rows.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      email: r.email,
      actorType: r.actor_type,
      status: r.status,
      reportCount: Number(r.report_count),
      imageUrl: r.image_url,
      createdAt: r.created_at
    }))
  };
}

export async function listShareRanking(): Promise<AdminShareRankRow[]> {
  if (isLocalPreview()) {
    return MOCK_RANK;
  }

  const result = await adminQuery<{
    user_id: string; email: string | null; shares: string; reported: string; last_share: string;
  }>(
    `
      select s.user_id, u.email,
        count(*)::text as shares,
        count(*) filter (where s.status = 'reported')::text as reported,
        max(s.created_at) as last_share
      from prompt_shares s
      left join users u on u.id = s.user_id
      where s.user_id is not null
      group by s.user_id, u.email
      order by shares desc
      limit 20
    `,
    []
  );

  return result.rows.map((r) => ({
    userId: r.user_id,
    email: r.email,
    shares: Number(r.shares),
    reported: Number(r.reported),
    lastShare: r.last_share
  }));
}

export async function takedownShare(id: string): Promise<boolean> {
  if (isLocalPreview()) {
    return MOCK_SHARES.some((r) => r.id === id);
  }
  const result = await adminQuery(`update prompt_shares set status = 'removed' where id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function restoreShare(id: string): Promise<boolean> {
  if (isLocalPreview()) {
    return MOCK_SHARES.some((r) => r.id === id);
  }
  const result = await adminQuery(`update prompt_shares set status = 'active' where id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
