# Lumio Admin — 实现说明与部署清单

> 状态：已实现（feat/admin-backend 分支）· `npm run build` 通过 · `npm test` 298 全绿

## 已交付

**10 个后台模块**（`/admin/*`）：总览、素材库、分享管理、内容安全、公告运营、用户记录、邀请裂变、报错监控、成本看板、审计日志。
**18 个管理 API** + **1 个前台公开 API**（`/api/materials`）。

### 关键实现点
- **鉴权**：`ADMIN_EMAILS` 邮箱白名单。API 走 `requireAdmin(request)`（`src/server/admin/auth.ts`），页面/布局走 `getServerAdminIdentity()`（`src/server/admin/serverAuth.ts`）。均服务端强校验；非白名单 → 403。
- **本地预览**：`LUMIO_LOCAL_MODE=true` 且无 `DATABASE_URL` 时，鉴权自动放行（`adminEmails[0]` 或 `admin@lumio.games`），所有查询返回内置 mock 数据 —— 无需数据库即可预览整套后台。
- **报错持久化改造**（用户重点需求）：`generation_tasks` 新增 `request_id` / `error_code` / `upstream_detail(jsonb)`；`markTaskFailed` 落库结构化上游报错；provider 适配器抓取 `x-request-id`。报错详情抽屉里**上游原始返回体默认折叠**，点击展开。
- **设计**：`src/app/admin/admin.css` 独立后台设计系统（深色侧栏 + 数据表 + 右侧抽屉），与评审通过的原型一致。

## 部署清单

1. **配置环境变量**（见 `.env.example`）：
   ```
   ADMIN_EMAILS=admin@lumio.games,other-admin@lumio.games
   ```
2. **迁移数据库**（幂等）：
   ```
   npm run db:migrate
   ```
   新增表：`material_items`、`blocked_terms`、`announcements`、`admin_audit_logs`；扩展 `generation_tasks` 三列；`prompt_shares.status` 增加 `removed`。
3. **导入素材库存量数据**（把静态 promptLibrary 的 335 条导入 `material_items`，幂等）：
   ```
   npm run materials:import
   ```
   图片沿用 `public/prompt-library/`（`image_url` 存相对路径）。

## 前台对接（已完成）

前台 `src/components/ImageStudio.tsx` 现已接入 DB：首帧用静态 `promptLibrary.ts` 兜底渲染，挂载后 fetch `/api/materials` 并替换（`src/components/promptLibrarySource.ts` 负责拉取+映射）。
- **零回退风险**：接口失败 / DB 为空 / 图片缺失 → 自动保留静态库，前台永不空白（有单测 `promptLibrarySource.test.ts`）。
- 字段映射：`imageUrl → image`，`caseNumber` 取 `coalesce(legacy_case_number, sort_order)`。
- 跑完 `materials:import` 后，后台素材库的增删改即刻反映到前台。

## 已知范围说明（v1）
- **内容安全复审队列** = provider 侧内容安全拦截（失败任务 `error_code ∈ content_policy/safety/...`）；复审的「通过/下架」结论 v1 记录到审计，不改变任务状态。prompt 命中违禁词的主动拦截管线是后续增强。
- **成本看板**为估算值（按模型单价表），以 provider 账单为准。
- **成本/额度**：额度不在此后台管理（由外部支付系统统一管理）——按你的要求。
- 未纳入本期：C2 用户/设备风控封禁、C6 数据导出。

## 注意
本次改动中发现工作树里有一批**与后台无关的主题（theme）改动**（`src/app/layout.tsx`、`src/app/globals.css` 及两个 theme 测试文件），非本任务产出，已原样保留、未提交。
