"use client";

import { useRouter } from "next/navigation";
import { V2TopBar, V2Page } from "./V2Chrome";
import { ProjectsGrid } from "./ProjectCard";
import { useV2Sessions, useV2UIMode } from "./hooks";

export function V2ProjectsPage() {
  const [mode, setMode] = useV2UIMode();
  const router = useRouter();
  const { sessions, create } = useV2Sessions();

  return (
    <div className="v2-app">
      <V2TopBar
        mode={mode}
        onModeChange={setMode}
        current="projects"
        onNavigate={(k) => {
          if (k === "projects") return;
          window.location.assign(k === "create" ? "/v2" : `/v2#${k}`);
        }}
      />
      <V2Page title="项目" subtitle="把同一个世界观下的图归到一起。">
        <ProjectsGrid
          projects={sessions}
          onOpen={(id) => router.push(`/v2/projects/${id}`)}
          onCreate={async () => {
            const t = window.prompt("项目名称");
            if (!t) return;
            const id = await create(t);
            if (id) router.push(`/v2/projects/${id}`);
          }}
        />
      </V2Page>
    </div>
  );
}
