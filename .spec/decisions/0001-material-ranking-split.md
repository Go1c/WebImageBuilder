# 0001 · 素材排序 = 手工权重 `sort_order` + 点击热度 `click_count`×0.1（分列存储、查询时求和）

- 日期：2026-07-09
- 状态：生效

## 背景

素材库要同时满足两种排序输入：管理员手工排序（后台拖拽 / 「排序值」字段）与用户点击热度（每点击一次 +0.1，热门自然上浮）。最初两者都写同一列 `sort_order`（点击时 `sort_order += 0.1`，拖拽时整段重排为整数序列），导致相互抹除：一次拖拽把已积累的小数点击权重清零，拖拽后的新点击又会漂移手工排序。这是核心需求的正确性缺陷，不是观感问题。

## 决策

拆成两列、职责单一：

- `sort_order`（numeric）= **仅**手工权重，由拖拽 `reorderMaterials`（赋整数 `ids.length - index`）和后台「排序值」字段写入，点击永不触碰。
- `click_count`（integer）= **仅**点击热度累加，`recordMaterialClick` 只 `+1`（当天同 actor 同素材去重，见 `material_clicks` 表）。
- **有效排序在查询时计算**：`order by (sort_order + click_count * 0.1) desc, created_at desc`，公开端点与后台列表一致。

语义仍等价于用户诉求「每点击 +0.1 排序值」：有效排序值 = 手工值 + 点击数×0.1。

## 后果

- 拖拽与点击互不覆盖：手工序稳定，点击热度独立累积。
- 排序键变为表达式，不再命中 `material_items(status, sort_order desc, …)` 索引 → 走 seq scan + 内存排序。当前素材量级（百级）无感；量级增长时加表达式索引 `((sort_order + click_count*0.1)) desc`。
- 匿名热度按 device cookie 去重，清 cookie 可小幅刷榜（仅 +0.1、无成本、无越权）——按产品取舍接受，只保留单一按天去重，不加 IP 维度。
