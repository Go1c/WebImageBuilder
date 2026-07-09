"use client";

import { useState } from "react";
import { PageShell } from "../_components/PageShell";
import { Drawer } from "../_components/Drawer";
import { CopyValue, Empty, ErrorState, Loading, Pill, useAdminData, type PillTone } from "../_components/ui";
import { fmtDate, timeAgo, truncate } from "../_components/format";
import type { AuditCategory, AuditRow } from "@/server/admin/queries/audit";

const FILTERS: { key: AuditCategory; label: string }[] = [
  { key: "all", label: "全部动作" },
  { key: "material", label: "素材" },
  { key: "share", label: "分享" },
  { key: "safety", label: "内容安全" },
  { key: "announcement", label: "公告" }
];

const ACTION_LABELS: Record<string, string> = {
  "share.takedown": "下架分享",
  "material.update": "编辑素材",
  "material.hide": "隐藏素材",
  "safety.term.add": "添加违禁词",
  "announcement.create": "新建公告"
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

function actionTone(action: string): PillTone {
  const category = action.split(".")[0];
  if (category === "material") return "accent";
  if (category === "share") return "crit";
  if (category === "safety") return "warn";
  if (category === "announcement") return "good";
  return "neutral";
}

function detailText(detail: Record<string, unknown> | null): string {
  if (!detail) return "—";
  const note = detail.note;
  if (typeof note === "string" && note) return note;
  return truncate(JSON.stringify(detail), 80);
}

export default function AuditPage() {
  const [category, setCategory] = useState<AuditCategory>("all");
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const { data, loading, error, reload } = useAdminData<{ rows: AuditRow[] }>(
    `/api/admin/audit?category=${category}`
  );

  return (
    <PageShell
      title="操作审计日志"
      crumb="监控与治理 / 审计日志"
      actions={<button className="ad-btn sm" onClick={reload}>刷新</button>}
    >
      <div className="ad-section-head">
        <div className="lead">
          <h2>操作审计日志</h2>
          <p>记录管理员对素材、分享、内容安全与公告的所有操作，只读留痕，便于回溯。</p>
        </div>
      </div>

      <div className="ad-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`ad-chip${category === f.key ? " on" : ""}`}
            onClick={() => setCategory(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="ad-panel">
        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {data && !loading ? (
          data.rows.length === 0 ? (
            <Empty message="该条件下暂无审计记录" />
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr><th>管理员</th><th>动作</th><th>目标</th><th>详情</th><th>时间</th></tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => setSelected(r)}>
                      <td className="ad-mono">{r.adminEmail}</td>
                      <td><Pill tone={actionTone(r.action)}>{actionLabel(r.action)}</Pill></td>
                      <td className="ad-mono ad-sub">{r.targetType || "—"}/{r.targetId || "—"}</td>
                      <td>{detailText(r.detail)}</td>
                      <td className="ad-sub">{timeAgo(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>

      <Drawer
        open={!!selected}
        title="审计详情"
        sub={selected ? `audit_logs / ${selected.id}` : undefined}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <>
            <dl className="ad-kv">
              <dt>管理员</dt><dd className="ad-mono">{selected.adminEmail}</dd>
              <dt>动作</dt><dd><Pill tone={actionTone(selected.action)}>{actionLabel(selected.action)}</Pill> <span className="ad-mono ad-sub">{selected.action}</span></dd>
              <dt>目标</dt><dd><CopyValue value={`${selected.targetType || "—"}/${selected.targetId || "—"}`} /></dd>
              <dt>时间</dt><dd>{fmtDate(selected.createdAt)}</dd>
            </dl>

            <h4>原始记录 (raw JSON)</h4>
            <details className="ad-reveal" open>
              <summary>detail 原文<span className="tag">默认展开</span></summary>
              <div className="reveal-body">
                <pre className="ad-codeblock">{JSON.stringify(selected.detail ?? {}, null, 2)}</pre>
              </div>
            </details>
          </>
        ) : null}
      </Drawer>
    </PageShell>
  );
}
