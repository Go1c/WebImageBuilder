# Lumio Image Studio — 管理员后台 PRD

> 文档状态：**待评审** · 版本 v0.1 · 2026-07-09
> 范围：新增 `/admin` 管理员后台。不改动前台生图主流程，仅新增后台读/管理能力。

---

## 1. 背景与目标

### 1.1 背景
Lumio Image Studio 是一个面向 C 端的 AI 生图站（Next.js + PostgreSQL + S3/R2，JWT 鉴权来自外部 `api.lumio.games`）。目前所有运营数据（用户、生图记录、报错、分享）都已落库，但**没有任何管理界面**：素材库靠静态文件手工维护，用户用量、报错、分享情况无法查看，被举报内容无法处置。

### 1.2 目标（本期要解决的核心问题）
| # | 目标 | 衡量标准 |
|---|------|----------|
| G1 | 运营可在线管理素材库（提示词示例库） | 无需改代码/重新部署即可上传、删除、排序素材 |
| G2 | 运营可按邮箱查看用户使用情况 | 能查到任一邮箱的生图次数、模型分布、成功率、活跃时间 |
| G3 | 运营可集中排查报错 | 能看到全部失败生图及错误信息，可按用户/模型/时间筛选 |
| G4 | 运营可掌握分享数据并处置违规内容 | 能看分享排行 + 一键下架/恢复被举报的分享 |

### 1.3 非目标（本期不做）
- 不做前台用户端的任何改版。
- 不做多级/细粒度权限体系（本期管理员一视同仁，全功能）。
- 不做实时告警/推送（报错先做列表查看，告警下一期）。
- 不做计费/充值系统（额度只做「运营手动调整」，不做支付）。
- 不引入新的前端框架/图表库之外的重型依赖。

---

## 2. 用户与角色

| 角色 | 说明 | 本期权限 |
|------|------|----------|
| **管理员（Admin）** | 邮箱在 `ADMIN_EMAILS` 白名单中的登录用户 | `/admin` 全部功能 |
| 普通用户 | 前台生图用户 | 无法访问 `/admin`（访问 → 403/跳转） |

**鉴权机制（已确认）**：登录后从 JWT 取 `email`，命中环境变量 `ADMIN_EMAILS`（逗号分隔白名单）即为管理员。
- 服务端强校验：每个 `/admin` 页面与 `/api/admin/*` 接口都必须在服务端校验，不能只靠前端隐藏。
- 未登录 → 跳转登录；已登录但非白名单 → 403 页面。

---

## 3. 功能范围总览

后台共 **6 个模块**（4 个核心 + 2 个建议补充），外加 1 个总览页：

| 模块 | 优先级 | 对应目标 | 说明 |
|------|--------|----------|------|
| M0 总览 Dashboard | P1 | 全局 | KPI 概览，进后台第一屏 |
| M1 素材库管理 | **P0** | G1 | 上传/删除/排序/编辑提示词示例 |
| M2 用户使用记录 | **P0** | G2 | 用户列表 + 单用户详情下钻 |
| M3 报错监控 | **P0** | G3 | 失败生图列表 + 筛选 + 详情 |
| M4 分享管理 | **P0** | G4 | 分享列表 + 排行 + 举报处置 |
| M6 操作审计日志 | P2 | 补充 | 记录管理员的关键操作 |

> 注：额度管理不纳入本后台——平台支付/额度由外部系统（`api.lumio.games`）统一管理，此处不应重复管控。

**本期确认纳入的补充模块（见 §4.7）**：
| 模块 | 优先级 | 说明 |
|------|--------|------|
| C1 内容安全/合规审核 | P0 | 违禁词 + 内容复审 |
| C3 邀请裂变监控 | P1 | invites 可视化 + 处置 |
| C4 公告/运营位管理 | P1 | 前台 banner/公告配置 |
| C5 成本/用量看板 | P2 | provider 调用量估算成本 |

**本期不做**：C2 用户/设备风控封禁、C6 数据导出（延后）。

**最终导航结构（10 项）**：总览 · 素材库 · 用户记录 · 报错监控 · 分享管理 · 内容安全 · 邀请裂变 · 公告运营 · 成本看板 · 审计日志。

> P0 = 本期必做；P1 = 本期建议做，工作量小；P2 = 可延后。

---

## 4. 详细需求

### M0 — 总览 Dashboard（P1）
**用户故事**：作为管理员，进入后台第一眼就能看到平台整体健康度。

