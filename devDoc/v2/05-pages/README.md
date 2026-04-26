# 05 · 页面高保真稿

> 7 个页面，已实现为可点击 prototype。打开 `prototype.html` 即可，右上角"普通 / 专业"切换模式。

---

## 入口

- `prototype.html` — 总入口，含 TopBar + 模式切换 + 路由
- `v2/` — 各页面源码
  - `tokens.css` · 设计令牌（warm 纸感中性 + Plus Jakarta + JetBrains Mono）
  - `icons.jsx` · 图标库
  - `basic-home.jsx` · 普通模式首页
  - `pro-home.jsx` · 专业模式首页
  - `pro-projects-list.jsx` · 项目列表
  - `pro-project.jsx` · 项目详情（核心页）
  - `other-pages.jsx` · 探索 / 作品集 / 教程

---

## 页面清单

### 1. 普通模式 · 首页 (`basic-home.jsx`)

**目标受众**: 偶尔来玩一把的非游戏从业者、或专业用户的"快速出图"场景。

**设计要点**：
- Hero prompt 居中、放大 — 把"输入想法"做成第一动作
- 风格选择改成**图卡选择**（不是 chip 墙）— 解决素材库视觉问题之一
- 隐藏 seed / cfg / count — 默认 1 张，渐进披露
- "最近作品" + "社区灵感"两栏 — 替代当前的"探索 / 作品集"死链
- 友好色温（warm 纸感）

### 2. 专业模式 · 首页 (`pro-home.jsx`)

**目标受众**: 游戏从业者主战场。

**设计要点**：
- 顶部 = 命令栏（prompt + 模型 + 比例 + count）一行收完
- 主区 = **2×2 批量画布**（暴露后端 `count: 1-16` 能力）
- 右栏 Inspector — seed / cfg / steps / quality 全部可见、可编辑、可锁
- 左栏收成抽屉 — 默认收起，点开是参数 + 参考图
- 底部 = 横向"最近 5 个项目"快捷入口

### 3. 项目列表 (`pro-projects-list.jsx`)

**目标受众**: 老用户回访。

**设计要点**：
- 网格 ProjectCard — 每卡含主图 + 副图栈 + 数量 + 调色板提取
- 顶部筛选：全部 / 角色 / 场景 / UI / 图标
- "新建项目" 永远在最左上
- 启用后端 `sessions` 表，取代当前的"无项目概念"

### 4. 项目详情 ⭐ (`pro-project.jsx`)

**这是整个改版的核心页**。把方向 B（批量）+ 方向 C（项目）合并。

**布局**:
- 顶部面包屑: `所有项目 > 雾隐之城`
- **左栏 · 世界观面板**: 项目调色板（5 色）+ 风格锁 + 角色锚点 + 参考图集
- **主区 · 批量画布**: 4 张并排，hover 出操作（v / inpaint / 4× / save）
- **右栏 · Inspector + SeedTree**: 上半参数，下半派生关系图

### 5. 探索 / 作品集 / 教程 (`other-pages.jsx`)

填补当前死链。

**设计要点**:
- **探索**: 社区作品瀑布流 + 风格筛选 + "fork 这张"按钮
- **作品集**: 个人项目时间线（专业模式）/ 个人散图墙（普通模式）
- **教程**: 卡片网格 — 视频 + 文字 prompt 工程入门

---

## 设计令牌：v2/tokens.css vs 03-design-tokens/tokens.css

prototype 阶段先做了一套独立的 `v2/tokens.css`（warm 纸感 + Plus Jakarta + Mono）— 偏视觉探索。

后续在 `03-design-tokens/tokens.css` 里做了**回归**，沿用现有 `globals.css` 的 `--studio-*` 命名 — 偏落地友好。

**最终选择**：以 `03-design-tokens/tokens.css` 为准（合并到现有 globals.css 友好），`v2/tokens.css` 仅作为视觉样式参考。落地时把 prototype 里用 `--bg / --ink` 等 v2 token 的样式映射回 `--studio-*`。

详见 `99-handoff/components-spec.md` 的"token 映射表"。

---

## 演示与回放

打开 `prototype.html` 后：

1. 默认进入 **专业模式 / 项目列表**
2. 点击任意项目 → 进入"雾隐之城"项目详情页（核心页）
3. 顶部切到"普通"模式 → 体验轻量版
4. 点击"探索 / 作品集 / 教程" → 三个新一级页面

---

## 已知差距 / 后续

- [ ] 项目详情页的 SeedTree 当前是静态的，需要后端返回 `parent_task_id` 字段（schema 加一列）
- [ ] PSD 分层导出依赖后端能力（见 `06-export-panel/`）
- [ ] 暗色模式：tokens.css 已支持，但页面层的 prototype 还未做 `[data-theme="dark"]` 适配（v2 阶段补）
