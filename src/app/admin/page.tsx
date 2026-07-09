"use client";

import Link from "next/link";
import { PageShell } from "./_components/PageShell";
import { LineChart } from "./_components/LineChart";
import { ErrorState, Kpi, Loading, useAdminData } from "./_components/ui";
import { fmtNum, pct } from "./_components/format";
import type { OverviewData } from "@/server/admin/queries/overview";

export default function OverviewPage() {
  const { data, loading, error, reload } = useAdminData<OverviewData>("/api/admin/overview");

  return (
    <PageShell title="总览" crumb="Lumio Admin / 总览">
      {loading ? <Loading /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {data ? <Overview data={data} /> : null}
    </PageShell>
  );
}

function AttentionCard({
  count,
  title,
  sub,
  href
}: {
  count: number;
  title: string;
  sub: string;
  href: string;
}) {
  return (
    <Link href={href} className={count === 0 ? "zero" : undefined}>
      <span className="n ad-tnum">{fmtNum(count)}</span>
      <span>
        <div className="t">{title}</div>
        <div className="s">{count === 0 ? "已清空,无需处理" : sub}</div>
      </span>
      <span className="go">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

function Overview({ data }: { data: OverviewData }) {
  const modelTotal = data.models.reduce((sum, m) => sum + m.count, 0);
  const modelColors = ["var(--ad-accent)", "#8B5FE0", "#3FA9C4", "var(--ad-faint)", "#2E9E6B", "#E0940A"];
  // honest truncation: overview query limits to 6 rows; show up to 4 + honest label
  const shownModels = data.models.slice(0, 4);

  // trend deltas: compare last day vs prior day for success rate direction
  const trend = data.trend;
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const successDelta = last && prev ? last.success - prev.success : 0;
  const failedDelta = last && prev ? last.failed - prev.failed : 0;

  const labels = trend.map((t) => t.day);

  return (
    <>
      {/* 待处理三项：首屏主角 */}
      <div className="adx-attention">
        <AttentionCard
          count={data.pending.shares}
          title="被举报分享待审核"
          sub="有分享被用户举报,请及时处理"
          href="/admin/shares"
        />
        <AttentionCard
          count={data.pending.safety}
          title="内容安全待复审"
          sub="命中敏感/安全策略,等待人工复审"
          href="/admin/safety"
        />
        <AttentionCard
          count={data.pending.errors}
          title="今日生图失败"
          sub="今日有生图任务失败,建议排查"
          href="/admin/errors"
        />
      </div>

      <div className="ad-kpi-row">
        <Kpi label="今日生图（成功）" value={fmtNum(data.todaySuccess)} />
        <Kpi
          label="今日成功率"
          value={pct(data.todaySuccess, data.todayTotal, 1).replace("%", "")}
          unit="%"
        />
        <Kpi
          label="累计注册用户"
          value={fmtNum(data.totalUsers)}
          delta={`▲ ${fmtNum(data.newUsersToday)} 今日新增`}
          deltaTone={data.newUsersToday > 0 ? "up" : "flat"}
        />
        <Kpi label="今日活跃用户" value={fmtNum(data.activeUsersToday)} />
        <Kpi
          label="今日失败生图"
          value={fmtNum(last?.failed ?? 0)}
          delta={
            failedDelta === 0
              ? "— 与昨日持平"
              : failedDelta > 0
                ? `▲ ${fmtNum(failedDelta)} 较昨日`
                : `▼ ${fmtNum(Math.abs(failedDelta))} 较昨日`
          }
          deltaTone={failedDelta === 0 ? "flat" : failedDelta > 0 ? "down" : "up"}
        />
      </div>

      <div className="ad-grid-2">
        <div className="ad-panel">
          <div className="ad-panel-head">
            <h3>生图趋势（近 14 天）</h3>
            <div className="ad-spacer" />
            <span
              className={`ad-delta ${successDelta === 0 ? "flat" : successDelta > 0 ? "up" : "down"}`}
            >
              {successDelta === 0
                ? "— 成功数持平"
                : successDelta > 0
                  ? `▲ 成功 +${fmtNum(successDelta)}`
                  : `▼ 成功 ${fmtNum(successDelta)}`}
            </span>
          </div>
          <div style={{ padding: "12px 8px 4px" }}>
            <LineChart
              labels={labels}
              series={[
                { name: "成功", data: trend.map((t) => t.success), color: "#5B61E8", fill: "rgba(91,97,232,.16)" },
                { name: "失败", data: trend.map((t) => t.failed), color: "#D9484C" }
              ]}
            />
          </div>
          <div className="adx-legend" style={{ padding: "0 16px 14px" }}>
            <span><i style={{ background: "#5B61E8" }} />成功生图</span>
            <span><i style={{ background: "#D9484C" }} />失败生图</span>
          </div>
        </div>

        <div className="ad-panel">
          <div className="ad-panel-head">
            <h3>模型用量分布（近 7 天）</h3>
            <div className="ad-spacer" />
            <span className="ad-sub">
              Top {shownModels.length} · 共 {data.models.length} 个
            </span>
          </div>
          <div className="ad-panel-body">
            <div className="ad-bars">
              {shownModels.map((m, i) => (
                <div className="ad-bar-row" key={m.model} title={`${m.model}: ${fmtNum(m.count)}`}>
                  <span className="bn">{m.model}</span>
                  <div className="ad-bar-track">
                    <div
                      className="ad-bar-fill"
                      style={{ width: pct(m.count, modelTotal, 0), background: modelColors[i % modelColors.length] }}
                    />
                  </div>
                  <span className="bv ad-tnum">{pct(m.count, modelTotal, 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
