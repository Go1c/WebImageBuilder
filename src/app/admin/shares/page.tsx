"use client";

import { useState } from "react";
import { PageShell } from "../_components/PageShell";
import { Drawer } from "../_components/Drawer";
import { adminAction, Empty, ErrorState, Loading, Pill, useAdminData, type PillTone } from "../_components/ui";
import { fmtDate, fmtNum, timeAgo, truncate } from "../_components/format";
import type { AdminShareRankRow, AdminShareRow } from "@/server/admin/queries/shares";

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "全部", value: "all" },
  { label: "被举报", value: "reported" },
  { label: "已下架", value: "removed" }
];

function statusTone(status: string): PillTone {
  if (status === "reported") return "crit";
  if (status === "removed") return "neutral";
  return "good";
}

function statusLabel(status: string): string {
  if (status === "reported") return "被举报";
  if (status === "removed") return "已下架";
  return "正常";
}

export default function SharesPage() {
  const [tab, setTab] = useState<"list" | "rank">("list");

  return (
    <PageShell title="分享管理" crumb="内容运营 / 分享管理">
      <div className="ad-section-head">
        <div className="lead">
          <h2>分享管理</h2>
          <p>审核用户分享的作品，处理被举报内容，查看乐于分享的活跃用户排行。</p>
        </div>
      </div>

      <div className="ad-tabs">
        <button className={`ad-tab${tab === "list" ? " on" : ""}`} onClick={() => setTab("list")}>分享列表</button>
        <button className={`ad-tab${tab === "rank" ? " on" : ""}`} onClick={() => setTab("rank")}>乐于分享排行</button>
      </div>

      {tab === "list" ? <ShareList /> : <ShareRank />}
    </PageShell>
  );
}

function ShareList() {
  const [status, setStatus] = useState("all");
  const [days, setDays] = useState("7");
  const [selected, setSelected] = useState<AdminShareRow | null>(null);

  const q = new URLSearchParams({ status, days });
  const { data, loading, error, reload } = useAdminData<{ rows: AdminShareRow[] }>(`/api/admin/shares?${q.toString()}`);

  return (
    <>
      <div className="ad-filters">
        {STATUS_FILTERS.map((f) => (
          <button key={f.value} className={`ad-chip${status === f.value ? " on" : ""}`} onClick={() => setStatus(f.value)}>{f.label}</button>
        ))}
        <div className="ad-spacer" />
        <select className="ad-chip" value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="7">近 7 天</option>
          <option value="30">近 30 天</option>
          <option value="0">全部</option>
        </select>
      </div>

      <div className="ad-panel">
        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} /> : null}
        {data && !loading ? (
          data.rows.length === 0 ? <Empty message="该条件下暂无分享" /> : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr><th>分享</th><th>Prompt 摘要</th><th>分享者</th><th>状态</th><th>举报</th><th>时间</th></tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => setSelected(r)}>
                      <td>
                        <div className="ad-row-flex">
                          <div className="ad-thumb-sq" style={{ backgroundImage: `url(${r.imageUrl})` }} />
                          <span className="ad-mono ad-sub">{r.id}</span>
                        </div>
                      </td>
                      <td>{truncate(r.prompt, 40)}</td>
                      <td className="ad-email ad-mono">{r.email || "匿名"}</td>
                      <td><Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill></td>
                      <td className="ad-tnum">{fmtNum(r.reportCount)}</td>
                      <td className="ad-sub">{timeAgo(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>

      <ShareDrawer row={selected} onClose={() => setSelected(null)} reload={reload} />
    </>
  );
}

function ShareDrawer({ row, onClose, reload }: { row: AdminShareRow | null; onClose: () => void; reload: () => void }) {
  const [busy, setBusy] = useState(false);

  async function takedown() {
    if (!row) return;
    if (!window.confirm("确定要下架这条分享吗？下架后将不再对外展示。")) return;
    setBusy(true);
    const res = await adminAction(`/api/admin/shares/${row.id}/takedown`);
    setBusy(false);
    if (!res.ok) {
      window.alert(res.error || "操作失败");
      return;
    }
    reload();
    onClose();
  }

  async function restore() {
    if (!row) return;
    setBusy(true);
    const res = await adminAction(`/api/admin/shares/${row.id}/restore`);
    setBusy(false);
    if (!res.ok) {
      window.alert(res.error || "操作失败");
      return;
    }
    reload();
    onClose();
  }

  return (
    <Drawer open={!!row} title="分享详情" sub={row ? `prompt_shares / ${row.id}` : undefined} onClose={onClose}>
      {row ? (
        <>
          <div style={{ height: 200, borderRadius: 10, backgroundImage: `url(${row.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center", marginBottom: 14 }} />
          <dl className="ad-kv">
            <dt>分享者</dt><dd className="ad-mono">{row.email || "匿名"}</dd>
            <dt>状态</dt><dd><Pill tone={statusTone(row.status)}>{statusLabel(row.status)}</Pill></dd>
            <dt>举报次数</dt><dd className="ad-tnum">{fmtNum(row.reportCount)}</dd>
            <dt>分享链接</dt><dd className="ad-mono">/share/{row.id}</dd>
            <dt>创建时间</dt><dd>{fmtDate(row.createdAt)}</dd>
          </dl>

          <h4>Prompt</h4>
          <pre className="ad-codeblock">{row.prompt}</pre>

          <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
            {row.status === "removed" ? (
              <button className="ad-btn primary" style={{ flex: 1 }} disabled={busy} onClick={restore}>恢复分享</button>
            ) : (
              <button className="ad-btn danger" style={{ flex: 1 }} disabled={busy} onClick={takedown}>下架此分享</button>
            )}
          </div>
        </>
      ) : null}
    </Drawer>
  );
}

function ShareRank() {
  const { data, loading, error } = useAdminData<{ rows: AdminShareRankRow[] }>(`/api/admin/shares?view=rank`);

  return (
    <div className="ad-panel">
      {loading ? <Loading /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data && !loading ? (
        data.rows.length === 0 ? <Empty message="暂无分享数据" /> : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr><th>排名</th><th>用户</th><th>分享数</th><th>被举报</th><th>最近分享</th></tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={r.userId}>
                    <td className="ad-tnum" style={{ fontWeight: 600 }}>{i + 1}</td>
                    <td className="ad-email ad-mono">{r.email || "—"}</td>
                    <td className="ad-tnum" style={{ fontWeight: 600 }}>{fmtNum(r.shares)}</td>
                    <td className="ad-tnum" style={r.reported > 2 ? { color: "var(--ad-crit)" } : undefined}>{fmtNum(r.reported)}</td>
                    <td className="ad-sub">{timeAgo(r.lastShare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}
