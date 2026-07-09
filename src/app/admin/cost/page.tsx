"use client";

import { useState } from "react";
import { PageShell } from "../_components/PageShell";
import { LineChart } from "../_components/LineChart";
import { ErrorState, Kpi, Loading, useAdminData } from "../_components/ui";
import { fmtNum } from "../_components/format";
import type { CostDashboard } from "@/server/admin/queries/cost";

const PROVIDER_COLORS = ["#5B61E8", "#8B5FE0", "#3FA9C4"];

function fmtCount(value: number): string {
  if (value >= 10000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return fmtNum(value);
}

export default function CostPage() {
  const [days, setDays] = useState("30");
  const { data, loading, error } = useAdminData<CostDashboard>(`/api/admin/cost?days=${days}`);

  return (
    <PageShell
      title="成本 / 用量看板"
      crumb="监控与治理 / 成本看板"
      actions={
        <select className="ad-chip" value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="30">近 30 天</option>
          <option value="7">近 7 天</option>
        </select>
      }
    >
      <div className="ad-section-head">
        <div className="lead">
          <h2>成本 / 用量看板</h2>
          <p>基于成功生图任务数与各 provider 单价的估算。</p>
        </div>
      </div>

      <div className="ad-note-strip">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg>
        本页均为估算值,实际费用以 provider 账单为准。
      </div>

      {loading ? <Loading /> : null}
      {error ? <ErrorState message={error} /> : null}

      {data && !loading ? (
        <>
          <div className="ad-kpi-row cols-4">
            <Kpi label="本月生图总数" value={fmtCount(data.totalCount)} />
            <Kpi label="估算成本" value={`$${fmtNum(data.estCost)}`} />
            <Kpi label="单张均价" value={`$${data.avgPrice.toFixed(3)}`} />
            <Kpi
              label="失败重试损耗"
              value={data.retryLoss > 0 ? `$${fmtNum(data.retryLoss)}` : "✓ 无损耗"}
              valueTone={data.retryLoss > 0 ? "var(--ad-warn)" : "var(--ad-good)"}
            />
          </div>

          <div className="ad-grid-2">
            <div className="ad-panel">
              <div className="ad-panel-head"><h3>每日估算成本</h3></div>
              <div style={{ padding: "12px 8px 4px" }}>
                <LineChart series={[{ data: data.daily, color: "#5B61E8", fill: "rgba(91,97,232,.16)" }]} />
              </div>
            </div>

            <div>
              <div className="ad-panel">
                <div className="ad-panel-head"><h3>按 provider 拆分</h3></div>
                <div className="ad-panel-body">
                  <div className="ad-bars">
                    {data.byProvider.map((p, i) => (
                      <div className="ad-bar-row" key={p.name}>
                        <span className="bn">{p.name}</span>
                        <div className="ad-bar-track">
                          <div className="ad-bar-fill" style={{ width: `${p.pct}%`, background: PROVIDER_COLORS[i % PROVIDER_COLORS.length] }} />
                        </div>
                        <span className="bv ad-tnum">${fmtNum(p.cost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ad-panel" style={{ marginTop: 16 }}>
                <div className="ad-panel-head"><h3>成本 Top 用户（本月）</h3></div>
                <div className="ad-panel-body">
                  <ul className="ad-timeline">
                    {data.topUsers.map((u) => (
                      <li key={u.email}>
                        <span className="ad-email ad-mono">{u.email}</span>
                        <span className="tt ad-tnum">{fmtNum(u.count)} 张 · ${fmtNum(u.cost)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </PageShell>
  );
}
