# Lumio 图像生成公开站实施计划

## 目标

构建一个部署在 Zeabur 的 Next.js 全栈公开网站，默认中文界面。网站支持免登录免费试用、登录后更多免费次数、邀请奖励、付费额度，并提供 Gemini 与 GPT Image 2 图像生成能力。

## 系统边界

本项目负责：

- 前端创作工作台。
- 生成代理和模型适配。
- PostgreSQL 业务数据。
- S3/R2 图片存储。
- 提示词、历史记录、会话。
- 免登录免费额度、邀请奖励、防刷风控。

`https://api.lumio.games/` 负责：

- 注册登录。
- 支付。
- 平台 API Key/Token 管理。
- 计费策略。
- 用户身份来源。

## 技术方案

- `Next.js` 单项目部署到 Zeabur，包含页面和服务端 API routes。
- `PostgreSQL` 保存本项目业务数据：本地用户映射、匿名设备、免费额度、邀请关系、生成任务、提示词、会话、历史记录。
- `S3/R2` 保存生成图、参考图、遮罩图等文件；数据库只保存对象 key、URL、尺寸、模型、归属用户和任务状态。
- 使用 JWT 对接 `api.lumio.games`。Next.js 后端校验登录 token，并把外部用户 ID 映射为本地用户。
- 生成模型通过服务端适配层调用。前端只使用稳定模型 key，真实模型 ID 通过环境变量配置。

## 功能流程

- 未登录用户可直接生成图片，额度由 `IP + 设备指纹 + 频率限制` 控制，并保留验证码开关。
- 登录用户获得更高免费额度，历史记录绑定账号，可查看和继续历史会话。
- 被邀请用户完成首次有效生成后，邀请人获得额外免费次数；同 IP、同设备、异常账号关系不重复奖励。
- 支付和计费策略由 `api.lumio.games` 管理，本项目生成前校验权益，成功后记录任务和消耗。
- 历史记录保存提示词、模型、参数、输入图片、输出图片、任务状态和错误信息，支持按会话查看。

## 分期

- V1：文生图、参考图/图生图、Gemini/GPT Image 2 模型选择、免费额度、登录额度、邀请奖励、历史记录、R2/S3 存储、防刷基础策略。
- V1.1：局部重绘、变体生成、更完整画布编辑体验、遮罩上传/绘制、编辑历史分支。
- 后续：套餐细化、管理看板、风控规则后台、更多模型和批量生成。

## API

- `POST /api/generate`：创建生成任务。
- `GET /api/tasks/:id`：查询生成任务状态和结果。
- `GET /api/history`：查询当前匿名设备或登录用户的生成历史。
- `POST /api/uploads/presign`：为参考图、遮罩图生成 R2/S3 上传凭证。
- `POST /api/invite/claim`：记录邀请码来源；奖励在被邀请人首次有效生成后结算。
- `GET /api/quota`：返回当前用户或匿名设备的可用免费次数、登录权益和限制状态。

## 数据模型

- `users`：本地用户 ID、外部用户 ID、登录来源、创建时间。
- `anonymous_devices`：设备指纹、IP 哈希、首次访问时间、最近访问时间、免费额度状态。
- `quotas`：用户或匿名设备的免费次数、邀请奖励次数、使用记录。
- `invites`：邀请人、被邀请人、邀请码、状态、奖励发放时间。
- `sessions`：创作会话标题、归属用户/设备、最近更新时间。
- `generation_tasks`：模式、模型、提示词、参数、状态、错误、消耗、结果数量。
- `assets`：图片类型、对象存储 key、URL、尺寸、mime、归属任务和用户。

## 测试计划

- 单元测试：额度计算、邀请奖励结算、JWT 用户映射、模型适配参数转换。
- API 测试：匿名生成、登录生成、额度不足、邀请首次生成奖励、上传凭证、历史查询。
- 风控测试：同 IP 多设备、同设备多账号、频率限制、重复邀请、失败生成不奖励。
- 端到端测试：未登录试用、登录后生成、上传参考图生成、查看历史、邀请链接注册后首次生成。
- 部署验证：Zeabur 环境变量、PostgreSQL 连接、R2/S3 上传、模型 API 调用、`api.lumio.games` JWT 校验。

## 环境变量

- `DATABASE_URL`
- `JWT_PUBLIC_KEY` 或 `JWT_SECRET`
- `LUMIO_API_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_IMAGE_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_IMAGE_MODEL`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`
- `ANON_FREE_GENERATIONS`
- `LOGIN_FREE_GENERATIONS`
- `INVITE_REWARD_GENERATIONS`
- `IP_DAILY_ANON_LIMIT`

## 参考文档

- OpenAI 图像生成文档：https://platform.openai.com/docs/guides/image-generation/
- OpenAI Images API：https://platform.openai.com/docs/api-reference/images/generate
- Gemini 图像生成文档：https://ai.google.dev/gemini-api/docs/image-generation
- Gemini Imagen 文档：https://ai.google.dev/gemini-api/docs/imagen
