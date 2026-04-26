"use client";

import type { CSSProperties } from "react";

export type ProjectCardData = {
  id: string;
  title: string;
  taskCount: number;
  palette: string[];
  coverImageUrl?: string | null;
  recentImages?: string[];
  lastTaskAt?: string | null;
};

export function ProjectCard({
  project,
  onOpen
}: {
  project: ProjectCardData;
  onOpen: (id: string) => void;
}) {
  const cover = project.coverImageUrl ?? project.recentImages?.[0];
  return (
    <article
      className="v2-project-card"
      onClick={() => onOpen(project.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(project.id);
      }}
    >
      <div
        className="v2-project-card-cover"
        style={
          cover
            ? ({ backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" } as CSSProperties)
            : undefined
        }
      >
        {project.palette.length > 0 && (
          <div className="palette">
            {project.palette.slice(0, 5).map((c, i) => (
              <span key={i} className="swatch" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>
      <div className="v2-project-card-body">
        <div className="v2-project-card-title">{project.title}</div>
        <div className="v2-project-card-meta">
          {project.taskCount} 张
          {project.lastTaskAt &&
            ` · ${formatRelativeTime(project.lastTaskAt)}`}
        </div>
      </div>
    </article>
  );
}

export function ProjectsGrid({
  projects,
  onOpen,
  onCreate
}: {
  projects: ProjectCardData[];
  onOpen: (id: string) => void;
  onCreate?: () => void;
}) {
  return (
    <div className="v2-projects-grid">
      {onCreate && (
        <button
          type="button"
          className="v2-project-card"
          onClick={onCreate}
          style={{
            border: "1px dashed var(--studio-line-strong)",
            background: "transparent",
            display: "grid",
            placeItems: "center",
            minHeight: 200,
            cursor: "pointer"
          }}
        >
          <div style={{ textAlign: "center", color: "var(--studio-muted)" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>+</div>
            <div style={{ fontSize: 13 }}>新建项目</div>
          </div>
        </button>
      )}
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} onOpen={onOpen} />
      ))}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}
