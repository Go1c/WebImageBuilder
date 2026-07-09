"use client";

import { useState, type ReactNode } from "react";
import { AdminNav, type NavBadges } from "./AdminNav";
import { ToastProvider } from "./ui";

/**
 * Client shell for the admin backend:
 * - wraps everything in a ToastProvider so any page can useToast()
 * - renders the sidebar (with a mobile drawer toggle) and a ☰ menu button
 *   exposed to the topbar via a fixed-position button on ≤1080px.
 */
export function AdminShell({
  badges,
  brand,
  foot,
  children
}: {
  badges: NavBadges;
  brand: ReactNode;
  foot: ReactNode;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="ad-root">
        <button
          className="adx-menu-btn"
          style={{ position: "fixed", top: 12, left: 12, zIndex: 62 }}
          onClick={() => setNavOpen((v) => !v)}
          aria-label="菜单"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div
          className={`adx-side-scrim${navOpen ? " open" : ""}`}
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
        <aside className={`ad-side${navOpen ? " open" : ""}`}>
          {brand}
          <AdminNav badges={badges} onNavigate={() => setNavOpen(false)} />
          {foot}
        </aside>
        <div className="ad-main">{children}</div>
      </div>
    </ToastProvider>
  );
}
