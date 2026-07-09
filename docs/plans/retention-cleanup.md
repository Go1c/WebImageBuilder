# 实现计划:资产保留策略(可配置自动清理)

## 目标
后台可配置「参考图 / 生成图 超过 N 天自动删除」,应用内定时器每天执行,删除 R2 对象 + `assets` 行。素材库(`materials/`)与在用分享永不删。

## 决策(已与 admin 确认)
- 触发方式:**应用内定时器**(`instrumentation.ts` → 24h interval)。
- 配置存储:新增 `app_settings` 键值表,`reference_retention_days` / `result_retention_days`,`0/空 = 禁用`,**默认禁用**(上线不误删)。
- 保护面:只删 `reference/`、`generated/` 前缀;跳过仍被 `prompt_shares.image_storage_key` 或 `material_items.storage_key` 引用的 key。
- 先 `--dry-run`/preview 给出「将删 X 个 / Y GB」,确认后再武装。

## 任务
1. **schema**:`app_settings` 表。
2. **纯逻辑 + 单测**(`retention-policy.ts` / `.test.ts`):`parseRetentionDays`、`isDeletablePrefix`、`selectDeletableCandidates`(前缀护栏 + 引用护栏)。TDD。
3. **s3.ts**:`listObjectsWithSize(prefix)`、`deleteStoredObjects(keys)`(批量,localMode 跳过)。
4. **settings 仓库**(`admin/queries/settings.ts`):读/写保留天数。
5. **runner**(`retention-runner.ts`):查过期 assets → 护栏过滤 → 计尺寸 → dryRun 返回报告 / 执行删除 + 审计。
6. **scheduler + instrumentation**:启动 5min 后首跑,之后每 24h;localMode/无 DB 不跑;全程 try/catch 不抛。
7. **admin API**:`/api/admin/settings`(GET/PUT)、`/preview`(GET 支持覆盖参数)、`/run`(POST)。
8. **admin UI**:`/admin/settings` 配置页 + 预览 + 立即执行。
9. **导航项** + 收口(test + build)+ reviewer。

## 安全护栏(硬)
- key 不以 `reference/`/`generated/` 开头 → 绝不删(materials/ 天然排除)。
- key 在引用集(shares/materials)→ 跳过。
- 默认禁用;localMode / 无 DB / 无 S3 → 调度器不启动。
- 先删 R2 再删 DB 行,幂等可重跑;审计写 `admin_audit_logs`。
