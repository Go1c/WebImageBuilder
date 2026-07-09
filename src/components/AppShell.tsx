"use client";

import { useEffect, useState, type ReactNode } from "react";

export type AppShellActive = "探索" | "无限画布" | "作品集" | "提示词库";

type AppShellProps = {
  active: AppShellActive;
  /** The global-stats pill (studio passes its live one; standalone pages omit). */
  statsSlot?: ReactNode;
  /** The right-side account area (studio passes its full JSX; pages get the lean default login pill). */
  accountSlot?: ReactNode;
  /** If set, 探索 is a <button> calling this (in-workbench behavior); otherwise it links to "/". */
  onExplore?: () => void;
  /** If set, 教程 is a <button> calling this (opens the tutorials panel); otherwise it links to "/". */
  onTutorials?: () => void;
};

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

/**
 * Unified top shell shared by the studio workbench and the standalone pages
 * (探索 / 无限画布 / 作品集 / 提示词库). Renders the exact `.studio-*` topbar DOM the
 * production ImageStudio used, so existing studio markup / CSS is preserved, plus the
 * announcement bar wired to the public `/api/announcements` feed.
 *
 * Behavior-preserving by design: the studio passes its live stats pill and account
 * area (with all its session/quota state) via `statsSlot` / `accountSlot`, and its
 * in-workbench 探索 / 教程 handlers via `onExplore` / `onTutorials`. Standalone pages
 * omit them and get lean defaults (a plain 登录 pill, and links back to "/").
 */
export default function AppShell({ active, statsSlot, accountSlot, onExplore, onTutorials }: AppShellProps) {
  const isActive = (name: AppShellActive) => active === name;

  return (
    <>
      <header className="studio-topbar">
        <div className="studio-brand-group">
          <a className="studio-brand" href="/" aria-label="LumioImageStudio">
            <span className="studio-brand-mark">
              <SparkleMark />
            </span>
            <span>LumioImageStudio</span>
          </a>
          {statsSlot}
        </div>

        <nav className="studio-nav" aria-label="主导航">
          {onExplore ? (
            <button
              type="button"
              className={isActive("探索") ? "nav-generate is-selected" : "nav-generate"}
              onClick={onExplore}
            >
              探索
            </button>
          ) : (
            <a
              className={isActive("探索") ? "nav-generate is-selected" : "nav-generate"}
              href="/"
            >
              探索
            </a>
          )}
          <a
            className={
              isActive("无限画布")
                ? "studio-nav-canvas nav-canvas is-selected"
                : "studio-nav-canvas nav-canvas"
            }
            href="/canvas"
          >
            无限画布<span className="studio-nav-beta nav-beta">Beta</span>
          </a>
          <button type="button" disabled>
            视频创作台<span className="nav-soon">即将上线</span>
          </button>
          <a className={isActive("作品集") ? "is-selected" : ""} href="/portfolio">
            作品集
          </a>
          <a className={isActive("提示词库") ? "is-selected" : ""} href="/prompts">
            提示词库
          </a>
          {onTutorials ? (
            <button type="button" onClick={onTutorials}>
              教程
            </button>
          ) : (
            <a href="/">教程</a>
          )}
        </nav>

        <div className="studio-account">
          {accountSlot ?? (
            <a className="login-pill" href="/">
              登录
            </a>
          )}
        </div>
      </header>

      <AnnouncementBar />
    </>
  );
}

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  placement: string;
  startsAt: string | null;
  endsAt: string | null;
};

const announceDismissedStorageKey = "lumio:announce-dismissed";

function readDismissedIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(announceDismissedStorageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissedIds(ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(announceDismissedStorageKey, JSON.stringify(ids));
  } catch {
    // Storage may be unavailable (private mode); dismissals are best-effort only.
  }
}

/**
 * Public announcement banner. Fetches active `home_banner` announcements from the
 * public `/api/announcements` feed, renders one at a time with an "i / N" queue
 * indicator, and persists per-id dismissals to localStorage so a closed announcement
 * never reappears on this device. Fails silently (no banner) on fetch error, and
 * renders nothing once every row is dismissed.
 */
function AnnouncementBar() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setDismissed(readDismissedIds());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    fetch("/api/announcements", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("bad status"))))
      .then((payload: unknown) => {
        if (cancelled) {
          return;
        }
        const fetched = (payload as { rows?: unknown })?.rows;
        if (Array.isArray(fetched)) {
          setRows(fetched.filter((row): row is AnnouncementRow => Boolean(row) && typeof row === "object" && typeof (row as AnnouncementRow).id === "string"));
        }
      })
      .catch(() => {
        // Fail silently: no banner is a valid state.
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const dismissedSet = new Set(dismissed);
  const visibleRows = rows.filter((row) => !dismissedSet.has(row.id));

  if (visibleRows.length === 0) {
    return null;
  }

  const current = visibleRows[0];
  const text = (current.body || current.title || "").trim();
  if (!text) {
    return null;
  }

  const dismissCurrent = () => {
    setDismissed((prev) => {
      const next = prev.includes(current.id) ? prev : [...prev, current.id];
      writeDismissedIds(next);
      return next;
    });
  };

  return (
    <div className="announce-bar">
      <span className="announce-tag">公告</span>
      <p>{text}</p>
      {visibleRows.length > 1 ? (
        <span className="announce-queue">1 / {visibleRows.length}</span>
      ) : null}
      <button type="button" className="announce-close" onClick={dismissCurrent} aria-label="关闭公告">
        ✕
      </button>
    </div>
  );
}
