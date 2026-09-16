---
name: image-model-catalog
description: 生图模型目录、GPT/Gemini/Grok 分组与 Grok JSON images 接入——改模型列表或分组下拉时查
metadata:
  type: doc
  status: 已交付
---

# 生图模型目录与分组

工作台和无限画布共用同一份图像模型目录，下拉按 GPT / Gemini / Grok 分组。Grok 走 Lumio `POST /v1/images/generations|edits` 的 JSON 协议，不接视频 Imagine API。

## 背景 / 目标

模型变多后扁平列表难扫。目录、校验、画布 `GET /v1/models` 必须同一来源，避免再手写三份 ID。

## 设计

- **目录权威：** [`src/server/domain/models.ts`](../../../../src/server/domain/models.ts) 的 `ModelKey` / `listModelOptionsByGroup()`。
- **分组：** GPT（默认 `gpt-image-2.5`，其次 `gpt-image-2*`）、Gemini（preview / pro / flash）、Grok（`grok-imagine-image-quality` 优先，其次 `grok-imagine-image`、`grok-imagine`）。不提供 `grok-imagine-edit` 选项；有参考图时打 edits 端点。
- **默认模型：** 工作台初始选中、画布默认图像模型、未知 model id 回落均为 `gpt-image-2.5`（`DEFAULT_IMAGE_MODEL`）。
- **工作台：** 原生 `<optgroup>`。仅 GPT Image 2 分辨率族随 1K/2K/4K 换模型；Grok 最高 2K，选 4K 钳到 2K。
- **画布：** `SelectGroup`；默认渠道硬编码追加与 `modelKeys` 相同的图像模型（`canvas-app` 的 `DEFAULT_IMAGE_MODEL_IDS`）。改目录后必须重建 `public/canvas/`；不要在启动后再拉 `/v1/models` 覆盖 zustand（曾导致 React #185）。前端仍打本站 OpenAI 兼容图像接口。
- **Grok 适配：** JSON body，`size` 为计费层级 `1K`/`2K`，`response_format: b64_json`，参考图转 data URL。GPT 仍走 multipart edits。登录 Key 优先 Grok/xAI 分组，否则回退 OpenAI 生图 Key。

## 待解决

- Lumio 模型广场上 Grok 的 platform 字段是否稳定为 `xai` / `grok`（已做 OpenAI 生图 Key 回退）。

## 相关

- [`src/server/providers/grok.ts`](../../../../src/server/providers/grok.ts)
- [`src/components/ImageStudio.tsx`](../../../../src/components/ImageStudio.tsx)
- [`canvas-app/src/components/model-picker.tsx`](../../../../canvas-app/src/components/model-picker.tsx)
- 决策：[0002 · Grok 图像走 JSON images API](../../../decisions/0002-grok-json-images-api.md)
