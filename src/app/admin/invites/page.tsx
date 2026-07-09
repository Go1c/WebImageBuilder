"use client";

import { useState } from "react";
import { PageShell } from "../_components/PageShell";
import { CopyValue, Empty, ErrorState, Kpi, Loading, Pill, useAdminData, type PillTone } from "../_components/ui";
import { fmtNum, pct, timeAgo, truncate } from "../_components/format";
import type { AdminInviteRow, InviteStats, InviteStatus } from "@/server/admin/queries/invites";

type InvitesData = { stats: InviteStats; rows: AdminInviteRow[] };

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "全部" },
  { key: "rewarded", label: "已奖励" },
  { key: "pending", label: "待发放" },
  { key: "blocked", label: "作弊拦截" }
];

function statusTone(status: InviteStatus): PillTone {
  if (status === "rewarded") return "good";
  if (status === "pending") return "warn";
  return "crit";
}

function statusLabel(status: InviteStatus): string {
  if (status === "rewarded") return "已奖励";
  if (status === "pending") return "待发放";
  return "作弊拦截";
}

function rewardValue(status: InviteStatus): string {
  if (status === "rewarded") return "+5";
  if (status === "blocked") return "0";
  return "—";
}

export default function InvitesPage() {
  const [status, setStatus] = useState("all");

  const q = new URLSearchParams();
  if (status !== "all") q.set("status", status);
  const { data, loading, error, reload } = useAdminData<InvitesData>(`/api/admin/invites?${q.toString()}`);

  return (
    <PageShell
      title="邀请裂变监控"
      crumb="用户与增长 / 邀请裂变"
      actions={<button className="ad-btn sm" onClick={reload}>刷新</button>}
    >
      <div className="ad-section-head">
        <div className="lead">
          <h2>邀请裂变监控</h2>
          <p>邀请人 → 被邀请人的奖励发放与作弊拦截情况。同 IP / 同设备的邀请会被自动拦截。</p>
        </div>
      </div>

      <div className="ad-note-strip">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg>
        奖励按账户中心批次发放,本站无手动发放/取消能力,仅做监控与作弊拦截展示。
      </div>

      {data ? (
        <div className="ad-kpi-row cols-4">
          <Kpi label="累计邀请" value={fmtNum(data.stats.total)} />
          <Kpi
            label="成功奖励"
            value={fmtNum(data.stats.rewarded)}
            delta={`▲ 转化 ${pct(data.stats.rewarded, data.stats.total)}`}
            deltaTone="up"
          />
          <Kpi label="待发放" value={fmtNum(data.stats.pending)} valueTone={data.stats.pending ? "var(--ad-warn)" : undefined} />
          <Kpi label="作弊拦截" value={fmtNum(data.stats.blocked)} valueTone="var(--ad-crit)" />
        </div>
      ) : null}

      <div className="ad-filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`ad-chip${status === f.key ? " on" : ""}`}
            onClick={() => setStatus(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="ad-panel">
        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {data && !loading ? (
          data.rows.length === 0 ? <Empty message="该条件下没有邀请记录" /> : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr><th>邀请人</th><th>被邀请人</th><th>状态</th><th>奖励</th><th>设备IP</th><th>时间</th></tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="ad-email ad-mono">{r.inviterEmail || "—"}</td>
                      <td className="ad-email ad-mono">{r.inviteeEmail || "—"}</td>
                      <td><Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill></td>
                      <td className="ad-tnum">{rewardValue(r.status)}</td>
                      <td className="ad-sub">{r.ipHash ? <CopyValue value={r.ipHash} display={truncate(r.ipHash, 16)} /> : "—"}</td>
                      <td className="ad-sub">{timeAgo(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>
    </PageShell>
  );
}
