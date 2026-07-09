"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

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

export function ErrorState({ message }: { message: string }) {
  return <div className="ad-empty">加载失败：{message}</div>;
}

export function Empty({ message = "暂无数据" }: { message?: string }) {
  return <div className="ad-empty">{message}</div>;
}
