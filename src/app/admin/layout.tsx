import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getServerAdminIdentity } from "@/server/admin/serverAuth";
import { getPendingCounts } from "@/server/admin/queries/overview";
import { AdminNav } from "./_components/AdminNav";
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
          <h1>403 · 需要管理员权限</h1>
          <p>你的账号不在管理员白名单中。如需访问，请联系系统管理员将你的邮箱加入 ADMIN_EMAILS。</p>
          <a className="ad-btn" href="/">返回生图站</a>
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

  return (
    <div className="ad-root">
      <aside className="ad-side">
        <div className="ad-brand">
          <div className="ad-logo">L</div>
          <div>
            <div className="ad-brand-name">Lumio Admin</div>
            <div className="ad-brand-sub">生图站 · 管理后台</div>
          </div>
        </div>
        <AdminNav badges={badges} />
        <div className="ad-side-foot">
          <div className="ad-avatar">{initial}</div>
          <div>
            <div className="ad-who">{admin.email}</div>
            <div className="ad-role">管理员</div>
          </div>
        </div>
      </aside>
      <div className="ad-main">{children}</div>
    </div>
  );
}
