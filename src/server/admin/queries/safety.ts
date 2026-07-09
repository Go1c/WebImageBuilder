import { adminQuery, isLocalPreview } from "../db";

export type BlockedTermRow = {
  id: string;
  term: string;
  category: string;
  action: "flag" | "block";
  hitCount: number;
  createdAt: string;
};

export type ReviewQueueRow = {
  id: string;
  email: string | null;
  actorType: string;
  model: string;
  prompt: string;
  errorCode: string | null;
  createdAt: string;
};

export const SAFETY_CODES = ["content_policy_violation", "content_policy", "safety", "content_filter"];

const MOCK_TERMS: BlockedTermRow[] = [
  { id: "bt_1", term: "泳装", category: "色情低俗", action: "flag", hitCount: 214, createdAt: "2026-05-02T00:00:00Z" },
  { id: "bt_2", term: "血腥", category: "暴力", action: "block", hitCount: 88, createdAt: "2026-04-18T00:00:00Z" },
  { id: "bt_3", term: "政治敏感词", category: "政治", action: "block", hitCount: 12, createdAt: "2026-03-11T00:00:00Z" },
  { id: "bt_4", term: "赌博", category: "违法", action: "block", hitCount: 5, createdAt: "2026-02-27T00:00:00Z" }
];

const MOCK_REVIEW: ReviewQueueRow[] = [
  { id: "rq_1", email: "art_lover@qq.com", actorType: "user", model: "gpt-image-2", prompt: "海滩泳装写真，超写实，暴露", errorCode: "content_policy_violation", createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: "rq_2", email: null, actorType: "anonymous", model: "gemini-2.5-flash-image", prompt: "战争血腥场面，断肢，特写", errorCode: "safety", createdAt: new Date(Date.now() - 46 * 60000).toISOString() },
  { id: "rq_3", email: "neo@gmail.com", actorType: "user", model: "gpt-image-2", prompt: "政治敏感人物讽刺海报", errorCode: "content_filter", createdAt: new Date(Date.now() - 3 * 3600000).toISOString() }
];

export async function listBlockedTerms(search?: string): Promise<BlockedTermRow[]> {
  if (isLocalPreview()) {
    const s = (search || "").trim();
    return s ? MOCK_TERMS.filter((t) => t.term.includes(s)) : MOCK_TERMS;
  }

  const where = search ? `where term ilike $1` : "";
  const args = search ? [`%${search}%`] : [];
  const result = await adminQuery<{ id: string; term: string; category: string; action: string; hit_count: string; created_at: string }>(
    `select id, term, category, action, hit_count::text as hit_count, created_at from blocked_terms ${where} order by created_at desc`,
    args
  );
  return result.rows.map((r) => ({
    id: r.id,
    term: r.term,
    category: r.category,
    action: r.action === "block" ? "block" : "flag",
    hitCount: Number(r.hit_count),
    createdAt: r.created_at
  }));
}

export async function addBlockedTerm(input: { term: string; category: string; action: "flag" | "block"; createdBy?: string }): Promise<string> {
  if (isLocalPreview()) {
    return input.term;
  }

  await adminQuery(
    `insert into blocked_terms (term, category, action, created_by) values ($1, $2, $3, $4) on conflict (term) do nothing`,
    [input.term, input.category, input.action, input.createdBy ?? null]
  );
  return input.term;
}

export async function deleteBlockedTerm(id: string): Promise<boolean> {
  if (isLocalPreview()) {
    return true;
  }

  const result = await adminQuery(`delete from blocked_terms where id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listReviewQueue(): Promise<ReviewQueueRow[]> {
  if (isLocalPreview()) {
    return MOCK_REVIEW;
  }

  const result = await adminQuery<{
    id: string; email: string | null; actor_type: string; model_key: string; prompt: string; error_code: string | null; created_at: string;
  }>(
    `
      select t.id, u.email, t.actor_type, t.model_key, t.prompt, t.error_code, t.created_at
      from generation_tasks t
      left join users u on u.id = t.user_id
      where t.status = 'failed'
        and t.error_code = any($1)
        and t.created_at >= now() - interval '7 days'
      order by t.created_at desc
      limit 100
    `,
    [SAFETY_CODES]
  );
  return result.rows.map((r) => ({
    id: r.id,
    email: r.email,
    actorType: r.actor_type,
    model: r.model_key,
    prompt: r.prompt,
    errorCode: r.error_code,
    createdAt: r.created_at
  }));
}
