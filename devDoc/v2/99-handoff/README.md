# 99 · 交付包

> 给开发同学的落地清单。打开顺序：本 README → roadmap.md → components-spec.md → 进入对应 sprint。

---

## 一句话目标

把 Lumio 从"能用的图像生成工具"重做为"游戏从业者会留下来用的工作台"，同时不挡住偶尔来玩一把的轻用户。

---

## 文档导航

```
devDoc/
├── 00-redesign-overview.md     总览 · 双模式策略 · 这次改什么 / 不改什么
├── 01-current-state-audit.md   现状诊断 · 6 大问题 + 截图
├── 02-wireframes/              5 个方向的低保真探索 (HTML)
├── 03-design-tokens/           设计令牌 · 颜色 · 字体 · 间距 (CSS)
├── 04-components/              组件库 (HTML 渲染样例 + JSX)
├── 05-pages/                   7 个高保真页面 + 可点击 prototype
├── 06-export-panel/            专业出口面板独立设计
└── 99-handoff/                 ← 你在这
    ├── README.md               本文档
    ├── roadmap.md              三阶段落地路线 (P0/P1/P2/P3)
    ├── components-spec.md      组件实现清单 + 现有组件复用映射
    └── schema-changes.sql      数据库变更
```

---

## 落地最小切片（如果只能做一件事）

按以下优先级，逐个 ship，**每个都是独立可发布的**：

### P0 · 一周内可做（不动后端）
- [ ] **导航重构**：把"探索 / 作品集 / 教程"从死链变成实页（数据可以先用静态）
- [ ] **设计令牌迁移**：把 `03-design-tokens/tokens.css` merge 进 `globals.css`
- [ ] **prompt 输入区放大**：现状 prompt 框太小，改成主舞台（参考 `05-pages/v2/basic-home.jsx`）

### P1 · 两周（小后端改动）
- [ ] **批量生成**：暴露后端已有的 `count: 1-16` 能力（参考 `05-pages/v2/pro-home.jsx`）
- [ ] **风格图卡选择器**：替换 chip 墙（参考 `04-components/StyleCard`）

### P2 · 一个月（数据库改动）
- [ ] **项目（Sessions）**：新增 sessions 表，把作品归到项目下（参考 `99-handoff/schema-changes.sql`）
- [ ] **项目详情页**：批量画布 + Inspector + SeedTree（参考 `05-pages/v2/pro-project.jsx`）
- [ ] **双模式 (Basic / Pro) 切换**：localStorage 记忆，影响顶栏和默认页

### P3 · 长期（接外部服务）
- [ ] **PSD 分层导出**：接 SAM segmentation（参考 `06-export-panel/`）
- [ ] **ComfyUI 工作流导出**：prompt → ComfyUI graph 映射器
- [ ] **API / cURL 出口**：纯前端模板，给开发者使用

---

## 设计原则（开发时遵守）

1. **不在视觉里编造数据** — 不用就不画。比如不要"AI 已生成 3,492 张作品"这种假数。
2. **渐进披露** — 高级参数（seed / cfg / steps）默认收起，但**不要藏到二级菜单**，鼠标悬停或一次点击就要能改。
3. **批量是默认** — 任何"生成"按钮默认行为都是 4 张，要"只生成 1 张"才需要降档操作。
4. **项目优先** — 一切作品都属于一个项目；首次生成自动创建"未命名项目"，用户随时可命名。
5. **Pro 不是锁，是入口** — 免费用户能看到所有 Pro 功能的存在和样子，鼠标悬停时显示"升级解锁"，不是直接灰掉。

---

## 改动后的核心 metric（记得埋点）

- **激活率**：首次进入 → 第一张图生成成功
- **批量比例**：生成请求中 `count > 1` 的占比（衡量专业用户使用）
- **项目使用率**：有 ≥2 张图的 session 数 / 总 session 数
- **PSD 导出转化**：看到导出弹窗 → 选择 PSD 的转化（衡量游戏从业者粘性）
- **7 日回访**：尤其是创建过项目的用户

---

## 不在本次范围内的事

为了保持 scope 不爆炸，以下**显式排除**：

- ❌ 移动端原生 app
- ❌ 实时协作（共编一个项目）
- ❌ 视频 / 3D 生成
- ❌ 训练 LoRA / Fine-tune
- ❌ 社区功能（评论 / 关注 / 私信）
- ❌ 国际化（i18n） — 留 token，但不做语言文件

如有需要，单开 RFC。

---

## 联系 / 协作

- 视觉 / 交互疑问 → 设计同学（我）
- 后端 schema 疑问 → 看 `schema-changes.sql` 里的注释
- 拿不准的优先级 → 默认按 `roadmap.md` 走，特殊情况开会
