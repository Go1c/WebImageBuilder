import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useThemeStore } from "@/stores/use-theme-store";

/**
 * UnifiedTopbar — a visual replica of the main Lumio Next site's `.studio-*`
 * topbar (src/components/AppShell.tsx + src/app/globals.css), rendered on the
 * canvas-app's NON-editor pages so the SPA reads as the same product as the
 * main studio.
 *
 * Cross-app linking rule (see task brief):
 * - Links to MAIN-site routes (探索 / 作品集 / 提示词库 / 教程 / brand / 登录)
 *   use a PLAIN <a href> so the browser does a full navigation and LEAVES the
 *   SPA back to the Next app.
 * - The 无限画布 item stays inside the SPA, so it uses react-router <Link>.
 *
 * All markup is wrapped in `.lumio-shell` so the scoped CSS (unified-shell.css)
 * cannot bleed into the canvas editor's own theme.
 */

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

function ThemeToggle() {
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const dark = theme === "dark";

    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(dark ? "light" : "dark")}
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
 * Session shape returned by the MAIN app's same-origin `/api/sub2api/session`
 * endpoint. The canvas SPA is served under /canvas on the SAME origin as the
 * Next app (img.lumio.games), and login is cookie-based, so we can read the
 * live session with a plain same-origin fetch (cookies included by default).
 */
interface SessionUser {
    email: string;
    username?: string;
    balance: number;
}

interface SessionState {
    authenticated: boolean;
    user?: SessionUser;
}

/**
 * AccountArea — renders the topbar's `.studio-account` right slot, reflecting
 * the REAL login state read from the main site's session cookie.
 *
 * States:
 * - loading (initial): show the 登录 pill as the safe default — never flash a
 *   fake logged-in avatar before the session resolves.
 * - authenticated + user: green 余额 balance pill (only when balance is finite)
 *   + an avatar <a> linking back to "/" (the main studio, where the full
 *   account menu lives). No dropdown here by design.
 * - not authenticated / fetch failed: the 登录 pill.
 */
function AccountArea() {
    // `undefined` = still loading; treat as logged-out default until resolved.
    const [session, setSession] = useState<SessionState | undefined>(undefined);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/sub2api/session", { credentials: "same-origin" })
            .then((res) => (res.ok ? (res.json() as Promise<SessionState>) : null))
            .then((data) => {
                if (cancelled) return;
                // Network/parse issues or a non-authenticated body → treat as logged-out.
                setSession(data && typeof data.authenticated === "boolean" ? data : { authenticated: false });
            })
            .catch(() => {
                if (!cancelled) setSession({ authenticated: false });
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const user = session?.authenticated ? session.user : undefined;

    if (user) {
        const initial = (user.email.trim().charAt(0) || "L").toUpperCase();
        const showBalance = typeof user.balance === "number" && Number.isFinite(user.balance);
        return (
            <>
                <ThemeToggle />
                {showBalance ? <span className="balance-pill">余额 ${user.balance.toFixed(2)}</span> : null}
                {/* Avatar links back to the MAIN studio "/" (full account menu lives there). */}
                <a className="account-avatar" href="/" aria-label="账户中心" title={user.email}>
                    {initial}
                </a>
            </>
        );
    }

    // Loading default + not-authenticated both render the 登录 pill.
    return (
        <>
            <ThemeToggle />
            <a className="login-pill" href="/">
                登录
            </a>
        </>
    );
}

export function UnifiedTopbar() {
    const { pathname } = useLocation();
    // 无限画布 is "current" whenever we're on any SPA (canvas-app) route.
    const canvasActive = true; // Rendered only on SPA pages, so the SPA tab is always the current context.
    // pathname retained for potential per-route selection nuance; kept simple here.
    void pathname;

    return (
        <div className="lumio-shell">
            <header className="studio-topbar">
                <div className="studio-brand-group">
                    {/* Brand → back to the MAIN studio (plain anchor leaves the SPA). */}
                    <a className="studio-brand" href="/" aria-label="LumioImageStudio">
                        <span className="studio-brand-mark">
                            <SparkleMark />
                        </span>
                        <span>LumioImageStudio</span>
                    </a>
                </div>

                <nav className="studio-nav" aria-label="主导航">
                    {/* 探索 → MAIN site */}
                    <a className="nav-generate" href="/">
                        探索
                    </a>
                    {/* 无限画布 → stays in the SPA (react-router) */}
                    <Link className={canvasActive ? "studio-nav-canvas nav-canvas is-selected" : "studio-nav-canvas nav-canvas"} to="/">
                        无限画布<span className="nav-beta">Beta</span>
                    </Link>
                    {/* 视频创作台 → not live yet */}
                    <button type="button" disabled>
                        视频创作台<span className="nav-soon">即将上线</span>
                    </button>
                    {/* 作品集 → MAIN site */}
                    <a href="/portfolio">作品集</a>
                    {/* 提示词库 → MAIN site */}
                    <a href="/prompts">提示词库</a>
                    {/* 教程 → MAIN site */}
                    <a href="/">教程</a>
                </nav>

                <div className="studio-account">
                    <AccountArea />
                </div>
            </header>
        </div>
    );
}
