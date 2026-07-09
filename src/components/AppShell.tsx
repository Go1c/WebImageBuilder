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
            <>
              <ThemeToggle />
              <a className="login-pill" href="/">
                登录
              </a>
            </>
          )}
        </div>
      </header>

      <AnnouncementBar />
    </>
  );
}

/**
 * Sun/moon theme toggle matching the design shell. Flips `<html data-theme>` and
 * persists to `localStorage["lumio-theme"]` (same key the layout bootstrap reads),
 * so the choice survives reloads without a dark-mode flash.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    try {
      if (next) {
        document.documentElement.setAttribute("data-theme", "dark");
        window.localStorage.setItem("lumio-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
        window.localStorage.setItem("lumio-theme", "light");
      }
    } catch {
      // localStorage may be unavailable (private mode); the in-page toggle still applies.
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? "切换到浅色主题" : "切换到深色主题"}
      title={dark ? "浅色主题" : "深色主题"}
    >
      {dark ? (
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}

/**
 * Avatar button + dropdown account menu matching the design shell. Self-contained
 * open state (closes on outside-click / Esc) so the host doesn't need to thread it.
 * Replaces the old email-pill + 退出 pair for logged-in users.
 */
export function AccountMenu({
  email,
  accountCenterUrl,
  onLogout
}: {
  email: string;
  accountCenterUrl: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const initial = (email.trim()[0] || "L").toUpperCase();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest(".account-menu-wrap")) {
        return;
      }
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="account-menu-wrap" style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        className="account-avatar"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="账户菜单"
      >
        {initial}
      </button>
      <div className={open ? "account-menu open" : "account-menu"} role="menu">
        <div className="menu-mail" title={email}>
          {email}
        </div>
        <a href={accountCenterUrl} target="_blank" rel="noreferrer" role="menuitem">
          账户中心
        </a>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onLogout();
          }}
        >
          退出登录
        </button>
        <div className="menu-version">Lumio Image Studio</div>
      </div>
    </span>
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
