# 无限画布集成 · 现状与待办（STATUS & TODO）

> 最后更新：2026-07-09 ｜ 分支/部署：`main`（Zeabur）
> 相关设计：PRD 与 UXUE 设计规格（Artifact）；上游：`basketikun/infinite-canvas` v0.6.0（AGPL-3.0）

## 一、一句话现状

生图站 +（基于 AGPL fork 魔改的）无限画布已集成并部署上线；**生成链路刚修复了关键 bug，待线上验证**；画布界面**仍是 fork 原生 antd 样式，尚未按 UXUE 设计稿实现**；画布的多个子功能（AI 助手 / 视频 / 音频）**还没接我方后端**。

---

## 二、架构（当前实际实现）

| 部分 | 实现 |
|---|---|
| 生图站 | Next.js，路由 `/`，默认浅色；深色为 opt-in（`?theme=dark`，持久化） |
| 无限画布 | Vite SPA（`canvas-app/`，AGPL fork），构建产物在 `public/canvas/`，经 `next.config.ts` rewrites + react-router `basename` 挂到 Next 的 `/canvas` |
| 画布 → 后端 | 画布 config 的 `baseUrl` 被强制指向同源 `/api/canvas`（在 persist merge 里覆盖 localStorage 旧值） |
| 文生图 | `POST /api/canvas/v1/images/generations` → `generateImagesForActor`（同步等生成，复用 quota 扣减 + S3 + sub2api 鉴权） |
| 图生图 | `POST /api/canvas/v1/images/edits` → 参考图传 S3 + `image-to-image` |
| 模型列表 | `GET /api/canvas/v1/models` |
| 语境桥 | 生图站「在画布中打开」写 `localStorage['lumio:canvas-handoff']` → 画布 `ClientRootInit` 读取并加入「我的素材」（best-effort） |
| 设计令牌 | `src/app/globals.css`：`--lumio-*` / `--ui-*` / `[data-theme="dark"]` 重映射 `--studio-*` |

---

## 三、已完成并上线 ✅

- 统一深色设计令牌 + 主题引导（`?theme=dark`）+ 生图站全站色彩审计（浅色像素不变）
- 画布 fork 嵌入 `/canvas`（可访问、可构建、SPA 路由正常）
- 生图站顶栏「无限画布 Beta」tab + 生成结果「在画布中打开」按钮
- 画布生成适配端点：`/v1/images/generations`、`/v1/images/edits`、`/v1/models`
- **生成链路关键修复**（`ccf9458`）：改用 `generateImagesForActor`（原 `startGeneration` 的后台任务在容器里 HTTP 响应后被冻结、任务永不完成——这是"点了没反应"的根因）；并强制配置走 `/api/canvas`
- 画布侧语境桥：带入图进「我的素材」

---

## 四、待办 TODO

### 🔴 P0 · 功能能不能用（先啃这些）

- [ ] **线上验证文生图真能出图** — ⛔ 卡点：本地无真实密钥/DB/S3/浏览器，改对没改对只能线上点一次确认。若失败，取浏览器 Network 里 `/api/canvas/v1/images/generations` 的**状态码 + 响应体**精确定位。
- [ ] **线上验证图生图**（`/v1/images/edits`：换背景 / 局部重绘）
- [ ] **画布 AI 助手 / Agent 接后端** — 画布助手走 `/v1/chat/completions` 或 `/responses`，目前**未适配 → 点了不动**。需新增对应适配端点（涉及流式 / tool-calls，较复杂）。
- [ ] **登录态与剩余次数** — 画布内不显示当前账号 / 剩余次数；未登录时生成会走匿名额度或被拦截，需明确并打通（画布顶栏显示余额）。

### 🟠 P1 · 按 UXUE 设计稿实现（"样子"）

- [ ] **画布界面改造成设计稿** — 现在 `/canvas` 是 **fork 原生 antd 界面，几乎没按设计稿**。要做成：统一深色创作中心、巨型字标空状态、青绿状态色、节点样式等。**工作量大（改 fork 的 UI 层甚至重写）。**
- [ ] **生图站默认深色 + 统一 shell/tab** — 目前深色仅 opt-in，创作中心 tab（生图/画布/视频/提示词/素材）未做，两个工作台仅靠链接跳转。
- [ ] **完整语境桥 FR-16** — 目前只做到"带入图进素材"；设计稿要求进画布即**自动重建「提示词节点→图片节点」并选中、开助手**（需改 fork + 重建）。

### 🟡 P2 · 体验 / 收尾

- [ ] 视频创作台、音频 —— 若在范围内，需各自接后端（当前点了不 work）。
- [ ] 新手引导 / 帮助（FR-17，UXUE 已设计，未实现）。
- [ ] 客服 / 反馈入口（FR-18）—— ⛔ 卡点：需运营提供 **QQ 群号 / 客服方式**。
- [ ] AGPL-3.0 合规 —— ⛔ 卡点：需**法务确认** fork 商用是否触发开源义务（用户已知情并决定采用）。
- [ ] 清理：`globals.css` 里遗留的 `.canvas-workbench` 占位样式（无用）；`public/canvas` 静态产物长期应改为 Docker 构建阶段生成，而非提交构建物。

---

## 五、卡点汇总（需要你 / 团队提供）

1. **线上验证渠道或真实 env** —— 生成能否真出图，最终只能线上确认。
2. **QQ 群号 / 客服方式** —— 客服反馈入口（FR-18）。
3. **AGPL 法务结论** —— 是否可商用 fork。
4. **设计优先级确认** —— "功能优先还是外观优先"；当前按"先功能后样子"推进。

---

## 六、协作提示

- 本仓库同时有 **admin 后台**开发（已通过 PR #1 合入 `main`）。画布集成的提交与其**严格分离**，未混改同一文件。
- 画布应用是独立子目录 `canvas-app/`（有自己的 `package.json` / `tsconfig` / 依赖），已在根 `tsconfig.json` 的 `exclude` 中排除，不参与 Next 的类型检查与构建。
