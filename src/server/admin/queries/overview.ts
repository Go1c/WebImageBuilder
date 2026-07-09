import { adminQuery, isLocalPreview } from "../db";

export type PendingCounts = { shares: number; safety: number; errors: number };

export type OverviewData = {
  todaySuccess: number;
  todayTotal: number;
  totalUsers: number;
  newUsersToday: number;
  activeUsersToday: number;
  pending: PendingCounts;
  trend: Array<{ day: string; success: number; failed: number }>;
  models: Array<{ model: string; count: number }>;
};

const CONTENT_SAFETY_CODES = ["content_policy_violation", "content_policy", "safety", "content_filter"];

export async function getPendingCounts(): Promise<PendingCounts> {
  if (isLocalPreview()) {
    return { shares: 7, safety: 3, errors: 12 };
  }

  const result = await adminQuery<{ shares: string; safety: string; errors: string }>(
    `
      select
        (select count(*) from prompt_shares where status = 'reported')::text as shares,
        (select count(*) from generation_tasks
           where status = 'failed'
             and created_at >= now() - interval '7 days'
             and error_code = any($1))::text as safety,
        (select count(*) from generation_tasks
           where status = 'failed' and created_at >= date_trunc('day', now()))::text as errors
    `,
    [CONTENT_SAFETY_CODES]
  );
  const row = result.rows[0];
  return {
    shares: Number(row?.shares ?? 0),
    safety: Number(row?.safety ?? 0),
    errors: Number(row?.errors ?? 0)
  };
}

export async function getOverview(): Promise<OverviewData> {
  if (isLocalPreview()) {
    const base = [3100, 3320, 3010, 3600, 3900, 3720, 4050, 3880, 4200, 4010, 4380, 4120, 3960, 4182];
    const fails = [140, 120, 180, 95, 110, 160, 88, 130, 102, 145, 90, 120, 175, 138];
    return {
      todaySuccess: 4182,
      todayTotal: 4320,
      totalUsers: 28940,
      newUsersToday: 213,
      activeUsersToday: 1876,
      pending: { shares: 7, safety: 3, errors: 12 },
      trend: base.map((success, i) => ({ day: `D-${13 - i}`, success, failed: fails[i] })),
      models: [
        { model: "gpt-image-2", count: 18240 },
        { model: "gemini-2.5-flash-image", count: 7980 },
        { model: "gpt-image-2 · edit", count: 1710 },
        { model: "其它", count: 570 }
      ]
    };
  }

  const [totals, users, trend, models, pending] = await Promise.all([
    adminQuery<{ today_success: string; today_total: string }>(
      `
        select
          count(*) filter (where status = 'succeeded')::text as today_success,
          count(*)::text as today_total
        from generation_tasks
        where created_at >= date_trunc('day', now())
      `
    ),
    adminQuery<{ total: string; new_today: string; active_today: string }>(
      `
        select
          (select count(*) from users)::text as total,
          (select count(*) from users where created_at >= date_trunc('day', now()))::text as new_today,
          (select count(distinct user_id) from generation_tasks
             where user_id is not null and created_at >= date_trunc('day', now()))::text as active_today
      `
    ),
    adminQuery<{ day: string; success: string; failed: string }>(
      `
        select
          to_char(date_trunc('day', created_at), 'MM-DD') as day,
          count(*) filter (where status = 'succeeded')::text as success,
          count(*) filter (where status = 'failed')::text as failed
        from generation_tasks
        where created_at >= now() - interval '14 days'
        group by 1
        order by 1
      `
    ),
    adminQuery<{ model: string; count: string }>(
      `
        select model_key as model, count(*)::text as count
        from generation_tasks
        where status = 'succeeded' and created_at >= now() - interval '7 days'
        group by 1
        order by 2 desc
        limit 6
      `
    ),
    getPendingCounts()
  ]);

  return {
    todaySuccess: Number(totals.rows[0]?.today_success ?? 0),
    todayTotal: Number(totals.rows[0]?.today_total ?? 0),
    totalUsers: Number(users.rows[0]?.total ?? 0),
    newUsersToday: Number(users.rows[0]?.new_today ?? 0),
    activeUsersToday: Number(users.rows[0]?.active_today ?? 0),
    pending,
    trend: trend.rows.map((r) => ({ day: r.day, success: Number(r.success), failed: Number(r.failed) })),
    models: models.rows.map((r) => ({ model: r.model, count: Number(r.count) }))
  };
}
