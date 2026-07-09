"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "../_components/PageShell";
import { Drawer } from "../_components/Drawer";
import { Empty, ErrorState, Kpi, Loading, Pill, useAdminData, type PillTone } from "../_components/ui";
import { fmtNum, timeAgo, truncate } from "../_components/format";
import type { AdminErrorRow, AdminErrorsData } from "@/server/admin/queries/errors";

const TYPE_FILTERS = ["provider_error", "quota_exhausted", "rate_limited", "internal_error"];

function typeTone(code: string | null): PillTone {
  if (code === "provider_error" || code === "internal_error") return "crit";
  return "warn";
}

export default function ErrorsPage() {
  const [type, setType] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [hours, setHours] = useState("24");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<AdminErrorRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const q = new URLSearchParams({ hours });
  if (type) q.set("type", type);
  if (model) q.set("model", model);
  if (debounced) q.set("search", debounced);
  const { data, loading, error, reload } = useAdminData<AdminErrorsData>(`/api/admin/errors?${q.toString()}`);

  return (
    <PageShell
      title="报错监控"
      crumb="监控与治理 / 报错监控"
      actions={<button className="ad-btn sm" onClick={reload}>刷新</button>}
    >
      <div className="ad-section-head">
        <div className="lead">
          <h2>报错监控</h2>
          <p>所有失败的生图任务，按用户、模型、时间与错误类型排查。点击行查看上游原始报错。</p>
        </div>
      </div>

      {data ? (
        <div className="ad-kpi-row cols-4">
          <Kpi label="今日失败" value={fmtNum(data.kpi.today)} valueTone="var(--ad-crit)" />
          <Kpi label="provider 报错" value={fmtNum(data.kpi.provider)} />
          <Kpi label="配额 / 限流" value={fmtNum(data.kpi.quota)} />
          <Kpi label="其它" value={fmtNum(data.kpi.other)} />
        </div>
      ) : null}

      <div className="ad-filters">
        <button className={`ad-chip${type === "" ? " on" : ""}`} onClick={() => setType("")}>全部</button>
        {TYPE_FILTERS.map((t) => (
          <button key={t} className={`ad-chip${type === t ? " on" : ""}`} onClick={() => setType(t)}>{t}</button>
        ))}
        <div className="ad-searchbox" style={{ width: 200 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input placeholder="按邮箱筛选" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="ad-spacer" />
        <select className="ad-chip" value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="">全部模型</option>
          <option value="gpt-image-2">gpt-image-2</option>
          <option value="gemini-2.5-flash-image">gemini-2.5-flash-image</option>
        </select>
        <select className="ad-chip" value={hours} onChange={(e) => setHours(e.target.value)}>
          <option value="24">近 24 小时</option>
          <option value="168">近 7 天</option>
        </select>
      </div>

      <div className="ad-panel">
        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} /> : null}
        {data && !loading ? (
          data.rows.length === 0 ? <Empty message="该条件下没有报错，很好 🎉" /> : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr><th>任务</th><th>用户</th><th>模型</th><th>错误类型</th><th>上游状态</th><th>请求ID</th><th>时间</th></tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => setSelected(r)}>
                      <td className="ad-mono ad-sub">{r.id.slice(0, 8)}</td>
                      <td className="ad-email ad-mono">{r.email || (r.actorType === "anonymous" ? "匿名设备" : "—")}</td>
                      <td className="ad-mono">{r.model}</td>
                      <td><Pill tone={typeTone(r.errorCode)}>{r.errorCode || "unknown"}</Pill></td>
                      <td className="ad-mono ad-tnum">{r.upstream?.statusCode ?? "—"}</td>
                      <td className="ad-mono ad-sub">{r.requestId || "—"}</td>
                      <td className="ad-sub">{timeAgo(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>

      <ErrorDrawer row={selected} onClose={() => setSelected(null)} />
    </PageShell>
  );
}

function ErrorDrawer({ row, onClose }: { row: AdminErrorRow | null; onClose: () => void }) {
  const up = row?.upstream;
  const hasUpstream = !!up && typeof up.statusCode === "number";
  const rawText = up?.rawResponse
    ? typeof up.rawResponse === "string" ? up.rawResponse : JSON.stringify(up.rawResponse, null, 2)
    : "(无上游返回：请求在到达 provider 之前失败)";

  return (
    <Drawer open={!!row} title={`报错详情 · ${row?.id.slice(0, 8) || ""}`} sub={row ? `generation_tasks / ${row.id}` : undefined} onClose={onClose}>
      {row ? (
        <>
          <dl className="ad-kv">
            <dt>任务 ID</dt><dd className="ad-mono">{row.id}</dd>
            <dt>请求 ID</dt><dd className="ad-mono">{row.requestId || "—"} <span className="ad-sub">本站关联ID</span></dd>
            <dt>上游请求 ID</dt><dd className="ad-mono">{up?.providerRequestId || "（上游未返回）"}</dd>
            <dt>用户</dt><dd className="ad-mono">{row.email || (row.actorType === "anonymous" ? "匿名设备" : "—")}</dd>
            <dt>用户 ID</dt><dd className="ad-mono">{row.userId || "—"}</dd>
            <dt>模型</dt><dd className="ad-mono">{row.model}</dd>
            <dt>Provider</dt><dd>{row.provider}</dd>
            <dt>错误类型</dt><dd><Pill tone={typeTone(row.errorCode)}>{row.errorCode || "unknown"}</Pill></dd>
            <dt>时间</dt><dd>{timeAgo(row.createdAt)}</dd>
          </dl>

          {hasUpstream ? (
            <>
              <h4>上游 HTTP 状态</h4>
              <div className="ad-mini-kpi" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 4 }}>
                <div><div className="l">HTTP</div><div className="v ad-tnum" style={{ color: "var(--ad-crit)" }}>{up!.statusCode}</div></div>
                <div><div className="l">gateway</div><div className="v ad-tnum">{up!.gatewayStatus ?? "—"}</div></div>
                <div><div className="l">code</div><div className="v ad-mono" style={{ fontSize: 12 }}>{up!.code || "—"}</div></div>
                <div><div className="l">type</div><div className="v ad-mono" style={{ fontSize: 12 }}>{up!.type || "—"}</div></div>
              </div>
            </>
          ) : null}

          <details className="ad-reveal crit">
            <summary>上游原始返回体 (upstream raw response)<span className="tag">默认折叠 · 点击查看</span></summary>
            <div className="reveal-body"><pre className="ad-codeblock">{rawText}</pre></div>
          </details>

          <details className="ad-reveal">
            <summary>本站错误信息 error_message<span className="tag">包装后</span></summary>
            <div className="reveal-body"><pre className="ad-codeblock" style={{ background: "#20232C", color: "#B8BDCA" }}>{row.errorMessage || "—"}</pre></div>
          </details>

          <details className="ad-reveal">
            <summary>请求参数 params &amp; Prompt</summary>
            <div className="reveal-body"><pre className="ad-codeblock">{JSON.stringify({ prompt: truncate(row.prompt, 200), ...(typeof row.params === "object" && row.params ? row.params : {}) }, null, 2)}</pre></div>
          </details>

          {row.userId ? (
            <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
              <Link className="ad-btn" style={{ flex: 1 }} href="/admin/users">查看该用户</Link>
            </div>
          ) : null}
        </>
      ) : null}
    </Drawer>
  );
}
