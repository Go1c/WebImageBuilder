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

## 常用命令

```bash
npm test
npm run build
npm run db:migrate
```
