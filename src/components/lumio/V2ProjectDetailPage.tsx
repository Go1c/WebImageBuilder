"use client";

import { useMemo } from "react";
import { V2TopBar, V2Page } from "./V2Chrome";
import { useV2Project, useV2UIMode } from "./hooks";
import { BatchCanvas } from "./BatchCanvas";

export function V2ProjectDetailPage({ id }: { id: string }) {
  const [mode, setMode] = useV2UIMode();
  const { project, tasks, loading, error } = useV2Project(id);

  const cells = useMemo(() => {
    return tasks.flatMap((t) =>
      t.assets.filter((a) => a.type === "result").map((a) => ({
        id: a.id,
        state: "done" as const,
        imageUrl: a.url,
        meta: t.modelKey
      }))
    );
  }, [tasks]);

  return (
    <div className="v2-app">
      <V2TopBar
        mode={mode}
        onModeChange={setMode}
        current="projects"
        onNavigate={(k) => {
          if (k === "create") window.location.assign("/v2");
          else if (k === "projects") window.location.assign("/v2/projects");
          else window.location.assign(`/v2#${k}`);
        }}
      />

      <V2Page
        title={project?.title ?? (loading ? "加载中…" : "项目")}
        subtitle={project?.description ?? `共 ${tasks.length} 次生成 · ${cells.length} 张图`}
      >
        {error && (
          <div className="v2-empty" style={{ color: "var(--studio-red)" }}>
            <h2>加载失败</h2>
            <p>{error}</p>
          </div>
        )}

        {!error && (
          <>
            {project && project.palette?.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--studio-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>调色板</span>
                {project.palette.map((c, i) => (
                  <span
                    key={i}
                    title={c}
                    style={{
                      display: "inline-block",
                      width: 24, height: 24, borderRadius: 999,
                      background: c,
                      border: "1px solid rgba(0,0,0,0.1)"
                    }}
                  />
                ))}
              </div>
            )}

            <div style={{ marginBottom: 24, display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={() => window.location.assign(`/v2?project=${id}`)}
                className="v2-prompt__submit"
              >
                + 在此项目下生成
              </button>
            </div>

            {cells.length === 0 ? (
              <div className="v2-empty">
                <h2>{loading ? "加载中…" : "项目还没有作品"}</h2>
                <p>{loading ? "" : "点上面按钮，开始第一张生成。"}</p>
              </div>
            ) : (
              <BatchCanvas cells={cells} cols={4} virtualize />
            )}
          </>
        )}
      </V2Page>
    </div>
  );
}
