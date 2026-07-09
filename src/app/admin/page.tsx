"use client";

import Link from "next/link";
import { PageShell } from "./_components/PageShell";
import { LineChart } from "./_components/LineChart";
import { ErrorState, Kpi, Loading, Pill, useAdminData } from "./_components/ui";
import { fmtNum, pct } from "./_components/format";
import type { OverviewData } from "@/server/admin/queries/overview";

export default function OverviewPage() {
  const { data, loading, error } = useAdminData<OverviewData>("/api/admin/overview");

  return (
    <PageShell title="总览" crumb="Lumio Admin / 总览">
      {loading ? <Loading /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data ? <Overview data={data} /> : null}
    </PageShell>
  );
}

function Overview({ data }: { data: OverviewData }) {
  const modelTotal = data.models.reduce((sum, m) => sum + m.count, 0);
  const modelColors = ["var(--ad-accent)", "#8B5FE0", "#3FA9C4", "var(--ad-faint)", "#2E9E6B", "#E0940A"];
  const pendingTotal = data.pending.shares + data.pending.safety + data.pending.errors;

  return (
    <>
      <div className="ad-kpi-row">
        <Kpi label="今日生图（成功）" value={fmtNum(data.todaySuccess)} />
        <Kpi label="今日成功率" value={pct(data.todaySuccess, data.todayTotal, 1).replace("%", "")} unit="%" />
        <Kpi label="累计注册用户" value={fmtNum(data.totalUsers)} delta={`▲ ${fmtNum(data.newUsersToday)} 今日新增`} deltaTone="up" />
        <Kpi label="今日活跃用户" value={fmtNum(data.activeUsersToday)} />
        <Kpi label="待处理" value={fmtNum(pendingTotal)} valueTone={pendingTotal ? "var(--ad-crit)" : undefined} delta={`${data.pending.shares} 举报 · ${data.pending.safety} 复审 · ${data.pending.errors} 报错`} />
      </div>

      <div className="ad-grid-2">
        <div className="ad-panel">
          <div className="ad-panel-head">
            <h3>生图趋势（近 14 天）</h3>
            <div className="ad-spacer" />
            <Pill tone="accent" plain>成功 vs 失败</Pill>
          </div>
          <div style={{ padding: "12px 8px 4px" }}>
            <LineChart
              series={[
                { data: data.trend.map((t) => t.success), color: "#5B61E8", fill: "rgba(91,97,232,.16)" },
                { data: data.trend.map((t) => t.failed), color: "#D9484C" }
              ]}
            />
          </div>
          <div style={{ display: "flex", gap: 16, padding: "0 16px 14px" }}>
            <span className="ad-sub" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: "#5B61E8" }} />成功生图</span>
            <span className="ad-sub" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: "#D9484C" }} />失败生图</span>
          </div>
        </div>

        <div className="ad-panel">
          <div className="ad-panel-head"><h3>模型用量分布（近 7 天）</h3></div>
          <div className="ad-panel-body">
            <div className="ad-bars">
              {data.models.map((m, i) => (
                <div className="ad-bar-row" key={m.model}>
                  <span className="bn">{m.model}</span>
                  <div className="ad-bar-track"><div className="ad-bar-fill" style={{ width: pct(m.count, modelTotal, 0), background: modelColors[i % modelColors.length] }} /></div>
                  <span className="bv ad-tnum">{pct(m.count, modelTotal, 0)}</span>
                </div>
              ))}
            </div>
            <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--ad-muted)", margin: "22px 0 10px" }}>待处理项</h4>
            <ul className="ad-timeline">
              <li><Pill tone="crit" plain>举报</Pill><span style={{ flex: 1 }}>{data.pending.shares} 条分享被举报，待审核</span><Link className="ad-btn ghost sm" href="/admin/shares">去处理 →</Link></li>
              <li><Pill tone="warn" plain>复审</Pill><span style={{ flex: 1 }}>{data.pending.safety} 条内容命中敏感/安全，待复审</span><Link className="ad-btn ghost sm" href="/admin/safety">去处理 →</Link></li>
              <li><Pill tone="neutral" plain>报错</Pill><span style={{ flex: 1 }}>{data.pending.errors} 条生图今日失败</span><Link className="ad-btn ghost sm" href="/admin/errors">去查看 →</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
