"use client";

import { useEffect, type ReactNode } from "react";

export function Drawer({
  open,
  title,
  sub,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  sub?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`ad-scrim${open ? " open" : ""}`} onClick={onClose} aria-hidden />
      <aside className={`ad-drawer${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!open}>
        <div className="ad-drawer-head">
          <div>
            <h3>{title}</h3>
            {sub ? <div className="ad-crumb">{sub}</div> : null}
          </div>
          <button className="ad-btn ghost sm" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="ad-drawer-body">{open ? children : null}</div>
      </aside>
    </>
  );
}
