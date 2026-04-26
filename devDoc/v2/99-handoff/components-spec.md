# Components Spec · 组件实现清单

> 给开发同学：每个组件做什么、对应现有 shadcn 组件、改动量、props 提示。

---

## Token 映射表

prototype 阶段用 `v2/tokens.css` 做了视觉探索，落地时全部映射回 `03-design-tokens/tokens.css`（基于现有 `--studio-*`）。

| prototype (v2) | 落地 (现有) | 备注 |
|---|---|---|
| `--bg` | `--studio-bg` | 主背景 |
| `--bg-soft` | `--studio-bg-soft` | 弱背景（卡片、二级面板） |
| `--ink` | `--studio-text` | 主文 |
| `--ink-2` | `--studio-copy` | 次文 |
| `--ink-3` | `--studio-muted` | 弱文 |
| `--line` | `--studio-line` | 描边 |
| `--accent` | `--studio-purple` | 强调色 |
| `--accent-soft` | `--studio-purple-soft` | 强调底 |
| `--good` | `--studio-green` | 成功 / 完成 |
| `--warn` | `--studio-amber-text` | 警告 |

字体：`Plus Jakarta Sans` 是探索版本，落地用 `--studio-font-sans`（项目已配置）。

---

## 组件清单（按落地优先级）

### P0 必做

| 组件名 | 现有 shadcn | 改动 | 关键 props |
|---|---|---|---|
| `<Button>` | ✓ button | 加 `tone="purple"` 变体 | `variant`, `size`, `tone` |
| `<Chip>` | ✗ | 新建 (基于 badge) | `selected`, `removable`, `onRemove` |
| `<StyleCard>` | ✗ | 新建 | `image`, `name`, `selected`, `onSelect` |
| `<PromptHero>` | ✗ | 新建 (大输入区) | `value`, `onChange`, `onSubmit`, `models[]` |
| `<TopBar>` | ✗ | 新建 | `mode`, `onModeChange`, `currentPage`, `nav[]` |

### P1 必做

| 组件名 | 现有 shadcn | 改动 | 关键 props |
|---|---|---|---|
| `<BatchCanvas>` | ✗ | 新建 (核心组件) | `tasks[]`, `count`, `onSelect`, `onAction` |
| `<Inspector>` | ✓ tabs + slider | 拼装 | `task`, `onChange`, `lockedKeys[]` |
| `<TaskCell>` | ✗ | 新建 | `task`, `state` (idle/loading/done/error), `onAction` |
| `<ImageCard>` | ✗ | 新建 (hover 三件套) | `image`, `onUpscale`, `onSeed`, `onSave` |
| `<ParamSlider>` | ✓ slider | 加 lock 图标 | `label`, `value`, `min`, `max`, `locked` |

### P2 必做

| 组件名 | 现有 shadcn | 改动 | 关键 props |
|---|---|---|---|
| `<ProjectCard>` | ✗ | 新建 | `project`, `coverImage`, `palette[]`, `count` |
| `<PaletteStrip>` | ✗ | 新建 (5 色提取) | `colors[]`, `editable` |
| `<RefImageGrid>` | ✗ | 新建 | `refs[]`, `onAdd`, `onRemove`, `weights[]` |
| `<SeedTree>` | ✗ | 新建 (派生关系图) | `tasks[]`, `onSelect` |
| `<StyleLock>` | ✗ | 新建 | `locked`, `referenceTaskId`, `onToggle` |
| `<ProjectSidebar>` | ✗ | 新建 (左栏世界观) | `project`, `editable` |

### P3 必做

| 组件名 | 现有 shadcn | 改动 | 关键 props |
|---|---|---|---|
| `<ExportModal>` | ✓ dialog | 拼装 | `selectedTasks[]`, `onClose` |
| `<FormatOption>` | ✗ | 新建 | `format`, `pro`, `expanded` |
| `<CodeBlock>` | ✗ | 新建（cURL 显示） | `code`, `language`, `copyable` |

---

## 文件组织建议

```
src/
├── components/
│   ├── ui/                  ← shadcn 原生
│   ├── studio/              ← 现有的 studio-* 组件 (保留)
│   ├── lumio/               ← 本次新增
│   │   ├── prompt-hero.tsx
│   │   ├── style-card.tsx
│   │   ├── batch-canvas.tsx
│   │   ├── inspector.tsx
│   │   ├── project-card.tsx
│   │   ├── palette-strip.tsx
│   │   ├── seed-tree.tsx
│   │   └── ...
│   └── chrome/
│       └── top-bar.tsx
└── styles/
    └── globals.css          ← 把 03-design-tokens/tokens.css merge 进来
```

---

## 性能注意

- **BatchCanvas** 一次能渲染 16 个 cell，每个含图片预览。用 `next/image` + lazy loading + blurhash placeholder。
- **ProjectsList** 长列表用 react-virtual。
- **SeedTree** 节点超过 50 时切换到 Canvas/SVG 渲染，DOM 树会爆。

---

## 测试 checklist（每个组件）

- [ ] keyboard nav (Tab/Shift+Tab/Enter/Esc)
- [ ] dark mode 切换正确
- [ ] 屏幕缩放 50% / 200% 不破
- [ ] 长内容截断 + tooltip 显示完整
- [ ] empty / loading / error 三态
