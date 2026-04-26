"use client";

import type { ReactNode } from "react";

export type V2NavKey = "create" | "projects" | "explore" | "portfolio" | "learn";
export type V2Mode = "basic" | "pro";

export function V2TopBar({
  mode,
  onModeChange,
  current,
  onNavigate
}: {
  mode: V2Mode;
  onModeChange: (m: V2Mode) => void;
  current: V2NavKey;
  onNavigate: (k: V2NavKey) => void;
}) {
  const items: Array<{ key: V2NavKey; label: string; proOnly?: boolean }> = [
    { key: "create", label: "创作" },
    { key: "projects", label: "项目", proOnly: true },
    { key: "portfolio", label: "作品集" },
    { key: "explore", label: "探索" },
    { key: "learn", label: "教程" }
  ];
  return (
    <header className="v2-topbar">
      <div className="v2-brand">
        Lumio<small>v2</small>
      </div>
      <nav className="v2-nav">
        {items
          .filter((it) => mode === "pro" || !it.proOnly)
          .map((it) => (
            <button
              key={it.key}
              type="button"
              className={current === it.key ? "is-on" : ""}
              onClick={() => onNavigate(it.key)}
            >
              {it.label}
            </button>
          ))}
      </nav>
      <div className="v2-mode" role="tablist" aria-label="UI 模式">
        <button
          type="button"
          className={mode === "basic" ? "is-on" : ""}
          onClick={() => onModeChange("basic")}
        >
          普通
        </button>
        <button
          type="button"
          className={mode === "pro" ? "is-on" : ""}
          onClick={() => onModeChange("pro")}
        >
          专业
        </button>
      </div>
    </header>
  );
}

export function V2Page({
  title,
  subtitle,
  children
}: {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="v2-page v2-fadein">
      {title && <h1 className="v2-page-h1">{title}</h1>}
      {subtitle && <p className="v2-page-sub">{subtitle}</p>}
      {children}
    </div>
  );
}
