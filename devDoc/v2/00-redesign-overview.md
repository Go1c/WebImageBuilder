# Lumio Image Studio — v2 Redesign Overview

> 本文档是整个 v2 改版的索引和决策记录。所有产出都在 `devDoc/` 目录下，不进入 `src/` 直到正式 PR。

---

## 1. 分支与合并策略（硬性约束）

- **工作分支**: `redesign/lumio-v2-ux`
- **禁止**: 直接 push 到 `main`、禁止把本分支自动合并到 `main`
- **保护**: 已要求仓库管理员对 `main` 加 branch protection（需 PR + 1 approval + status checks）
- **本地保险**: 仓库 `.git/hooks/pre-push` 已加 main 拦截脚本（见 `99-handoff/HANDOFF.md`）
- **交付方式**: 改版完成后开 PR，由项目负责人评审；本目录的设计稿和文档随 PR 一起入库，便于历史追溯。

## 2. 改版目标（来自需求方）

主要受众：**游戏从业者**（策划 / 美术 / TA / 主美）。

三大优化方向（用户原话）：

1. **整体信息架构 / 布局结构**
2. **素材库 / 灵感发现**
3. **视觉风格与品牌感**

## 3. 设计原则

| 原则 | 说明 |
|---|---|
| **专业模式优先** | 当前 UI 是 C 端工具感，对游戏从业者偏轻量。新版在保留入门路径的同时，把"项目 / 批量 / Seed / 出口"做成一等公民。 |
| **后端能力暴露** | 后端已支持的 `count 1-16`、`inpaint`、`variation`、`sessions`、双模型、多参考图，UI 必须暴露。 |
| **渐进披露** | "普通"模式隐藏 seed/cfg/参数；"专业"模式打开 Inspector + 出口面板。模式状态由用户主动切换并持久化。 |
| **设计令牌沿用** | 保留 `globals.css` 现有 token 命名（`--studio-bg` 等），只做扩展，不重写，降低代码 diff 体积。 |
| **不做 SaaS 套话** | 不堆 emoji、不堆数据 stats、不做花哨 hero gradient。游戏美术更吃克制和高密度信息。 |

## 4. 目录索引

```
devDoc/
├── 00-redesign-overview.md       ← 你正在看的这份
├── 01-current-state-audit.md     ← 现状诊断（基于代码而非猜测）
├── 02-wireframes/                ← 6 张方向探索（A/B/C/D/E + 诊断）
├── 03-design-tokens/             ← 色板 / 字阶 / 圆角 / 阴影
├── 04-components/                ← 组件库（含新组件 spec）
├── 05-pages/                     ← 高保真页面稿
├── 06-export-panel/              ← 专业出口面板专项
└── 99-handoff/                   ← 给 Claude Code / Cursor / 设计师的交付包
```

## 5. 决策路线（推荐落地节奏）

| 阶段 | 范围 | 工期估算 | 风险 |
|---|---|---|---|
| **P0** | 视觉微调（A 方向）：合并顶部信息、参数收抽屉、画布升 4 张 | 1-2 周 | 低 |
| **P1** | 批量工作流（B 方向）：暴露 count / seed / Inspector / 多参考图 | 2-3 周 | 中（需联调批量任务返回） |
| **P2** | 项目为根（C 方向）：启用 sessions 表、Project 一级 nav、世界观面板 | 3-4 周 | 中（信息架构动得大） |
| **P3** | 专业出口（PSD / ComfyUI JSON / API cURL） | 2 周 | 高（PSD 分层导出依赖后端能力） |

P0 + P1 可独立上线。P2 建议作为独立 milestone。P3 视客群反馈再决定。

## 6. 角色 / 责任

- **设计**: 本目录所有产出
- **前端**: 按 `99-handoff/components-spec.md` 落组件，按 `99-handoff/globals.css.diff` 合并样式
- **后端**: 仅 P3 阶段需要（导出层）；P0-P2 复用现有 API
- **PM**: 验收节点对照本文 §5

## 7. 变更记录

| 日期 | 版本 | 内容 |
|---|---|---|
| 2026-04-26 | 0.1 | 初版：完成 wireframe 探索 + 中保真 prototype + 仓库审计 |
