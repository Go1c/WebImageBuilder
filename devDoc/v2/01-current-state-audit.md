# 现状诊断 — 基于代码的事实清单

> 所有结论基于 `Go1c/WebImageBuilder@main` 的实际源码，不是看截图猜的。

---

## 1. 技术栈速览

| 层 | 实现 |
|---|---|
| Framework | Next.js 15 + React 19 + TypeScript（strict） |
| 数据库 | PostgreSQL（pg），schema 见 `src/server/db/schema.sql` |
| 存储 | S3 / Cloudflare R2 |
| 校验 | Zod（`generationInputSchema`） |
| Auth | JWT（`api.lumio.games` 颁发），`jose` 验证 |
| 测试 | Vitest |
| 部署 | Zeabur，Docker |

前端 UI 全部在一个文件：`src/components/ImageStudio.tsx`（30k）；样式全部在 `src/app/globals.css`（17k，单文件）。

## 2. 信息架构问题

| 问题 | 代码证据 | 影响 |
|---|---|---|
| 三栏并列、视觉权重相同 | `.studio-grid { grid-template-columns: 340px minmax(0,1fr) 320px }` | 用户找不到主任务焦点 |
| 顶部"探索 / 作品集 / 教程"三个 nav 是死链 | `<a href="#explore">` 等 | 三个一级页面缺失，IA 不闭环 |
| 无项目 / 会话概念暴露 | `sessions` 表存在但 UI 不接 | 游戏从业者一次出 30+ 张图无法归档 |
| 历史只有当前会话 4 张缩略 | `historyThumbs.slice(0, 4)` | 无法跨会话找回过往作品 |

## 3. 创作工作流问题

| 问题 | 代码证据 | 影响 |
|---|---|---|
| 一次只能生成 1 张 | UI 写死 `count: 1`；后端支持 1-16 | 游戏出图节奏被严重拖慢 |
| 参考图 UI 只展示 1 张 | `.reference-thumb` 单个 + 1 个 add | 后端 `referenceAssets[]` 是数组 |
| Seed / CFG / Steps 完全不暴露 | UI 无相关字段 | 美术无法保持角色一致 |
| 局部重绘 / 变体不可达 | `inpaint` / `variation` 在 `models.ts` 标 v1.1，UI 无入口 | 后端写完了 UI 没接 |
| 模型切换隐藏 | `const [model] = useState<ModelKey>("gpt-image-2")`，没有 setter | OpenAI 和 Gemini 双线浪费 |
| `quality` 用 slider 偷偷映射 | `const quality = detailStrength >= 72 ? "high" : "standard"` | 用户不知道细节强度滑过 72 会贵一档 |

## 4. 素材库 / 灵感发现问题

| 问题 | 代码证据 | 影响 |
|---|---|---|
| 关键词 chip 墙 | `keywordTags = [10 个]` 平铺 | 信息密度差，找不到分类 |
| 社区热门只有 6 张硬编码 | `communityItems` 数组 | 无浏览价值，更像装饰 |
| "我的"标签存在但点击无内容路径 | `libraryTabs = [..., "我的"]` 但无 my collections 数据源 | 用户无法回到自己作品 |
| 无 prompt 收藏 / 复用机制 | 无相关 API/schema | 美术沉淀不下来 |
| 风格预设是装饰渐变，不是真实风格图 | `gradient: "linear-gradient(...)"` | 看不到风格效果 |

## 5. 视觉与品牌感问题

| 问题 | 代码证据 | 严重度 |
|---|---|---|
| Brand mark 是紫粉蓝渐变，过于通用 SaaS | `linear-gradient(135deg, #615fff, #ad46ff, #f6339a)` | 中 |
| 字体只有 Inter + Noto Sans，无品牌字 | `font-family: Inter, ..., Noto Sans SC` | 中 |
| 圆角 24/16/14/999 体系合理但缺层级感 | `border-radius` 散落 | 低 |
| 主图卡 `box-shadow: 0 20px 60px -20px rgba(0,0,0,0.25)` 偏柔，专业工具感弱 | 同上 | 中 |
| 无暗色模式 | 整个 `globals.css` 一套 token | 高（游戏从业者偏好深色） |
| 无微动效（生成完成 / 切图 / 套用样式） | UI 无 `@keyframes` / transition 例外 | 低 |

## 6. 后端已就绪、UI 没用上的能力清单

| 能力 | 后端位置 | 优先暴露建议 |
|---|---|---|
| `count: 1-16` 批量 | `models.ts` schema | P1 必做 |
| `inpaint`（局部重绘） | `getGenerationModeCapabilities` | P2 |
| `variation`（变体） | 同上 | P1 |
| `sessions`（项目） | `schema.sql` | P2 必做 |
| 双模型切换 | `modelOptions` | P0 露 chip |
| 多参考图 | `referenceAssets: AssetReference[]` | P0 必做 |
| `quality: standard / high` | `models.ts` | P0 显式暴露 |
| 邀请奖励完整流程 | `invites` 表 + `/api/invite/claim` | 已用，UI 表达可强化 |

## 7. 优先级建议（与 00 文档保持一致）

P0（视觉微调，1-2 周）：信息合并 + 多参考图 + count + quality 显式 + chip 风格库改图卡

P1（批量工作流，2-3 周）：4 张并排 + Inspector + Seed + Variation

P2（项目为根，3-4 周）：启用 sessions + Project 一级 nav + 世界观面板

P3（专业出口，2 周）：PSD / ComfyUI JSON / cURL — 需后端配合

## 8. 不做的事（明确划掉）

- ❌ 不重写 Next.js / React / 数据库
- ❌ 不动 `api.lumio.games` 的注册登录支付逻辑
- ❌ 不做移动端原生 App（Web 响应式即可）
- ❌ 不做实时协作（暂无信号需求）
- ❌ 不做 AIGC 视频（出题外）
