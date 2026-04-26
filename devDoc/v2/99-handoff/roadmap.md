# Roadmap · 落地路线

> 四个阶段，每阶段 1–4 周，按顺序 ship。每个阶段独立可发布。

---

## P0 · "止血" (1 周)

**目标**：让现状不再尴尬，不动数据结构，纯前端改动。

| 任务 | 工时估 | 文档参考 |
|---|---|---|
| 修复 `/explore`、`/portfolio`、`/learn` 死链 | 2 天 | `05-pages/v2/other-pages.jsx` |
| Prompt 输入区放大成主舞台 | 1 天 | `05-pages/v2/basic-home.jsx` |
| 风格选择改图卡 (替换 chip 墙) | 2 天 | `04-components/components.html` → StyleCard |
| 设计令牌迁移到 `globals.css` | 半天 | `03-design-tokens/tokens.css` |
| 修复"灯泡 + AI" toast 蓝色色块 | 半天 | 改用 `--studio-amber-soft` |

**验收**：所有顶栏链接可达、prompt 框成为视觉中心、风格选择有图。

---

## P1 · 释放专业能力 (2 周)

**目标**：暴露后端已有但前端没用的能力，让游戏从业者愿意停留。

| 任务 | 工时估 | 文档参考 |
|---|---|---|
| 批量生成 UI (count 1-16) | 3 天 | `05-pages/v2/pro-home.jsx` BatchCanvas |
| Inspector 面板 (seed/cfg/steps 可见可锁) | 2 天 | `05-pages/v2/pro-home.jsx` Inspector |
| 进度条改 task-level (现在是请求级) | 2 天 | 后端 SSE 已有 |
| Basic / Pro 模式切换 + localStorage 记忆 | 1 天 | `00-redesign-overview.md` 双模式 |
| 收藏 / 隐藏 / 派生 三件套加到 hover 卡 | 2 天 | `04-components` ImageCard |

**验收**：一次能生 4 张、seed 锁定可工作、专业模式默认露所有参数。

---

## P2 · 引入"项目" (3-4 周)

**目标**：作品归属感，从"散图工具"变"工作台"。

| 任务 | 工时估 | 文档参考 |
|---|---|---|
| 数据库 schema：sessions / session_items / refs | 2 天 | `99-handoff/schema-changes.sql` |
| 数据迁移：把现有 generations 归到"未分类"项目 | 1 天 | 同上 |
| 项目列表页 `/projects` | 3 天 | `05-pages/v2/pro-projects-list.jsx` |
| 项目详情页 `/projects/[id]` (核心页) | 5 天 | `05-pages/v2/pro-project.jsx` |
| 项目左栏：调色板 / 风格锁 / 角色锚点 / 参考图 | 4 天 | 同上 |
| 风格锁机制 (跨张维持一致) | 3 天 | 后端：参考图通道，前端：UI 状态 |
| .lumio 工程包导出 (tar.gz + manifest.json) | 2 天 | `06-export-panel/` |
| cURL 命令导出 (纯前端模板) | 1 天 | `06-export-panel/` |

**验收**：创建项目 → 加 3 张图 → 锁风格 → 派生 → 导出 .lumio 整条流程跑通。

---

## P3 · 拉开差距 (持续)

**目标**：让 Pro 订阅有真实价值。

| 任务 | 工时估 | 文档参考 |
|---|---|---|
| PSD 分层导出 (接 SAM) | 5 天 | `06-export-panel/` |
| SVG 矢量化 (Potrace 客户端) | 2 天 | 同上 |
| ComfyUI workflow 导出 | 5 天 | 最难，建议小 spike 先验证可行性 |
| 8K 超分 | 3 天 | 接 Real-ESRGAN |
| 项目模板市场 (公共项目可 fork) | 7 天 | 新需求，进 P3 末尾 |

**验收**：游戏公司用户能用 Lumio 完成"出图 → 改 PS → 集成 pipeline"完整流程。

---

## 跨阶段持续做的事

- **埋点 + analytics 看板** (建议接 PostHog)
- **错误监控** (Sentry)
- **性能** — 项目详情页是图片密集页，要考虑虚拟滚动 / 懒加载
- **a11y** — 至少 keyboard nav + 对比度合规
- **暗色模式** — token 已支持，每个页面提交前都过一遍

---

## 风险 & 假设

| 风险 | 缓解 |
|---|---|
| P2 schema 改动 break 现有数据 | 上线前在 staging 跑迁移脚本，有 rollback |
| PSD 分层质量不稳定 | P3 先发小流量 beta，标"实验性"，给反馈渠道 |
| ComfyUI 节点映射复杂度被低估 | 先做技术 spike，跑通 1 个最简模型再估 |
| 项目概念让轻用户困惑 | Basic 模式不暴露项目，只在 Pro 模式显式 |
