"use client";

import type { ReactNode } from "react";

export type AppShellActive = "探索" | "无限画布" | "作品集" | "提示词库";

function SparkleMark() {
  return (
    <svg
      aria-hidden="true"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8z" />
      <path d="M19 15l.7 1.9L21.5 17l-1.8.7L19 19.5l-.7-1.8L16.5 17l1.8-.4z" />
    </svg>
  );
}

function CoinMark(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9 9.5h4.2a1.8 1.8 0 010 3.6H9" />
    </svg>
  );
}

/**
 * Unified top shell for the new standalone pages (P4 提示词库 / P5 作品集).
 * Uses the same `.studio-*` class names the production ImageStudio topbar renders,
 * so these pages inherit the identical shell chrome from globals.css.
 *
 * Kept intentionally lean: no session / quota logic (that lives in ImageStudio).
 * `active` marks the current nav item as selected.
 */
export default function AppShell({ active }: { active: AppShellActive }) {
  const isActive = (name: AppShellActive) => active === name;
  const navigate = (href: string) => {
    if (typeof window !== "undefined") {
      window.location.href = href;
    }
  };

  return (
    <header className="studio-topbar">
      <div className="studio-brand-group">
        <a className="studio-brand" href="/" aria-label="LumioImageStudio">
          <span className="studio-brand-mark">
            <SparkleMark />
          </span>
          <span>LumioImageStudio</span>
        </a>
        <span className="global-stats-pill">
          <SparkleMark />
          <span>免费体验</span>
        </span>
      </div>

      <nav className="studio-nav" aria-label="主导航">
        <button
          type="button"
          className={`nav-generate${isActive("探索") ? " is-selected" : ""}`}
          onClick={() => navigate("/")}
        >
          探索
        </button>
        <button
          type="button"
          className={`studio-nav-canvas nav-canvas${isActive("无限画布") ? " is-selected" : ""}`}
          onClick={() => navigate("/canvas")}
        >
          无限画布<span className="studio-nav-beta nav-beta">Beta</span>
        </button>
        <button type="button" disabled>
          视频创作台<span className="nav-soon">即将上线</span>
        </button>
        <button
          type="button"
          className={isActive("作品集") ? "is-selected" : ""}
          onClick={() => navigate("/portfolio")}
        >
          作品集
        </button>
        <button
          type="button"
          className={isActive("提示词库") ? "is-selected" : ""}
          onClick={() => navigate("/prompts")}
        >
          提示词库
        </button>
        <button type="button" onClick={() => navigate("/")}>
          教程
        </button>
      </nav>

      <div className="studio-account">
        <span className="quota-pill">
          <CoinMark />
          免费体验
        </span>
        <a className="login-pill" href="/">
          登录
        </a>
      </div>
    </header>
  );
}
