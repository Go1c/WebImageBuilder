import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getServerAdminIdentity } from "@/server/admin/serverAuth";
import { getPendingCounts } from "@/server/admin/queries/overview";
import { AdminShell } from "./_components/AdminShell";
import "./admin.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Lumio Admin",
  description: "Lumio 生图站管理后台"
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getServerAdminIdentity();

  if (!admin) {
    return (
      <div className="ad-forbidden">
        <div className="box">
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 18px",
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "var(--ad-crit-soft)",
              color: "var(--ad-crit)"
            }}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 018 0v3" />
              <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h1>403 · 需要管理员权限</h1>
          <p>
            管理后台仅对白名单邮箱开放。你当前的账号不在 <code className="ad-mono">ADMIN_EMAILS</code> 白名单中。
            如需访问，请联系系统管理员将你的邮箱加入白名单，或使用管理员账号重新登录。
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <a className="ad-btn" href="/">返回生图站</a>
            <a className="ad-btn primary" href="/login">重新登录</a>
          </div>
        </div>
      </div>
    );
  }

  let badges = { shares: 0, safety: 0, errors: 0 };
  try {
    badges = await getPendingCounts();
  } catch {
    // badge counts are best-effort; never block the shell
  }

  const initial = (admin.name || admin.email).slice(0, 1).toUpperCase();

  const brand = (
    <div className="ad-brand">
      <div className="ad-logo">L</div>
      <div>
        <div className="ad-brand-name">Lumio Admin</div>
        <div className="ad-brand-sub">生图站 · 管理后台</div>
      </div>
    </div>
  );

  const foot = (
    <div className="ad-side-foot">
      <div className="ad-avatar">{initial}</div>
      <div>
        <div className="ad-who">{admin.email}</div>
        <div className="ad-role">管理员</div>
      </div>
    </div>
  );

  return (
    <AdminShell badges={badges} brand={brand} foot={foot}>
      {children}
    </AdminShell>
  );
}