**展示指标（卡片）**：
- 今日 / 累计 生图数（成功）
- 今日成功率（成功 / 总）
- 累计用户数、今日活跃用户数（有生图行为）
- 各模型用量分布（近 7 天）
- 待处理项：被举报分享数、今日失败数

**数据来源**：`generation_tasks`、`users`、`prompt_shares` 聚合查询。

**验收标准**：
- 打开 `/admin` 默认落在此页，卡片数据与数据库一致。
- 「待处理」项可点击跳转到对应模块（如举报数 → M4）。

---

### M1 — 素材库管理（P0，本期最大工作量）
**用户故事**：作为管理员，我要上传新的提示词示例（图+提示词+分类），删除过期的，调整它们在前台的展示顺序。

**现状**：素材库现在是静态文件 `src/components/promptLibrary.ts`（2691 行，字段：id/caseNumber/title/category/image/prompt）+ `public/prompt-library/` 图片。**不能在线管理**。本模块需将其迁移为 DB 表 + S3 存储。

**功能点**：
| 功能 | 说明 |
|------|------|
| 列表查看 | 网格/列表展示所有素材（缩略图、标题、分类、排序值、状态） |
| 上传新增 | 上传图片（走现有 S3 presign 通道）+ 填写标题、分类、提示词 |
| 编辑 | 修改标题/分类/提示词/替换图片 |
| 删除 | 软删除（`status=hidden`），前台不再展示，可恢复 |
| 排序 | 拖拽或填数字调整 `sort_order`，前台按此顺序展示 |
| 分类管理 | 至少支持在上传/编辑时选择或新建分类 |
| 前台对接 | 前台从新接口读取素材，替代静态文件（需一次数据迁移把现有 2691 行导入 DB） |

**关键决策点（需评审确认）**：
- 前台读取方式：改为运行时读接口 or 构建时生成？→ 建议 **运行时读接口 + 缓存**，才能做到「改完即时生效」。
- 存量数据迁移：写一次性迁移脚本把 `promptLibrary.ts` 导入 DB。

**验收标准**：
- 上传一条素材后，前台素材库能看到，且位置符合 `sort_order`。
- 删除后前台立即不可见；恢复后重新可见。
- 调整排序后前台顺序更新。

---

### M2 — 用户使用记录（P0）
**用户故事**：作为管理员，我要按邮箱查某个用户用了多少次、用得怎么样。

**M2.1 用户列表**
- 字段：邮箱、显示名、注册时间、总生图数、成功/失败数、最近活跃时间、当前额度余额、邀请码。
- 搜索：按邮箱模糊搜索。
- 排序：按生图数 / 最近活跃 / 注册时间。
- 分页。

**M2.2 用户详情下钻**（点邮箱进入）
- 基本信息 + 额度余额（login_used / invite_credits / paid_credits）。
- 该用户全部生图记录（分页，含模型、状态、时间、prompt 摘要）。
- 该用户的分享列表。
- 该用户关联的设备 / IP（反滥用参考，`user_device_links`）。
- 该用户的邀请记录（邀请了谁、是否 rewarded/blocked）。
- 快捷入口：跳到 M5 给该用户调额度。

**数据来源**：`users` ⨝ `generation_tasks` ⨝ `quota_balances` ⨝ `prompt_shares` ⨝ `invites` ⨝ `user_device_links`。

**验收标准**：
- 搜索邮箱能定位到用户；总次数与该用户 `generation_tasks` 计数一致。
- 详情页各子列表分页正确、数据归属正确（不串号）。

> 说明：匿名用户（无邮箱，仅设备指纹）本期以「匿名」聚合展示用量，不做单独详情页。

---

### M3 — 报错监控（P0）
**用户故事**：作为管理员，我要看到所有报错，快速定位是哪个用户、哪个模型出的问题。

**功能点**：
- 失败生图列表：`generation_tasks.status='failed'`，字段含 用户邮箱/匿名、模型、provider、错误类型、时间。
- 筛选：按用户邮箱、模型/provider、错误类型、时间范围、错误关键词。
- 详情：点开看完整定位信息 + **上游原始报错**（见下）+ 参数（prompt、params）。
- 统计：错误按 provider/模型/错误类型 的分布（辅助定位系统性问题）。

