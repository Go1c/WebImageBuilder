"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavBadges = {
  shares?: number;
  safety?: number;
  errors?: number;
};

type NavItem = { href: string; label: string; icon: ReactNode; badgeKey?: keyof NavBadges };
type NavGroup = { label?: string; items: NavItem[] };

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {path}
  </svg>
);

const GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/admin", label: "总览", icon: icon(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>) }
    ]
  },
  {
    label: "内容运营",
    items: [
      { href: "/admin/materials", label: "素材库", icon: icon(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l4-4 4 4 4-5 6 6" /><circle cx="8.5" cy="8.5" r="1.5" /></>) },
      { href: "/admin/shares", label: "分享管理", badgeKey: "shares", icon: icon(<><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" /></>) },
      { href: "/admin/safety", label: "内容安全", badgeKey: "safety", icon: icon(<><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9.5 12l1.8 1.8L15 10" /></>) },
      { href: "/admin/announcements", label: "公告运营", icon: icon(<><path d="M3 11v2a1 1 0 001 1h3l6 4V6L7 10H4a1 1 0 00-1 1z" /><path d="M18 8a5 5 0 010 8" /></>) }
    ]
  },
  {
    label: "用户与增长",
    items: [
      { href: "/admin/users", label: "用户记录", icon: icon(<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" /><path d="M16 5.5a3 3 0 010 5.6M17.5 14.6c2.2.7 3.5 2.6 3.5 5.4" /></>) },
      { href: "/admin/invites", label: "邀请裂变", icon: icon(<><path d="M12 3v18M3 8l9-5 9 5M5 10v7a1 1 0 001 1h12a1 1 0 001-1v-7" /></>) }
    ]
  },
  {
    label: "监控与治理",
    items: [
      { href: "/admin/errors", label: "报错监控", badgeKey: "errors", icon: icon(<><path d="M12 3l9.5 16.5H2.5z" /><path d="M12 9.5v4M12 16.5v.3" /></>) },
      { href: "/admin/cost", label: "成本看板", icon: icon(<><path d="M4 19V5M4 19h16M8 15l3.5-4 3 2.5L20 7" /></>) },
      { href: "/admin/audit", label: "审计日志", icon: icon(<><path d="M9 5h6M9 5a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2M9 5V4a1 1 0 011-1h4a1 1 0 011 1v1M9.5 11l1.5 1.5L14 9.5M9.5 16h5" /></>) }
    ]
  }
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminNav({ badges }: { badges?: NavBadges }) {
  const pathname = usePathname() || "/admin";

  return (
    <nav className="ad-nav">
      {GROUPS.map((group, gi) => (
        <div className="ad-nav-group" key={gi}>
          {group.label ? <div className="ad-nav-label">{group.label}</div> : null}
          {group.items.map((item) => {
            const badge = item.badgeKey ? badges?.[item.badgeKey] : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ad-nav-item${isActive(pathname, item.href) ? " active" : ""}`}
              >
                {item.icon}
                {item.label}
                {badge ? <span className="ad-badge">{badge}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
