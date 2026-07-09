# Lumio Image Studio 设计系统

面向创作者的 AI 图像生成平台 **LumioImageStudio**（img.lumio.games）的设计系统与两份高保真设计交付。账号/余额/邀请由 Lumio 账户中心（api.lumio.games）托管，本站承担创作体验：生图工作台、无限画布（canvas-app）、提示词库、分享落地页与运营后台（/admin）。界面语言为**全中文**。

## 来源

- 本地代码库 `WebImageBuilder/`（Next.js 主站 + `canvas-app/` Vite 无限画布）——token 与组件样式的 ground truth：`src/app/globals.css`（`--studio-*` / `--lumio-*`）、`src/app/admin/admin.css`（`.ad-*`）、`canvas-app/src/styles/globals.css`（shadcn/Tailwind 深色体系）。
- GitHub：`Go1c/WebImageBuilder`（同一代码库，可进一步探索以更准确地还原产品）。
- 设计任务书：`uploads/00-unified-shell.md`（统一工作台）与 `uploads/01-admin.md`（管理后台）。

## 设计交付（本项目核心产出）

| 路径 | 内容 |
|---|---|
| `designs/unified-shell/` | 00 号 · 统一工作台高保真原型（浅/深双主题、六屏 + 全动线）+ handoff README |
| `designs/admin/` | 01 号 · 运营后台高保真原型（十模块 + 公共件全套）+ handoff README |
| `designs/assets/` | 从代码库复制的示例图（figma-assets / prompt-library） |
| `styles.css` | 全局样式入口（@import 全部 token 与组件 CSS） |
| `guidelines/` | Design System tab 规格卡 |

## 内容基调（CONTENT FUNDAMENTALS)

- **全中文人话**，不暴露工程枚举（`provider_error` → 「上游服务报错」；`paid` → 「付费」）。模型名作为专有名词保留英文（gpt-image-2）。
- 对用户**诚实直接**：额度写明「本次消耗 1 次 · 剩 N 次」；本地存储标注「仅保存在本设备」；估算数据注明「以 provider 账单为准」；未上线能力只置灰「即将上线」，禁假 UI。
- 语气克制务实，无感叹号滥用、无 emoji（唯一例外：后台收束性空态「复审队列清空了 🎉」的庆祝表达）。
- 失败文案说人话并给出路：「上游服务暂时繁忙，本次未扣除额度。可以稍后重试，或换一个模型。」
- 价值叙事句式（canvas Hero）：「在无限画布中生成、连接和重组图片、文字与图形，让创作从单次生成变成连续推演」「沉淀每一次好结果」。

## 视觉基调（VISUAL FOUNDATIONS）

- **品牌三色**：violet `#8b78f5`（生成域身份）、teal `#2cd4be`（画布域身份）、orange `#f3a63a`（强调/标注）；另有 CTA 紫 `#7f22fe` 与金额绿 `#00bc7d`。跨域跳转靠色彩辨向。
- **双主题一套组件**：浅色 = Studio 气质（`#fafafa` 底、白卡、半透明面板、克制阴影）；深色 = Canvas 气质（近黑 `#090a0f` + **点阵网格纹理** + 橙色下划线/高亮块标注签名）。
- **后台分治**：`.ad-*` 体系，深色侧栏 `#16181F` + 浅色工作区 + accent 紫 `#5B61E8`，14px 基准、数据密度优先，仅浅色。
- 圆角：控件 12px / 卡片 16px / pill 999px / 后台 8–12px。字体：Inter + 系统中文栈（PingFang SC / 微软雅黑），无 webfont。
- 阴影极轻（`0 1px 1px rgba(0,0,0,.04)`），大图框用深投影 `0 20px 60px -20px rgba(0,0,0,.25)`；hover 用背景加深/边框变色，无位移（后台卡片例外：-2px 上浮）。
- 动效克制：0.12–0.24s ease 过渡、骨架微光、行淡出；尊重 `prefers-reduced-motion`。
- 图片风格：真实生成图（暖调、多风格），卡片底部黑色渐变保护字幕。

## 图标（ICONOGRAPHY）

主站与 canvas-app 均使用 **lucide 风格 2px 描边线性 SVG**（canvas-app 直接依赖 lucide-react），原型内以内联 SVG 复刻同规格；品牌 mark 为紫粉渐变圆角方块 + sparkle。厂商图标 SVG 位于代码库 `public/canvas/icons/`（openai/gemini/claude 等）。无 icon font；emoji 不作图标使用。**代码库未提供正式 logo 文件**，文字标「LumioImageStudio」+ 渐变 mark 代替，未自行绘制品牌标识。

## 待办 / 缺口

- React 组件库（Button/Pill/Card 等 `.jsx` + `.d.ts`）尚未抽取——目前样式以 CSS 类形式存在于两份原型中，需要时可继续抽取为可复用组件。
- PingFang SC / JetBrains Mono 无字体文件（系统栈成员），由回退栈渲染。
