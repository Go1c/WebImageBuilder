import { adminQuery, isLocalPreview } from "../db";

// Rough per-image price estimates (USD). Clearly an estimate — real billing
// comes from the provider invoice. Used to turn task counts into $ figures.
const PRICE: Record<string, number> = {
  "gpt-image-2": 0.04,
  "gemini-2.5-flash-image": 0.03
};
const DEFAULT_PRICE = 0.03;

function priceFor(model: string): number {
  return PRICE[model] ?? DEFAULT_PRICE;
}

export type CostProvider = { name: string; cost: number; pct: number };
export type CostTopUser = { email: string; count: number; cost: number };

export type CostDashboard = {
  totalCount: number;
  estCost: number;
  avgPrice: number;
  retryLoss: number;
  daily: number[];
  byProvider: CostProvider[];
  topUsers: CostTopUser[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getCostDashboard(params: { days?: number }): Promise<CostDashboard> {
  const days = params.days && params.days > 0 ? Math.floor(params.days) : 30;

  if (isLocalPreview()) {
    const daily: number[] = [];
    for (let i = 0; i < 30; i++) {
      // gentle wave around ~108/day
      daily.push(round2(108 + Math.sin(i / 3) * 22 + (i % 5) * 4));
    }
    return {
      totalCount: 118400,
      estCost: 3240,
      avgPrice: 0.027,
      retryLoss: 104,
      daily,
      byProvider: [
        { name: "OpenAI · gpt-image-2", cost: 2268, pct: 70 },
        { name: "Google · Gemini", cost: 842, pct: 26 },
        { name: "存储 · S3/R2", cost: 130, pct: 4 }
      ],
      topUsers: [
        { email: "whale_user@qq.com", count: 4120, cost: 112 },
        { email: "designer@163.com", count: 2880, cost: 78 },
        { email: "studio.k@gmail.com", count: 2010, cost: 54 }
      ]
    };
  }

  const [succeededResult, failedResult, topUsersResult] = await Promise.all([
    adminQuery<{ provider: string; model_key: string; day: string; count: string }>(
      `
        select provider, model_key,
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
          count(*)::text as count
        from generation_tasks
        where status = 'succeeded'
          and created_at >= now() - interval '${days} days'
        group by provider, model_key, day
      `
    ),
    adminQuery<{ model_key: string; count: string }>(
      `
        select model_key, count(*)::text as count
        from generation_tasks
        where status = 'failed'
          and created_at >= now() - interval '${days} days'
        group by model_key
      `
    ),
    adminQuery<{ email: string | null; model_key: string; count: string }>(
      `
        select u.email, t.model_key, count(*)::text as count
        from generation_tasks t
        join users u on u.id = t.user_id
        where t.status = 'succeeded'
          and t.created_at >= now() - interval '${days} days'
        group by u.email, t.model_key
      `
    )
  ]);

  // --- totals + daily array (oldest → newest, length = days) ---
  const dayCost = new Map<string, number>();
  const providerCost = new Map<string, number>();
  let totalCount = 0;
  let estCost = 0;

  for (const r of succeededResult.rows) {
    const count = Number(r.count);
    const cost = count * priceFor(r.model_key);
    totalCount += count;
    estCost += cost;
    dayCost.set(r.day, (dayCost.get(r.day) ?? 0) + cost);
    providerCost.set(r.provider, (providerCost.get(r.provider) ?? 0) + cost);
  }

  const daily: number[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    daily.push(round2(dayCost.get(key) ?? 0));
  }

  // --- byProvider (with a rough synthetic storage line) ---
  const providerLabels: Record<string, string> = {
    openai: "OpenAI · gpt-image-2",
    google: "Google · Gemini"
  };
  const storageCost = round2(estCost * 0.04);
  const grandTotal = estCost + storageCost;
  const byProvider: CostProvider[] = [];
  for (const [provider, cost] of providerCost.entries()) {
    byProvider.push({
      name: providerLabels[provider] ?? provider,
      cost: round2(cost),
      pct: grandTotal > 0 ? Math.round((cost / grandTotal) * 100) : 0
    });
  }
  byProvider.sort((a, b) => b.cost - a.cost);
  if (storageCost > 0) {
    byProvider.push({
      name: "存储 · S3/R2",
      cost: storageCost,
      pct: grandTotal > 0 ? Math.round((storageCost / grandTotal) * 100) : 0
    });
  }

  // --- retryLoss (wasted spend on failed tasks) ---
  let retryLoss = 0;
  for (const r of failedResult.rows) {
    retryLoss += Number(r.count) * priceFor(r.model_key);
  }

  // --- top users ---
  const userAgg = new Map<string, { count: number; cost: number }>();
  for (const r of topUsersResult.rows) {
    const email = r.email || "—";
    const count = Number(r.count);
    const cost = count * priceFor(r.model_key);
    const cur = userAgg.get(email) ?? { count: 0, cost: 0 };
    cur.count += count;
    cur.cost += cost;
    userAgg.set(email, cur);
  }
  const topUsers: CostTopUser[] = Array.from(userAgg.entries())
    .map(([email, v]) => ({ email, count: v.count, cost: round2(v.cost) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalCount,
    estCost: round2(estCost),
    avgPrice: totalCount > 0 ? Math.round((estCost / totalCount) * 1000) / 1000 : 0,
    retryLoss: round2(retryLoss),
    daily,
    byProvider,
    topUsers
  };
}
