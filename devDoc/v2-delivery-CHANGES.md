# v2 redesign — handoff notes (P0 + P1 + P2 + P3 stubs)

## What this batch contains

This is the **complete v2 redesign**, delivered as a sibling route at `/v2` (and `/v2/projects`, `/v2/projects/[id]`) so it doesn't touch your existing `/` (ImageStudio) flow. Toggle Basic / Pro from the top-right.

### File map

```
src/
  app/
    v2.css                                  # all v2 styles, scoped under .v2-app
    v2/page.tsx                             # /v2 — create page (Basic + Pro)
    v2/projects/page.tsx                    # /v2/projects — projects list
    v2/projects/[id]/page.tsx               # /v2/projects/:id — project detail
    api/sessions/[id]/tasks/route.ts        # NEW — list project tasks + assets

  components/lumio/
    V2App.tsx                               # main shell (create / portfolio / explore / learn)
    V2ProjectsPage.tsx                      # projects list page
    V2ProjectDetailPage.tsx                 # project detail page
    V2Chrome.tsx                            # top bar, nav, page shell, mode toggle
    PromptHero.tsx                          # large prompt input
    StyleCardGrid.tsx                       # 7 style chips
    BatchCanvas.tsx                         # 1–N grid + virtualization (>24 cells)
    Inspector.tsx                           # Pro-mode params with lock toggles
    ProjectCard.tsx                         # ProjectCard + ProjectsGrid
    hooks.ts                                # useV2Generate, useV2Sessions, useV2Project, useV2UIMode

  server/
    db/migrations/v2.sql                    # palette / cover / seed / cfg / steps / aspect
    domain/models.ts                        # +seed/cfg/steps/negativePrompt fields
    db/repositories.ts                      # createTask now stores v2 params in JSON
    export/psd.ts                           # P3 stub — needs ag-psd
    providers/comfy.ts                      # P3 stub — ComfyUI workflow bridge

scripts/
  migrate.mjs                               # also applies v2.sql when present
```

### What's wired up (P0 + P1 + P2)

- ✅ `/v2` Basic mode — prompt + style + 1-image generate
- ✅ `/v2` Pro mode — prompt + style + Inspector params (Seed/CFG/Steps/Quality)
- ✅ Inspector locked params **flow into `/api/generate`** as optional `seed/cfg/steps`
  - Server schema (zod) accepts them
  - Stored in `generation_tasks.params` JSON for reproducibility
  - **NOT yet forwarded to OpenAI/Gemini providers** — those APIs don't expose seed/cfg/steps. Wired into ComfyUI in P3.
- ✅ `/v2/projects` — projects list (uses existing `/api/sessions`)
- ✅ `/v2/projects/[id]` — project detail
  - Loads via `/api/sessions/[id]` + new `/api/sessions/[id]/tasks`
  - Shows palette, task count, "在此项目下生成" button
  - Gallery uses BatchCanvas with `virtualize` flag
- ✅ Generate from project → carries `sessionId` so new tasks land in that project
- ✅ BatchCanvas virtualized rendering when >24 cells (zero new deps)
- ✅ Quota remaining surfaced in Pro mode
- ✅ Basic ↔ Pro persisted to `localStorage`
- ✅ All v2 styles namespaced under `.v2-*` — zero risk to existing pages

### What's stubbed (P3 — needs external deps/services)

- ⏸ `src/server/export/psd.ts` — throws "not implemented". Install `ag-psd` and finish.
- ⏸ `src/server/providers/comfy.ts` — workflow builder + runner skeleton. Set `COMFYUI_URL` and finish.
- ⏸ Explore / Learn pages render placeholders.

## How to land

```bash
# 1. unzip into your repo at root
git checkout -b feature/v2-redesign
unzip lumio-v2-complete.zip -d .

# 2. apply DB migration (idempotent — safe to re-run)
node scripts/migrate.mjs

# 3. run
pnpm dev   # then visit http://localhost:3000/v2
```

No package.json change needed for P0–P2 — uses existing React/Next, no new deps. P3 needs `ag-psd` when you start it.

## Test plan (manual)

1. `/v2` Basic → 输入 prompt + 选风格 → 生成 → 一张图渲染
2. 切到 Pro → Inspector 拖 CFG → 点 🔓 锁定 → 生成 → 新图的 task.params.cfg 应等于锁定值
3. `/v2/projects` → 创建项目 → 跳转详情页
4. 详情页点"+ 在此项目下生成" → 跳到 `/v2?project=<id>` → 生成 → 回详情页应看到新图
5. 详情页连续生成 25+ 次 → 滚动应丝滑（virtualize 生效）

## Known limitations

- `/v2?project=<id>` URL 携带项目 id 但 V2App 里没有读取 `searchParams` —— 当前是从 `forceSessionId` props 传，浏览器 URL 上的 query 暂时不生效。要做这件事需要把 V2App 里包一个 `<Suspense>` + `useSearchParams()`。
- 详情页的"调色板"显示是只读的；编辑入口在 `PATCH /api/sessions/[id]`（已有），UI 没接。
- 所有 v2 文案是中文 hardcoded，没接 i18n。如果你的 ImageStudio 已有 i18n，把这些字符串提到资源文件即可。
