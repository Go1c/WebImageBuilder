# 06 · 专业出口面板

> P3 阶段交付。打开 `export-panel.html` 看视觉稿。

## 设计动机

游戏从业者画完图后真正要做的事：
- 把图带回 PS / Krita 继续修 → 需要 **PSD 分层**
- 集成到自动化 pipeline → 需要 **API cURL** 和 **ComfyUI workflow**
- 归档 / 复刻 → 需要 **工程包 .lumio**（含完整参数 + 参考图）

当前网站只能下载 PNG，等于把 80% 的高级用户留在了起跑线。

## 信息架构

modal 弹出，三个 tab：

| Tab | 内容 |
|---|---|
| **图像** | PNG · JPG · WebP（栅格）+ PSD · SVG（分层与矢量） |
| **工程** | .lumio 工程包 · ComfyUI workflow |
| **API** | cURL 命令（含完整 prompt + 参数 + auth header 占位） |

## 关键交互

- 多张选中时，标题显示"4 张已选"（来自项目详情页的 BatchCell selection）
- 每个选项可展开二级设置（分辨率 / 透明度 / 分层选择）
- Pro 标签清晰区分付费和免费
- 底部"本次会消耗 N 次额度"实时计算
- 任何选项都支持"复制到剪贴板"和"下载到本地"双行为

## 后端依赖

| 阶段 | 需要的能力 |
|---|---|
| P0-P2（免费） | 现有 S3 + 客户端 Canvas 转换即可 |
| P3 PSD 分层 | 接 SAM segmentation（Replicate / Modal / 自部署） |
| P3 SVG 矢量 | Potrace / VTracer（纯客户端可做） |
| P2 .lumio | Next.js API 打包成 tar.gz，参数从 `generation_tasks.params` 读 |
| P3 ComfyUI | 写 prompt → ComfyUI 节点映射器（最复杂） |
| P2 cURL | 纯客户端模板字符串，不需要后端 |

## 收费策略建议

- 栅格图（PNG/JPG/WebP）2K/4K → 全免费
- 8K → Pro
- 所有"分层 / 工程 / API"出口 → Pro

理由：免费用户的"分享出图"诉求被免费栅格图覆盖；专业用户的工作流诉求转化成 Pro 订阅，差异化清晰。

## 与现有 schema 的关系

不需要改 `generation_tasks` 表，所有参数本来就在 `params jsonb`。
新增表：`exports`（可选，做导出审计）

```sql
create table if not exists exports (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references generation_tasks(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  format text not null,             -- png / psd / lumio / curl / comfyui
  variant text,                     -- 4k / layered / etc
  spend_credits integer default 0,
  created_at timestamptz not null default now()
);
```
