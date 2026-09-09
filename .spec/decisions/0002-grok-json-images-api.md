# 0002 · Grok 图像走 Lumio JSON `/v1/images/*`，不把 `grok-imagine-edit` 做成可选模型

- 日期：2026-09-09
- 状态：生效

## 背景

Grok Imagine 与 GPT Image 都打 `https://api.lumio.games/v1/images/generations|edits`，但 GPT 编辑是 multipart FormData，Grok 文档要求 JSON `{ image: { url } }`，且 `size` 是 1K/2K 计费层级。用户名单里有 `grok-imagine-edit`，文档里编辑是端点不是模型 ID。

## 决策

- 新增 `GrokImageProvider`，不改 GPT 的 FormData 路径。
- 下拉只列 `grok-imagine-image-quality` / `grok-imagine-image` / `grok-imagine`；有参考图时用当前 Grok 模型打 edits。
- 本次不接 `/v1/videos/*`。

## 后果

- 两套图像请求体并存，按 `provider` 分流。
- 若网关日后把 `grok-imagine-edit` 做成真实模型 ID，需要再加目录项。
