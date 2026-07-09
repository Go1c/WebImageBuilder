"use client";

import { useEffect, useState } from "react";
import { PageShell } from "../_components/PageShell";
import { Drawer } from "../_components/Drawer";
import { adminAction, Empty, ErrorState, Loading, Pill, useAdminData } from "../_components/ui";
import { fmtDate, fmtNum, timeAgo, truncate } from "../_components/format";
import type { BlockedTermRow, ReviewQueueRow } from "@/server/admin/queries/safety";

type Tab = "review" | "terms";

export default function SafetyPage() {
  const [tab, setTab] = useState<Tab>("review");

  return (
    <PageShell title="内容安全" crumb="内容运营 / 内容安全">
      <div className="ad-note-strip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" /><path d="M12 9v4M12 16h.01" /></svg>
        <span>命中违禁词的 prompt 会在生图入口被拦截或标记；此处对命中内容做人工复审与违禁词维护。</span>
      </div>

      <div className="ad-tabs" style={{ marginBottom: 18 }}>
        <button className={`ad-tab${tab === "review" ? " on" : ""}`} onClick={() => setTab("review")}>复审队列</button>
        <button className={`ad-tab${tab === "terms" ? " on" : ""}`} onClick={() => setTab("terms")}>违禁词库</button>
      </div>

      {tab === "review" ? <ReviewQueue /> : <TermsLibrary />}
    </PageShell>
  );
}

function ReviewQueue() {
  const { data, loading, error } = useAdminData<{ rows: ReviewQueueRow[] }>("/api/admin/safety/review");
  const [selected, setSelected] = useState<ReviewQueueRow | null>(null);

  return (
    <>
      <div className="ad-panel">
        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} /> : null}
        {data && !loading ? (
          data.rows.length === 0 ? <Empty message="复审队列为空 🎉" /> : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr><th>预览</th><th>命中</th><th>Prompt 摘要</th><th>作者</th><th>时间</th></tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => setSelected(r)}>
                      <td><div className="ad-thumb-sq" style={{ background: "#EEF0F4" }} /></td>
                      <td><Pill tone="crit">{r.errorCode || "unknown"}</Pill></td>
                      <td>{truncate(r.prompt, 40)}</td>
                      <td className="ad-email ad-mono">{r.email || "匿名"}</td>
                      <td className="ad-sub">{timeAgo(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>

      <ReviewDrawer row={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function ReviewDrawer({ row, onClose }: { row: ReviewQueueRow | null; onClose: () => void }) {
  return (
    <Drawer open={!!row} title="复审详情" sub={row ? `generation_tasks / ${row.id}` : undefined} onClose={onClose}>
      {row ? (
        <>
          <dl className="ad-kv">
            <dt>命中</dt><dd><Pill tone="crit">{row.errorCode || "unknown"}</Pill></dd>
            <dt>作者</dt><dd className="ad-mono">{row.email || (row.actorType === "anonymous" ? "匿名设备" : "匿名")}</dd>
            <dt>模型</dt><dd className="ad-mono">{row.model}</dd>
            <dt>时间</dt><dd>{fmtDate(row.createdAt)}</dd>
          </dl>

          <h4>Prompt 原文</h4>
          <pre className="ad-codeblock">{row.prompt}</pre>

          <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
            <button className="ad-btn" style={{ flex: 1 }} onClick={onClose}>判定通过</button>
            <button className="ad-btn danger" style={{ flex: 1 }} onClick={onClose}>下架并标记</button>
          </div>
          <div className="ad-sub" style={{ marginTop: 10 }}>复审结论记录到审计日志（v1 暂不改变任务状态）。</div>
        </>
      ) : null}
    </Drawer>
  );
}

function TermsLibrary() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [action, setAction] = useState<"flag" | "block">("flag");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = new URLSearchParams();
  if (debounced) query.set("search", debounced);
  const { data, loading, error, reload } = useAdminData<{ rows: BlockedTermRow[] }>(`/api/admin/safety/terms?${query.toString()}`);

  async function onAdd() {
    if (!term.trim()) {
      setFormError("违禁词不能为空");
      return;
    }
    setBusy(true);
    setFormError(null);
    const res = await adminAction("/api/admin/safety/terms", { term: term.trim(), category: category.trim(), action });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error || "添加失败");
      return;
    }
    setTerm("");
    setCategory("");
    setAction("flag");
    reload();
  }

  async function onDelete(row: BlockedTermRow) {
    if (!window.confirm(`确定删除违禁词「${row.term}」？`)) {
      return;
    }
    const res = await fetch(`/api/admin/safety/terms/${row.id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      reload();
    }
  }

  return (
    <>
      <div className="ad-panel" style={{ marginBottom: 18 }}>
        <div className="ad-panel-head"><h3>新增违禁词</h3></div>
        <div className="ad-panel-body">
          <div className="ad-row-flex" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input className="ad-btn" style={{ width: 180, cursor: "text" }} placeholder="违禁词" value={term} onChange={(e) => setTerm(e.target.value)} />
            <input className="ad-btn" style={{ width: 140, cursor: "text" }} placeholder="分类" value={category} onChange={(e) => setCategory(e.target.value)} />
            <select className="ad-chip" value={action} onChange={(e) => setAction(e.target.value as "flag" | "block")}>
              <option value="flag">标记复审</option>
              <option value="block">直接拦截</option>
            </select>
            <button className="ad-btn primary" disabled={busy} onClick={onAdd}>添加</button>
            {formError ? <span className="ad-sub" style={{ color: "var(--ad-crit)" }}>{formError}</span> : null}
          </div>
        </div>
      </div>

      <div className="ad-filters">
        <div className="ad-searchbox" style={{ width: 260 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input placeholder="搜索违禁词" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="ad-panel">
        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} /> : null}
        {data && !loading ? (
          data.rows.length === 0 ? <Empty message="没有匹配的违禁词" /> : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr><th>违禁词</th><th>分类</th><th>动作</th><th>命中</th><th>添加时间</th><th /></tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.term}</td>
                      <td><Pill tone="neutral">{r.category || "—"}</Pill></td>
                      <td>{r.action === "block" ? <Pill tone="crit">直接拦截</Pill> : <Pill tone="warn">标记复审</Pill>}</td>
                      <td className="ad-tnum">{fmtNum(r.hitCount)}</td>
                      <td className="ad-sub">{fmtDate(r.createdAt).split(" ")[0]}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="ad-btn danger sm" onClick={() => onDelete(r)}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>
    </>
  );
}