**详情必须展示（本模块重点，来自用户反馈）**：
| 信息 | 说明 | 现状 |
|------|------|------|
| 任务 ID | `generation_tasks.id` | ✅ 已有 |
| 用户 ID + 邮箱 | `user_id` / `users.email`（匿名则设备指纹） | ✅ 已有 |
| **请求 ID（本站关联 ID）** | 每次生图生成的 correlation id，贯穿日志便于追踪 | ❌ 需新增 |
| **上游请求 ID** | provider 返回的 `x-request-id`（OpenAI）等，给上游报障时用 | ❌ 需新增 |
| **上游 HTTP 状态 / gateway 状态** | `upstream.statusCode` / `gatewayStatus` | ⚠️ 已捕获未持久化 |
| **上游错误 code / type** | `upstream.code` / `upstream.type` | ⚠️ 已捕获未持久化 |
| **上游原始返回体（raw response）** | `upstream.rawResponse`——OpenAI/Gemini 实际吐回的 JSON/文本，**用户明确要看这个，而非本站包装后的信息** | ⚠️ 已捕获未持久化 |
| 本站 error_message | 我们包装的信息，作为次要展示 | ✅ 已有 |

> **关键点**：目前 `UpstreamProviderError.upstream`（含 `rawResponse`）在构造给前端的响应时用到了，但 `markTaskFailed(taskId, message)` 只把字符串写进 `error_message`，结构化上游字段与 request id **未落库**。要满足此需求必须做后端改动（见 §5）。

**数据来源 / 后端改动**：`generation_tasks`。新增：
- 列 `request_id text`（本站关联 ID，生图开始时生成，贯穿 provider 调用与日志）。
- 列 `upstream_detail jsonb`（持久化 `ProviderUpstreamErrorDetail` 全量：statusCode、gatewayStatus、code、type、message、rawResponse、contentType、provider x-request-id）。
- 列 `error_code text`（我们的 `ApiErrorCode` / upstream code，用于筛选与分类统计）。
- 改 `markTaskFailed` 签名，接收并写入上述结构化字段（不止字符串）。
- provider 适配器在 `readUpstreamResponseBody` 时额外抓取 `x-request-id` 等响应头存入 upstream_detail。

**验收标准**：
- 能筛出指定邮箱/错误类型/时间段的失败记录。
- 详情能看到**上游原始返回体**（与 provider 实际响应一致）、本站关联 request id、上游 request id、上游状态码与 code。
- 一条失败任务从「本站 request_id」可关联到「上游 request_id」，便于向 OpenAI/Gemini 报障。

---

### M4 — 分享管理（P0）
**用户故事**：作为管理员，我要看谁在分享、哪些内容最受欢迎，并能下架违规/被举报内容。

**功能点**：
- 分享列表：缩略图、prompt 摘要、分享者（邮箱/匿名）、状态（active/reported）、举报数、时间。
- 「乐于分享」排行：按分享者聚合，看谁分享最多（Top N）。
- 筛选：状态（全部/被举报）、分享者、时间。
- **处置动作**：
  - 下架（takedown）：将分享置为不可访问（新增状态 `removed`），前台 `/share/{id}` 返回不可用。
  - 恢复（restore）：撤销下架，回到 active。
  - 清零举报 / 查看举报详情。
- 被举报内容优先展示（红点/置顶）。

**现状**：`prompt_shares` 已有 `status`（active/reported）、`report_count`、`reported_at`，前台已有举报接口。本模块新增 `removed` 状态与管理端处置动作。

**验收标准**：
- 被举报分享能在列表醒目呈现。
- 下架后 `/share/{id}` 立即不可访问；恢复后可访问。
- 排行榜数量与库中该用户分享数一致。

---

### M6 — 操作审计日志（P2，建议）
**用户故事**：作为管理员，我要能追溯谁在什么时候做了什么关键操作。

**记录范围**：素材删除/编辑、分享下架/恢复、额度调整。
**字段**：操作人邮箱、动作类型、目标对象、变更内容、时间。
**新增表**：`admin_audit_logs`。

**验收标准**：每个写操作都留痕，可按操作人/类型/时间查询。

---

### §4.7 候选补充模块（待评审勾选是否纳入本期）

> 这些是「生图站后台常见但当前系统缺失」的能力，与外部支付/额度体系无关。按建议度排序。

**C1 — 内容安全 / 合规审核（强烈建议）**
- prompt 违禁词库配置 + 命中拦截/告警；对已生成内容的人工复审队列。
- 生图站合规红线，目前系统零管控。可与 M3 报错、M4 分享打通。
- 新增表：`blocked_terms`；可选生成内容审核状态字段。

**C2 — 用户 / 设备风控封禁（强烈建议）**
- 拉黑用户 / 封禁设备指纹 / 封禁 IP，阻断刷量与滥用。
- 数据基础已具备：`user_device_links`、`anonymous_devices`、`ip_hash`。
- 新增表：`bans`（target_type=user/device/ip、reason、expires_at）。生成入口需加封禁校验。

