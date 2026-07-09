---
name: code-style
description: 代码与文档风格——语言约定、命名、注释原则、生成物纪律;写代码/建文档时查
metadata:
  type: doc
  status: 已交付
---

# 代码与文档风格

> 能交给工具（formatter / linter）强制的，优先交给工具；本文只写工具管不了、需要人 / Agent 判断的部分。

## 语言与文件命名（通用）

- **规范主体使用中文**（`.spec/` 下全部文档）；例外：根 `CLAUDE.md`（宿主入口惯例）与 `skills/` 下允许英文技能文档（中英以该技能既有语言为准，不混写）。落地项目若改用其他语言，需全仓一致并同步 `.spec/tools/spec-lint.mjs` 里的中文枚举值。
- 文件与目录命名一律 **kebab-case**；agent 文件 `<name>.agent.md`、skill 目录 `skills/<name>/`、ADR `NNNN-<slug>.md`。

## 注释原则（通用）

- 注释只写**代码表达不了的约束**（为什么这样做、边界条件、外部依赖的坑）。
- 不写「改动说明」式注释（改了什么、为什么正确）——那是给评审人的话，进交回物或提交信息，不进代码。
- 注释密度、命名、习语向**周边既有代码**看齐。

## 生成物纪律（通用）

- 生成物不得手改，只能经生成源与生成命令更新，并与生成源一起提交（红线见 [`rules/system.md`](../../rules/system.md)）。

## 语言 / 框架特定风格（**落地必填**）

- **语言/版本：** TypeScript，`strict` 强类型；ESM（`package.json` `"type": "module"`）。缩进两空格。
- **命名/导出：** 共享工具用**命名导出**；文件名描述性且贴合内容，如 `quota.ts`、`repositories.ts`、`ImageStudio.tsx`。React 组件文件用 PascalCase，其余按周边既有约定。
- **分层约束（红线）：** 仅服务端逻辑放 `src/server/`，UI 逻辑放 `src/components/` 或 `src/app/`；密钥与 OpenAI/Gemini/JWT/PG/S3 凭据只留服务端。
- **校验与返回：** 请求校验优先用 **Zod schema**；对外 API 函数返回**带类型的结果对象**。业务规则保持小而可测。
- 无独立 formatter/linter 配置时，风格向**周边既有代码**看齐（见上「注释原则」）。
