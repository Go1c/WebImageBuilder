"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";

export type PillTone = "good" | "warn" | "crit" | "neutral" | "accent";

export function Pill({ tone, children, plain }: { tone: PillTone; children: ReactNode; plain?: boolean }) {
  return <span className={`ad-pill ${tone}${plain ? " plain" : ""}`}>{children}</span>;
}

export function SectionHead({
  title,
  desc,
  children
}: {
  title: string;
  desc?: string;
  children?: ReactNode;
}) {
  return (
    <div className="ad-section-head">
      <div className="lead">
        <h2>{title}</h2>
        {desc ? <p>{desc}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Kpi({
  label,
  value,
  unit,
  delta,
  deltaTone = "flat",
  valueTone
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  valueTone?: string;
}) {
  return (
    <div className="ad-kpi">
      <div className="label">{label}</div>
      <div className="val ad-tnum" style={valueTone ? { color: valueTone } : undefined}>
        {value}
        {unit ? <small>{unit}</small> : null}
      </div>
      {delta ? <span className={`ad-delta ${deltaTone}`}>{delta}</span> : null}
    </div>
  );
}

export function useAdminData<T>(url: string): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url, { credentials: "include" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error?.message || `请求失败 (${res.status})`);
        }
        return body as T;
      })
      .then((body) => {
        if (!cancelled) {
          setData(body);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url, nonce]);

  return { data, loading, error, reload };
}

