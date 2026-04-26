"use client";

import { useState } from "react";
import { V2TopBar, V2Page, type V2NavKey } from "./V2Chrome";
import { PromptHero } from "./PromptHero";
import { StyleCardGrid } from "./StyleCardGrid";
import { BatchCanvas } from "./BatchCanvas";
import { Inspector, defaultInspectorParams, type InspectorParams } from "./Inspector";
import { ProjectsGrid } from "./ProjectCard";
import { useV2Generate, useV2Sessions, useV2UIMode } from "./hooks";

const MODELS = [
  { key: "gpt-image-2" as const, label: "GPT Image 2" },
  { key: "gemini-image" as const, label: "Gemini" }
];

export function V2App({
  initialPage = "create",
  forceSessionId
}: {
  initialPage?: V2NavKey;
  forceSessionId?: string;
} = {}) {
  const [mode, setMode] = useV2UIMode();
  const [page, setPage] = useState<V2NavKey>(initialPage);
  const [style, setStyle] = useState("none");
  const [params, setParams] = useState<InspectorParams>(defaultInspectorParams);
  const [locked, setLocked] = useState<Partial<Record<keyof InspectorParams, boolean>>>({});
  const gen = useV2Generate();
  const { sessions, create } = useV2Sessions();

  function navigate(k: V2NavKey) {
    if (k === "projects") {
      window.location.assign("/v2/projects");
      return;
    }
    setPage(k);
  }

  function suffixWithStyle(prompt: string): string {
    if (style === "none") return prompt;
    const map: Record<string, string> = {
      concept: "游戏概念图风格, 厚涂, 电影感光影",
      anime: "二次元动漫风格, 干净线稿, 细腻上色",
      oil: "厚涂油画风格, 颜料厚度感, 笔触可见",
      ink: "中式水墨风格, 留白, 写意",
      "ui-icon": "UI 图标风格, 简洁色块, 平面化",
      pixel: "像素艺术风格, 16-bit 复古",
      iso: "等距 3D 风格, 干净几何"
    };
    const tag = map[style];
    return tag ? `${prompt}, ${tag}` : prompt;
  }

  function paramsForGenerate() {
    const out: { seed?: number; cfg?: number; steps?: number } = {};
    if (params.seed !== "auto") out.seed = params.seed;
    if (locked.cfg) out.cfg = params.cfg;
    if (locked.steps) out.steps = params.steps;
    return out;
  }

  return (
    <div className="v2-app">
      <V2TopBar mode={mode} onModeChange={setMode} current={page} onNavigate={navigate} />

      {page === "create" && (
        <V2Page
          title={mode === "basic" ? "你想画什么？" : "命令栏"}
          subtitle={mode === "basic" ? "写一句描述，挑个风格，按生成。" : "支持批量、Inspector 锁定 Seed/CFG/Steps；锁定后参数会一起送到生成接口。"}
        >
          <PromptHero
            models={MODELS}
            defaultCount={mode === "pro" ? 4 : 1}
            showCountControl={mode === "pro"}
            busy={gen.busy}
            onSubmit={(input) => gen.run({
              ...input,
              prompt: suffixWithStyle(input.prompt),
              ...paramsForGenerate(),
              ...(forceSessionId ? { sessionId: forceSessionId } : {})
            })}
          />

          {mode === "basic" ? (
            <>
              <h2 style={{ margin: "32px 0 8px", fontSize: 14, fontWeight: 600, color: "var(--studio-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                选个风格
              </h2>
              <StyleCardGrid selected={style} onSelect={setStyle} />

              {gen.cells.length > 0 && (
                <div style={{ marginTop: 32, maxWidth: 880, marginLeft: "auto", marginRight: "auto" }}>
                  <BatchCanvas cells={gen.cells} cols={2} />
                </div>
              )}
            </>
          ) : (
            <div className="v2-pro-layout" style={{ marginTop: 24 }}>
              <aside className="v2-side-panel">
                <h3>风格</h3>
                <StyleCardGrid selected={style} onSelect={setStyle} />
              </aside>

              <main>
                {gen.error && (
                  <div className="v2-empty" style={{ marginBottom: 16, color: "var(--studio-red)" }}>
                    <h2>生成失败</h2>
                    <p>{gen.error}</p>
                  </div>
                )}
                {gen.cells.length === 0 ? (
                  <div className="v2-empty">
                    <h2>等待你的第一次生成</h2>
                    <p>左侧选风格，顶部输入 prompt，按生成会铺 4 张。</p>
                  </div>
                ) : (
                  <BatchCanvas cells={gen.cells} cols={2} />
                )}
              </main>

              <aside>
                <Inspector
                  value={params}
                  locked={locked}
                  onChange={setParams}
                  onToggleLock={(k) => setLocked((l) => ({ ...l, [k]: !l[k] }))}
                />
                {gen.remaining != null && (
                  <div style={{ marginTop: 12, padding: 10, background: "var(--studio-bg-soft)", borderRadius: 10, fontSize: 12, color: "var(--studio-muted)", textAlign: "center" }}>
                    剩余额度: <strong style={{ color: "var(--studio-text)", fontFamily: "var(--studio-font-mono)" }}>{gen.remaining}</strong>
                  </div>
                )}
              </aside>
            </div>
          )}
        </V2Page>
      )}

      {page === "portfolio" && (
        <V2Page title="作品集" subtitle="你生成过的所有作品，最近优先。">
          {gen.cells.length > 0 ? (
            <div style={{ maxWidth: 1100 }}>
              <BatchCanvas cells={gen.cells} cols={4} />
            </div>
          ) : (
            <div className="v2-empty"><h2>还没有作品</h2><p>到「创作」试试看。</p></div>
          )}
        </V2Page>
      )}

      {page === "explore" && (
        <V2Page title="探索" subtitle="社区精选 — P3 阶段开放。" />
      )}

      {page === "learn" && (
        <V2Page title="教程" subtitle="prompt 工程入门 / 风格手册 — P3 阶段开放。" />
      )}
    </div>
  );
}