**C3 — 邀请裂变监控（建议）**
- `invites` 表已有：邀请关系、转化、作弊拦截（`blocked`）。后台做可视化 + 人工处置。

**C4 — 公告 / 运营位管理（建议）**
- 前台 banner / 活动公告的后台增删改与生效时间。新增表：`announcements`。

**C5 — 成本 / 用量分析看板（可选）**
- 各 provider/模型调用量 → 估算成本；趋势图。纯只读聚合 `generation_tasks`。

**C6 — 数据导出 CSV（可选）**
- 用户列表 / 生图记录 / 分享 的 CSV 导出，便于离线分析。

---

## 5. 数据模型影响

**新增表**：
- `material_items`（素材库，替代静态 `promptLibrary.ts`）：id、title、category、prompt、storage_key、image_url、sort_order、status(active/hidden)、created_by、created_at、updated_at。
- `admin_audit_logs`（M6）：id、admin_email、action、target_type、target_id、detail(jsonb)、created_at。

**表字段扩展**：
- `prompt_shares.status`：增加 `removed` 取值（当前 check 约束仅 active/reported，需改约束）。
- `generation_tasks`：新增 `request_id text`、`error_code text`、`upstream_detail jsonb`，用于报错监控展示上游原始报错与请求追踪（见 M3）。改造 `markTaskFailed` 落库这些字段，provider 适配器捕获 `x-request-id`。

**沿用现有表**（只读或轻改）：`users`、`generation_tasks`、`quota_balances`、`invites`、`user_device_links`、`assets`。

**一次性迁移**：脚本把现有 `promptLibrary.ts` 的 2691 行导入 `material_items`，图片沿用 `public/prompt-library/` 或迁到 S3（评审时定）。

---

## 6. 接口影响（新增，全部需 admin 鉴权）

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/admin/overview` | M0 总览 KPI |
| GET/POST/PATCH/DELETE | `/api/admin/materials` `/…/{id}` | M1 素材 CRUD |
| POST | `/api/admin/materials/reorder` | M1 排序 |
| GET | `/api/admin/users` `/…/{id}` | M2 用户列表/详情 |
| GET | `/api/admin/errors` | M3 报错列表/详情 |
| GET | `/api/admin/shares` | M4 分享列表/排行 |
| POST | `/api/admin/shares/{id}/takedown` `/…/restore` | M4 处置 |
| POST | `/api/admin/users/{id}/credits` | M5 额度调整 |
| （前台）GET | `/api/materials` | 前台读取素材库（替代静态文件） |

所有 `/api/admin/*` 与 `/admin/*` 页面：服务端校验 `email ∈ ADMIN_EMAILS`，否则 401/403。

---

## 7. 非功能需求

- **安全**：管理端全部服务端鉴权；写操作留痕；敏感操作（下架、额度、删除）需二次确认。
- **性能**：列表接口分页（默认 20/页），聚合查询走已有索引；总览可加短缓存。
- **本地开发**：兼容现有 `LUMIO_LOCAL_MODE`（内存仓储）尽量可跑，至少不崩。
- **一致性**：沿用现有 `http.ts` 错误结构、Zod 校验、`repositories.ts` 模式。
- **国际化**：后台界面中文优先（运营团队使用）。

---

## 8. 里程碑建议（评审后细化）

1. **基建**：admin 鉴权中间件 + 后台布局/导航 + 403 页。
2. **P0-A**：M2 用户记录 + M3 报错（纯只读，最快见效）。
3. **P0-B**：M4 分享管理（含下架）。
4. **P0-C**：M1 素材库（DB 迁移 + CRUD + 前台对接，工作量最大）。
5. **P1**：M0 总览 + M5 额度。
6. **P2**：M6 审计日志（可与 M4/M5 同期埋点）。

---

## 9. 待评审确认的开放问题

1. **管理员白名单**：`ADMIN_EMAILS` 逗号分隔，是否够用？（当前仅一个 admin 邮箱 admin@lumio.games？）
2. **素材库前台对接**：确认走「运行时读接口 + 缓存」（改完即时生效），而非构建时生成？
3. **素材图片存储**：新素材传到 S3；存量图片是保留在 `public/prompt-library/` 还是一并迁 S3？
4. **匿名用户**：M2 是否需要匿名用户的详情下钻，还是只做聚合？（当前假设只聚合）
5. **分享下架**：下架是软状态（可恢复）即可，还是需要真正删除 S3 图片？
6. **额度管理 M5/ 审计 M6**：是否纳入本期？（当前标记 P1/P2）
