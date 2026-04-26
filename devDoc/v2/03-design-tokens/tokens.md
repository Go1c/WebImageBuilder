# 03 · 设计令牌（Design Tokens）

> 命名规则：**沿用 `globals.css` 已有的 `--studio-*` 前缀**，新增 token 只追加不重命名，确保前端落地时是 diff add，不是 rename。

---

## 1. 颜色

### 1.1 中性色阶（新增 — 现有只有 5 个语义色，缺灰阶）

```css
--studio-neutral-50:  #fafafa;  /* = 现有 --studio-bg */
--studio-neutral-100: #f5f5f5;  /* = 现有 --studio-bg-soft */
--studio-neutral-200: #e5e5e5;
--studio-neutral-300: #d4d4d4;
--studio-neutral-400: #a3a3a3;  /* = 现有 --studio-faint 近似 */
--studio-neutral-500: #737373;  /* = 现有 --studio-muted */
--studio-neutral-600: #525252;
--studio-neutral-700: #404040;  /* = 现有 --studio-copy */
--studio-neutral-800: #262626;
--studio-neutral-900: #171717;  /* = 现有 --studio-text / --studio-black */
```

### 1.2 语义色（保留 + 扩展）

```css
/* 保留 */
--studio-bg:           #fafafa;
--studio-bg-soft:      #f5f5f5;
--studio-surface:      #ffffff;
--studio-panel:        rgba(255,255,255,0.4);
--studio-panel-strong: rgba(255,255,255,0.7);
--studio-line:         rgba(0,0,0,0.05);
--studio-line-strong:  rgba(0,0,0,0.1);
--studio-text:         #171717;
--studio-copy:         #404040;
--studio-muted:        #737373;
--studio-faint:        #a1a1a1;
--studio-black:        #171717;

/* 强调色（保留 + 派生 hover/active） */
--studio-purple:        #7f22fe;
--studio-purple-soft:   #f5f3ff;       /* 现有 .model-chip 用过 */
--studio-purple-hover:  oklch(58% 0.24 295);
--studio-purple-active: oklch(50% 0.24 295);

--studio-green:         #00bc7d;
--studio-green-soft:    #ecfdf5;
--studio-amber-bg:      #fffbeb;
--studio-amber-border:  #fef3c6;
--studio-amber-text:    #bb4d00;

/* 新增：错误 / 信息（专业模式 Inspector 用） */
--studio-red:           oklch(60% 0.22 25);
--studio-red-soft:      oklch(96% 0.03 25);
--studio-blue:          oklch(60% 0.18 240);
--studio-blue-soft:     oklch(96% 0.03 240);
```

### 1.3 暗色模式（**新增** — 游戏从业者强需求）

```css
[data-theme="dark"] {
  --studio-bg:           #0a0a0a;
  --studio-bg-soft:      #141414;
  --studio-surface:      #1a1a1a;
  --studio-panel:        rgba(26,26,26,0.6);
  --studio-panel-strong: rgba(26,26,26,0.85);
  --studio-line:         rgba(255,255,255,0.06);
  --studio-line-strong:  rgba(255,255,255,0.12);
  --studio-text:         #fafafa;
  --studio-copy:         #d4d4d4;
  --studio-muted:        #a3a3a3;
  --studio-faint:        #737373;
  --studio-purple-soft:  rgba(127,34,254,0.15);
}
```

### 1.4 品牌渐变（保留，仅在 brand mark 使用）

```css
--studio-brand-gradient: linear-gradient(135deg,
  rgb(97,95,255)  0%,
  rgb(173,70,255) 50%,
  rgb(246,51,154) 100%);
```

> **使用范围严格限定**：仅用于 `.studio-brand-mark` 32×32 logo。不得在 hero、按钮、卡片等大面积使用 — 这是过去最容易"AI slop"的地方。

---

## 2. 字体

```css
--studio-font-sans:
  Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", "Noto Sans SC", "Noto Sans JP", "Noto Sans KR", sans-serif;

--studio-font-mono:
  "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
```

> 暂不引入第三方品牌字（一是 CN 字体加载贵，二是没有强需求）。Inter 在游戏从业者群里接受度足够。Mono 用在 Inspector / API / Seed 数字上。

---

## 3. 字阶（**新增** — 现有全是 default size，缺层级）

| Token | size / line-height | weight | 用途 |
|---|---|---|---|
| `--text-display` | 40 / 48 | 600 | 项目主页 hero 标题 |
| `--text-h1` | 28 / 36 | 600 | 页面标题 |
| `--text-h2` | 22 / 30 | 600 | 区块标题 |
| `--text-h3` | 18 / 26 | 600 | 卡片标题 |
| `--text-h4` | 16 / 24 | 500 | 现有 `.studio-brand` |
| `--text-body` | 14 / 22 | 400 | 主要正文 |
| `--text-body-sm` | 13 / 21 | 400 | 现有 prompt textarea |
| `--text-caption` | 12 / 18 | 500 | 现有 `.section-label` |
| `--text-tiny` | 11 / 16 | 500 | 现有 `.option-tile` |
| `--text-mono` | 12 / 18 | 400 | Inspector / Seed |

---

## 4. 圆角

```css
--radius-sm:    8px;
--radius-md:   10px;   /* 现有 .ratio-button */
--radius-lg:   14px;   /* 现有 .option-tile / .history-thumb */
--radius-xl:   16px;   /* 现有 .prompt-card / .negative-input */
--radius-2xl:  24px;   /* 现有 .main-image-frame */
--radius-full: 999px;
```

---

## 5. 间距（8 的倍数）

```css
--space-1:  4px;
--space-2:  8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

---

## 6. 阴影

```css
--shadow-xs:    0 1px 1px rgba(0,0,0,0.04);                    /* 现有 .prompt-card */
--shadow-sm:    0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.10);  /* 现有 brand mark */
--shadow-md:    0 4px 12px rgba(0,0,0,0.08);
--shadow-lg:    0 12px 32px rgba(0,0,0,0.12);                  /* 现有 toast */
--shadow-xl:    0 20px 60px -20px rgba(0,0,0,0.25);            /* 现有 main image */

/* 暗色模式 */
[data-theme="dark"] {
  --shadow-xs: 0 1px 1px rgba(0,0,0,0.4);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.5);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.5);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.6);
  --shadow-xl: 0 20px 60px -20px rgba(0,0,0,0.8);
}
```

---

## 7. 动画

```css
--ease-out:  cubic-bezier(0.16, 1, 0.3, 1);    /* 默认 */
--ease-in:   cubic-bezier(0.7, 0, 0.84, 0);
--dur-fast:  120ms;
--dur-base:  200ms;
--dur-slow:  320ms;
```

> 用法：所有交互态（按钮 hover、卡片选中、抽屉滑入）默认 `--dur-base var(--ease-out)`。

---

## 8. 焦点环（无障碍）

```css
--ring-offset: 2px;
--ring-color:  rgba(127,34,254,0.18);
--ring-width:  3px;
```

> 已与现有 `:focus-visible` 兼容。

---

## 9. Z 轴

```css
--z-base:    1;
--z-panel:   4;     /* 现有 topbar */
--z-overlay: 8;
--z-toast:  10;     /* 现有 toast */
--z-modal:  20;
```

---

## 配套文件

- `color-palette.html` — 可视化色板预览（含明暗双模式切换）
- `type-scale.html` — 字阶可视化
- `tokens.css` — 可直接 `@import` 的纯 CSS token 文件，给前端直接用

落地时合并到 `src/app/globals.css` 的 `:root` 顶部，对应 diff 见 `99-handoff/globals.css.diff`。
