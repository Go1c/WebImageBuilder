"use client";

import { useEffect, useState, useCallback } from "react";

export type GeneratedImage = { key: string; url: string; mimeType: string };

export type V2GenerateInput = {
  prompt: string;
  model: "gpt-image-2" | "gemini-image";
  count: number;
  aspect: "1:1" | "3:4" | "4:3";
  // Pro-mode reproducibility params
  seed?: number;
  cfg?: number;
  steps?: number;
  negativePrompt?: string;
  sessionId?: string;
};

export type UseGenerateState = {
  busy: boolean;
  cells: Array<{ id: string; state: "loading" | "done" | "error"; imageUrl?: string; meta?: string; errorMessage?: string }>;
  error: string | null;
  remaining: number | null;
  taskId: string | null;
};

export function useV2Generate() {
  const [state, setState] = useState<UseGenerateState>({
    busy: false,
    cells: [],
    error: null,
    remaining: null,
    taskId: null
  });

  const run = useCallback(async (input: V2GenerateInput) => {
    const placeholderIds = Array.from({ length: input.count }, (_, i) => `pending-${Date.now()}-${i}`);
    setState((s) => ({
      ...s,
      busy: true,
      error: null,
      taskId: null,
      cells: placeholderIds.map((id) => ({ id, state: "loading" }))
    }));

    const size =
      input.aspect === "3:4" ? "1024x1536" :
      input.aspect === "4:3" ? "1536x1024" :
      "1024x1024";

    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: input.prompt,
          mode: "text-to-image",
          model: input.model,
          size,
          quality: "standard",
          count: input.count,
          referenceAssets: [],
          // Pro-mode params (server-side schema accepts these as optional)
          ...(input.seed != null ? { seed: input.seed } : {}),
          ...(input.cfg != null ? { cfg: input.cfg } : {}),
          ...(input.steps != null ? { steps: input.steps } : {}),
          ...(input.negativePrompt ? { negativePrompt: input.negativePrompt } : {}),
          ...(input.sessionId ? { sessionId: input.sessionId } : {})
        })
      });
      const data: unknown = await resp.json();
      if (!resp.ok || !data || typeof data !== "object") {
        const err = (data as { error?: { message?: string } })?.error?.message ?? `HTTP ${resp.status}`;
        throw new Error(err);
      }
      const ok = data as { taskId?: string; images: GeneratedImage[]; quota?: { remaining: number } };
      setState({
        busy: false,
        error: null,
        taskId: ok.taskId ?? null,
        remaining: ok.quota?.remaining ?? null,
        cells: ok.images.map((img, i) => ({
          id: img.key || `done-${i}`,
          state: "done",
          imageUrl: img.url
        }))
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "生成失败";
      setState((s) => ({
        ...s,
        busy: false,
        error: msg,
        cells: s.cells.map((c) => ({ ...c, state: "error", errorMessage: msg }))
      }));
    }
  }, []);

  return { ...state, run };
}

export function useV2Sessions() {
  const [sessions, setSessions] = useState<Array<{
    id: string; title: string; taskCount: number; palette: string[];
    recentImages?: string[]; lastTaskAt?: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/sessions");
      const data = await r.json();
      setSessions(
        Array.isArray(data?.sessions)
          ? data.sessions.map((s: Record<string, unknown>) => ({
              id: String(s.id),
              title: String(s.title ?? "未命名项目"),
              taskCount: Number(s.taskCount ?? 0),
              palette: Array.isArray(s.palette) ? s.palette as string[] : [],
              recentImages: Array.isArray(s.recentImages) ? s.recentImages as string[] : [],
              lastTaskAt: (s.lastTaskAt as string | null) ?? null
            }))
          : []
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (title?: string) => {
    const r = await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title })
    });
    const data = await r.json();
    await refresh();
    return data?.id as string | undefined;
  }, [refresh]);

  return { sessions, loading, refresh, create };
}

export type ProjectTask = {
  id: string;
  prompt: string;
  modelKey: string;
  status: string;
  createdAt: string;
  params: Record<string, unknown> | null;
  assets: Array<{ id: string; type: string; url: string; width: number | null; height: number | null }>;
};

export function useV2Project(sessionId: string | undefined) {
  const [project, setProject] = useState<{ id: string; title: string; description: string | null; palette: string[] } | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`),
        fetch(`/api/sessions/${sessionId}/tasks`)
      ]);
      if (!pRes.ok) throw new Error(`项目加载失败 (${pRes.status})`);
      const pData = await pRes.json();
      const tData = tRes.ok ? await tRes.json() : { tasks: [] };
      setProject(pData?.session ?? null);
      setTasks(Array.isArray(tData?.tasks) ? tData.tasks : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { project, tasks, loading, error, refresh };
}

export function useV2UIMode(): ["basic" | "pro", (m: "basic" | "pro") => void] {
  const [mode, setMode] = useState<"basic" | "pro">("basic");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("v2:mode") : null;
    if (saved === "pro" || saved === "basic") setMode(saved);
  }, []);
  const update = useCallback((m: "basic" | "pro") => {
    setMode(m);
    if (typeof window !== "undefined") window.localStorage.setItem("v2:mode", m);
  }, []);
  return [mode, update];
}