export async function adminAction(url: string, body?: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `操作失败 (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "网络错误" };
  }
}

export function Loading() {
  return <div className="ad-loading">加载中…</div>;
}

// ---- EmptyState ×3（.adx-empty / .celebrate / .error）----

function EmptyGlyph({ variant }: { variant: "empty" | "celebrate" | "error" }) {
  if (variant === "celebrate") {
    return <span style={{ fontSize: 22, lineHeight: 1 }}>🎉</span>;
  }
  if (variant === "error") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 4v5" />
    </svg>
  );
}

export function EmptyState({
  variant = "empty",
  title,
  desc,
  action
}: {
  variant?: "empty" | "celebrate" | "error";
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`adx-empty${variant === "celebrate" ? " celebrate" : variant === "error" ? " error" : ""}`}>
      <div className="glyph">
        <EmptyGlyph variant={variant} />
      </div>
      <h4>{title}</h4>
      {desc ? <p>{desc}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      variant="error"
      title="加载失败"
      desc={`这不是空数据，是请求出错：${message}`}
      action={onRetry ? <button className="ad-btn sm" onClick={onRetry}>重试</button> : undefined}
    />
  );
}

export function Empty({ message = "暂无数据" }: { message?: string }) {
  const celebrate = message.includes("🎉");
  return (
    <EmptyState
      variant={celebrate ? "celebrate" : "empty"}
      title={message.replace("🎉", "").trim() || "暂无数据"}
    />
  );
}

// ---- ConfirmDialog（替换 window.confirm / alert）----

type ConfirmSpec = {
  title: string;
  desc?: string;
  impact?: string;
  impactTone?: "warn" | "crit";
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({ spec, onClose }: { spec: ConfirmSpec | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const open = !!spec;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const confirm = async () => {
    if (!spec) return;
    setBusy(true);
    try {
      await spec.onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const crit = spec?.impactTone === "crit";

  return (
    <div className={`adx-dialog-scrim${open ? " open" : ""}`} onClick={() => !busy && onClose()}>
      {spec ? (
        <div className="adx-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <h3>{spec.title}</h3>
          {spec.desc ? <p className="desc">{spec.desc}</p> : null}
          {spec.impact ? (
            <div className={`adx-impact${crit ? " crit" : ""}`}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" style={{ flex: "none", marginTop: 1 }}>
                <path d="M12 3l9.5 16.5H2.5z" /><path d="M12 9.5v4M12 16.5v.3" />
              </svg>
              <span>{spec.impact}</span>
            </div>
          ) : null}
          <div className="adx-dialog-actions">
            <button className="ad-btn ghost" disabled={busy} onClick={onClose}>{spec.cancelLabel || "取消"}</button>
            <button className={`ad-btn ${crit ? "confirm-crit" : "primary"}`} disabled={busy} onClick={confirm}>
              {busy ? "处理中…" : spec.confirmLabel || "确认"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Hook that manages a single ConfirmDialog. Render `dialog` once at page root. */
export function useConfirm(): { confirm: (spec: ConfirmSpec) => void; dialog: ReactNode } {
  const [spec, setSpec] = useState<ConfirmSpec | null>(null);
  return {
    confirm: setSpec,
    dialog: <ConfirmDialog spec={spec} onClose={() => setSpec(null)} />
  };
}

// ---- Toast（.adx-toast）----

type ToastItem = { id: number; message: string; sub?: string; err?: boolean };
type ToastFn = (message: string, opts?: { sub?: string; err?: boolean }) => void;

const ToastCtx = createContext<ToastFn | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback<ToastFn>((message, opts) => {
    const id = ++seq.current;
    setItems((prev) => [...prev, { id, message, sub: opts?.sub, err: opts?.err }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="adx-toast-wrap" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`adx-toast${t.err ? " err" : ""}`}>
            <span>{t.message}</span>
            {t.sub ? <small className="ad-mono">{t.sub}</small> : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastFn {
  const fn = useContext(ToastCtx);
  // Fallback no-op if used outside a provider (keeps components safe to render).
  return fn || (() => undefined);
}

// ---- 诚实截断条（.adx-truncate-strip）----

export function TruncateStrip({
  shown,
  reason,
  href,
  linkLabel = "调整筛选 →"
}: {
  shown: number;
  reason: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="adx-truncate-strip">
      <span>仅显示最近 <strong>{shown}</strong> 条 · {reason}</span>
      {href ? <a href={href}>{linkLabel}</a> : null}
    </div>
  );
}

// ---- 统一分页器（.adx-pager）----

export function Pager({
  total,
  page,
  pageSize,
  onPage,
  totalLabel = "条"
}: {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  totalLabel?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // window of page numbers around current page
  const nums: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) nums.push(i);

  return (
    <div className="adx-pager">
      <span className="total ad-tnum">共 {total.toLocaleString("en-US")} {totalLabel} · 第 {page} / {totalPages} 页</span>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="上一页">‹</button>
      {nums.map((n) => (
        <button key={n} className={n === page ? "on" : ""} onClick={() => onPage(n)}>{n}</button>
      ))}
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="下一页">›</button>
    </div>
  );
}

// ---- 复制按钮 / mono 值（.adx-copy）----

export function CopyValue({ value, display }: { value: string; display?: string }) {
  const [done, setDone] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    } catch {
      // clipboard unavailable; silently ignore
    }
  };
  return (
    <span className="adx-copy">
      <code>{display ?? value}</code>
      <button type="button" onClick={copy} aria-label="复制" title={done ? "已复制" : "复制"}>
        {done ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ad-good)" strokeWidth="2.4"><path d="M5 12l5 5L20 6" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>
        )}
      </button>
    </span>
  );
}

// ---- 词表（逐字执行,01-admin §词表）----

export const ERROR_CODE_LABELS: Record<string, string> = {
  provider_error: "上游服务报错",
  quota_exhausted: "额度耗尽",
  rate_limited: "触发限流",
  internal_error: "站内错误"
};

export function errorCodeLabel(code: string | null | undefined): string {
  if (!code) return "未知错误";
  return ERROR_CODE_LABELS[code] || code;
}

export const SPEND_SOURCE_LABELS: Record<string, string> = {
  paid: "付费",
  invite: "邀请奖励",
  login: "登录赠送",
  anonymous: "匿名试用"
};

export function spendSourceLabel(source: string | null | undefined): string {
  if (!source) return "—";
  return SPEND_SOURCE_LABELS[source] || source;
}

export const ANNOUNCE_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  active: "生效中",
  ended: "已结束"
};
