import { adminQuery, isLocalPreview } from "../db";

export type UpstreamDetail = {
  statusCode?: number;
  gatewayStatus?: number;
  code?: string;
  type?: string;
  message?: string;
  rawResponse?: unknown;
  contentType?: string;
  providerRequestId?: string;
};

export type AdminErrorRow = {
  id: string;
  email: string | null;
  actorType: string;
  userId: string | null;
  model: string;
  provider: string;
  errorCode: string | null;
  errorMessage: string | null;
  requestId: string | null;
  upstream: UpstreamDetail | null;
  params: unknown;
  prompt: string;
  createdAt: string;
};

export type AdminErrorsData = {
  rows: AdminErrorRow[];
  kpi: { today: number; provider: number; quota: number; other: number };
};

const QUOTA_CODES = ["quota_exhausted", "rate_limited", "upstream_rate_limited", "trial_resolution_unsupported"];

function mockRow(partial: Partial<AdminErrorRow> & { id: string }): AdminErrorRow {
  return {
    email: null, actorType: "user", userId: null, model: "gpt-image-2", provider: "openai",
    errorCode: null, errorMessage: null, requestId: null, upstream: null, params: { size: "1024x1024", n: 1 },
    prompt: "a serene mountain lake at dawn, mist, cinematic", createdAt: new Date().toISOString(), ...partial
  };
}

const MOCK: AdminErrorRow[] = [
  mockRow({ id: "e_9f2a", email: "art@qq.com", userId: "usr_7a1c92", errorCode: "provider_error", requestId: "req_2f8b1e9c04",
    errorMessage: "status_code=500, image generation failed", createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
    upstream: { statusCode: 500, gatewayStatus: 502, code: "upstream_server_error", type: "server_error", providerRequestId: "req_abc123-openai-9f2a", rawResponse: { error: { code: "server_error", type: "server_error", message: "The server had an error while processing your request." } } } }),
  mockRow({ id: "e_7c1b", email: null, actorType: "anonymous", userId: "anon_fp_2c9a", model: "gemini-2.5-flash-image", provider: "google", errorCode: "provider_error", requestId: "req_9d3c77a120",
    errorMessage: "status_code=400, blocked by provider safety filter", createdAt: new Date(Date.now() - 14 * 60000).toISOString(),
    upstream: { statusCode: 400, gatewayStatus: 400, code: "upstream_bad_request", type: "INVALID_ARGUMENT", rawResponse: { error: { code: 400, status: "INVALID_ARGUMENT", message: "The prompt was blocked due to safety settings.", details: [{ "@type": "SafetyRating", category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", probability: "HIGH" }] } } } }),
  mockRow({ id: "e_3d8e", email: "neo@gmail.com", userId: "usr_44e0b1", errorCode: "rate_limited", requestId: "req_5b1a09ffcd",
    errorMessage: "status_code=429, Too Many Requests", createdAt: new Date(Date.now() - 33 * 60000).toISOString(),
    upstream: { statusCode: 429, gatewayStatus: 429, code: "upstream_rate_limited", type: "rate_limit_exceeded", providerRequestId: "req_def456-openai-3d8e", rawResponse: { error: { code: "rate_limit_exceeded", type: "requests", message: "Rate limit reached for images per min. Limit 5, used 5." } } } }),
  mockRow({ id: "e_1a5f", email: "free@163.com", userId: "usr_88f2aa", errorCode: "quota_exhausted", requestId: "req_71c0e4a9b2",
    errorMessage: "user quota exhausted (login free = 0) — 拦在生图入口，未到达 provider", createdAt: new Date(Date.now() - 3600000).toISOString(), upstream: null }),
  mockRow({ id: "e_4e7d", email: "test@qq.com", userId: "usr_09b7c3", errorCode: "internal_error", requestId: "req_0a5f1d6e42",
    errorMessage: "TypeError: cannot read properties of undefined (reading 'storage_key')", createdAt: new Date(Date.now() - 3 * 3600000).toISOString(), upstream: null })
];

export async function listErrors(params: { type?: string; model?: string; search?: string; hours?: number }): Promise<AdminErrorsData> {
  if (isLocalPreview()) {
    let rows = MOCK;
    if (params.type) rows = rows.filter((r) => r.errorCode === params.type);
    if (params.model) rows = rows.filter((r) => r.model === params.model);
    if (params.search) rows = rows.filter((r) => (r.email || "").includes(params.search!));
    return { rows, kpi: { today: 12, provider: 8, quota: 3, other: 1 } };
  }

  const hours = params.hours && params.hours > 0 ? params.hours : 24;
  const conditions = [`t.status = 'failed'`, `t.created_at >= now() - interval '${hours} hours'`];
  const args: unknown[] = [];
  if (params.type) { args.push(params.type); conditions.push(`t.error_code = $${args.length}`); }
  if (params.model) { args.push(params.model); conditions.push(`t.model_key = $${args.length}`); }
  if (params.search) { args.push(`%${params.search}%`); conditions.push(`u.email ilike $${args.length}`); }

  const [rowsResult, kpiResult] = await Promise.all([
    adminQuery<{
      id: string; email: string | null; actor_type: string; user_id: string | null; model_key: string; provider: string;
      error_code: string | null; error_message: string | null; request_id: string | null; upstream_detail: UpstreamDetail | null;
      params: unknown; prompt: string; created_at: string;
    }>(
      `
        select t.id, u.email, t.actor_type, t.user_id, t.model_key, t.provider,
          t.error_code, t.error_message, t.request_id, t.upstream_detail, t.params, t.prompt, t.created_at
        from generation_tasks t
        left join users u on u.id = t.user_id
        where ${conditions.join(" and ")}
        order by t.created_at desc
        limit 100
      `,
      args
    ),
    adminQuery<{ today: string; provider: string; quota: string; other: string }>(
      `
        select
          count(*)::text as today,
          count(*) filter (where error_code = 'provider_error')::text as provider,
          count(*) filter (where error_code = any($1))::text as quota,
          count(*) filter (where error_code is null or error_code not in ('provider_error', 'quota_exhausted', 'rate_limited', 'upstream_rate_limited', 'trial_resolution_unsupported'))::text as other
        from generation_tasks
        where status = 'failed' and created_at >= date_trunc('day', now())
      `,
      [QUOTA_CODES]
    )
  ]);

  return {
    rows: rowsResult.rows.map((r) => ({
      id: r.id, email: r.email, actorType: r.actor_type, userId: r.user_id, model: r.model_key, provider: r.provider,
      errorCode: r.error_code, errorMessage: r.error_message, requestId: r.request_id, upstream: r.upstream_detail,
      params: r.params, prompt: r.prompt, createdAt: r.created_at
    })),
    kpi: {
      today: Number(kpiResult.rows[0]?.today ?? 0),
      provider: Number(kpiResult.rows[0]?.provider ?? 0),
      quota: Number(kpiResult.rows[0]?.quota ?? 0),
      other: Number(kpiResult.rows[0]?.other ?? 0)
    }
  };
}
