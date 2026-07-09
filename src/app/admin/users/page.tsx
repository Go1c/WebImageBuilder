"use client";

import { useEffect, useState } from "react";
import { PageShell } from "../_components/PageShell";
import { Drawer } from "../_components/Drawer";
import { Empty, ErrorState, Loading, Pill, useAdminData } from "../_components/ui";
import { fmtDate, fmtNum, pct, timeAgo, truncate } from "../_components/format";
import type { AdminUserDetail, AdminUserRow, AdminUsersPage } from "@/server/admin/queries/users";

const SPEND_LABEL: Record<string, string> = { paid: "paid", invite: "invite", login: "login" };

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("total");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = new URLSearchParams({ sort, page: String(page) });
  if (debounced) query.set("search", debounced);
  const { data, loading, error } = useAdminData<AdminUsersPage>(`/api/admin/users?${query.toString()}`);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <PageShell title="用户使用记录" crumb="用户与增长 / 用户记录">
      <div className="ad-section-head">
        <div className="lead">
          <h2>用户使用记录</h2>
          <p>按邮箱查看每位用户的生图次数、成功率、活跃与额度来源。点击行查看详情。</p>
        </div>
      </div>

      <div className="ad-filters">
        <div className="ad-searchbox" style={{ width: 260 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input placeholder="按邮箱搜索用户" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="ad-spacer" />
        <select className="ad-chip" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
          <option value="total">排序：生图数↓</option>
          <option value="recent">最近活跃↓</option>
          <option value="created">注册时间↓</option>
        </select>
      </div>

      <div className="ad-panel">
        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} /> : null}
        {data && !loading ? (
          data.rows.length === 0 ? <Empty message="没有匹配的用户" /> : (
            <>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>用户</th><th>显示名</th><th>生图数</th><th>成功率</th><th>分享</th><th>最近活跃</th><th>额度来源</th><th>注册</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((u: AdminUserRow) => (
                      <tr key={u.id} className="clickable" onClick={() => setSelected(u.id)}>
                        <td className="ad-email ad-mono">{u.email || "—"}</td>
                        <td>{u.displayName || "—"}</td>
                        <td className="ad-tnum" style={{ fontWeight: 600 }}>{fmtNum(u.total)}</td>
                        <td className="ad-tnum">{pct(u.success, u.success + u.failed)}</td>
                        <td className="ad-tnum">{fmtNum(u.shares)}</td>
                        <td className="ad-sub">{timeAgo(u.lastActive)}</td>
                        <td><Pill tone={u.spendSource === "paid" ? "accent" : "neutral"}>{SPEND_LABEL[u.spendSource]}</Pill></td>
                        <td className="ad-sub">{fmtDate(u.createdAt).split(" ")[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ad-pager">
                共 {fmtNum(data.total)} 位用户 · 第 {data.page} / {totalPages} 页
                <button className="ad-btn sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
                <button className="ad-btn sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
              </div>
            </>
          )
        ) : null}
      </div>

      <UserDrawer id={selected} onClose={() => setSelected(null)} />
    </PageShell>
  );
}

function UserDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/users/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((body) => { if (!cancelled) setDetail(body); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <Drawer open={!!id} title="用户详情" sub={detail?.email || undefined} onClose={onClose}>
      {loading || !detail ? <Loading /> : (
        <>
          <div className="ad-mini-kpi">
            <div><div className="l">总生图</div><div className="v ad-tnum">{fmtNum(detail.total)}</div></div>
            <div><div className="l">成功率</div><div className="v ad-tnum">{pct(detail.success, detail.success + detail.failed)}</div></div>
            <div><div className="l">分享数</div><div className="v ad-tnum">{fmtNum(detail.shares)}</div></div>
          </div>
          <dl className="ad-kv">
            <dt>邮箱</dt><dd className="ad-mono">{detail.email || "—"}</dd>
            <dt>显示名</dt><dd>{detail.displayName || "—"}</dd>
            <dt>额度来源</dt><dd><Pill tone={detail.spendSource === "paid" ? "accent" : "neutral"}>{SPEND_LABEL[detail.spendSource]}</Pill> <span className="ad-sub">（额度由外部支付系统管理）</span></dd>
            <dt>邀请码</dt><dd className="ad-mono">{detail.inviteCode || "—"}</dd>
            <dt>注册时间</dt><dd>{fmtDate(detail.createdAt)}</dd>
            <dt>关联设备</dt><dd>{detail.deviceCount} 台 · {detail.ipCount} IP</dd>
          </dl>

          <h4>最近生图记录</h4>
          <ul className="ad-timeline">
            {detail.recentTasks.length === 0 ? <li className="ad-sub">暂无记录</li> : detail.recentTasks.map((t) => (
              <li key={t.id}>
                <Pill tone={t.status === "succeeded" ? "good" : t.status === "failed" ? "crit" : "neutral"} plain>{t.status === "succeeded" ? "成功" : t.status === "failed" ? "失败" : t.status}</Pill>
                <span style={{ flex: 1 }}>{t.model} · {truncate(t.errorCode ? `${t.errorCode}` : t.prompt, 28)}</span>
                <span className="tt">{timeAgo(t.createdAt)}</span>
              </li>
            ))}
          </ul>

          <h4>关联设备 / 风控</h4>
          <ul className="ad-timeline">
            {detail.devices.length === 0 ? <li className="ad-sub">无关联设备</li> : detail.devices.map((d) => (
              <li key={d.fingerprint}><span className="ad-mono" style={{ flex: 1 }}>{d.fingerprint}</span><span className="tt">{d.ipHash} · {timeAgo(d.lastSeen)}</span></li>
            ))}
          </ul>
        </>
      )}
    </Drawer>
  );
}
