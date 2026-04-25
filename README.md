# Lumio Image Studio

Next.js 全栈图像生成公开站。前端提供中文创作工作台，服务端负责生成代理、PostgreSQL 业务数据、S3/R2 图片存储、免费额度、邀请奖励和基础防刷。

## 本项目负责

- 图像生成工作台。
- Gemini 与 GPT Image 的服务端适配。
- 匿名免费次数、登录免费次数、邀请奖励。
- 提示词、任务、历史记录和图片资产元数据。
- S3/R2 上传和生成结果保存。

`https://api.lumio.games/` 继续负责注册登录、支付、平台 Token/API Key 和计费策略。

## 本地开发

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

## Zeabur 部署

1. 创建 Next.js 服务并连接本仓库。
2. 添加 PostgreSQL 服务，把连接串写入 `DATABASE_URL`。
3. 配置 S3/R2 环境变量。
4. 配置 `JWT_SECRET` 或 `JWT_PUBLIC_KEY`，用于验证 `api.lumio.games` 登录 token。
5. 配置 `OPENAI_API_KEY`、`GEMINI_API_KEY` 和对应模型 ID。
6. 部署后运行 `npm run db:migrate` 应用数据库表结构。

### 部署环境变量

数据库：

```env
DATABASE_URL=postgres://user:password@host:5432/lumio
DATABASE_SSL=false
```

如果数据库要求 SSL，把 `DATABASE_SSL` 改成 `true`。如果日志出现 `The server does not support SSL connections`，说明当前数据库不支持 SSL，应使用 `DATABASE_SSL=false`。

OpenAI：

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com
OPENAI_IMAGE_MODEL=gpt-image-2
IMAGE_PROVIDER_TIMEOUT_MS=40000
```

`OPENAI_BASE_URL` 默认是 `https://api.openai.com`，使用官方 OpenAI 时可以不填。使用中转服务时填写中转根地址，不要带 `/v1`，代码会自动请求 `/v1/images/generations` 和 `/v1/images/edits`。

`IMAGE_PROVIDER_TIMEOUT_MS` 控制图像模型请求超时时间。Zeabur 网关约 50 秒会断开长请求，建议保持 `40000`，让应用先返回可读错误。

Gemini：

```env
GEMINI_API_KEY=...
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

S3/R2：

```env
S3_ENDPOINT=https://...
S3_REGION=auto
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://...
```

认证和额度：

```env
LUMIO_API_BASE_URL=https://api.lumio.games
NEXT_PUBLIC_LUMIO_LOGIN_URL=https://api.lumio.games/
JWT_SECRET=
JWT_PUBLIC_KEY=
ANON_FREE_GENERATIONS=3
LOGIN_FREE_GENERATIONS=20
INVITE_REWARD_GENERATIONS=10
IP_DAILY_ANON_LIMIT=30
FINGERPRINT_SALT=change-me
```

`JWT_SECRET` 和 `JWT_PUBLIC_KEY` 二选一，用于验证 `api.lumio.games` 登录 token。

### 数据库迁移

首次部署或更换数据库后，在服务终端执行：

```bash
npm run db:migrate
```

迁移会创建 `anonymous_devices`、`generation_tasks`、`assets`、`quota_balances` 等业务表。执行成功后会输出：

```text
Database schema applied
```

### 常见部署错误

- `DATABASE_URL is not configured`：服务环境变量缺少 `DATABASE_URL`。
- `The server does not support SSL connections`：设置 `DATABASE_SSL=false` 后重启服务。
- `relation "anonymous_devices" does not exist`：数据库表未创建，执行 `npm run db:migrate`。
- `Cannot find module '/app/scripts/migrate.mjs'`：运行镜像缺少迁移脚本，重新部署最新 `main` 分支。
- `请求失败：502`：查看 Zeabur Logs。常见原因是图像接口超时、`OPENAI_API_KEY` 缺失、S3/R2 环境变量缺失或上游网关返回非 JSON 错误。Zeabur 约 50 秒断开长请求，保持 `IMAGE_PROVIDER_TIMEOUT_MS=40000` 可以让应用先返回可读错误。
- 构建日志出现 `npm update -g npm`：确认部署的是最新 `main` 分支，并使用仓库根目录的 `Dockerfile` 构建。

## 常用命令

```bash
npm test
npm run build
npm run db:migrate
```
