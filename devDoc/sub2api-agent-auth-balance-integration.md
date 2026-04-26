# Sub2API 登录与余额接口接入 Prompt

目标：另一个服务接入 Sub2API 的登录态，登录成功后获取右上角头像菜单里的用户内容。当前最需要 `email`，同时需要一个 API 动态获取当前余额 `balance`。

## 给 Agent 的任务 Prompt

你要把外部服务接入 Sub2API 登录和用户余额读取。

Sub2API API Base URL:

```text
https://<sub2api-domain>/api/v1
```

本地 Sub2API 代码库完整路径：

```text
/Users/cui/Sites/sub2api
```

关键本地源码路径：

```text
/Users/cui/Sites/sub2api/backend/internal/server/router.go
/Users/cui/Sites/sub2api/backend/internal/server/routes/auth.go
/Users/cui/Sites/sub2api/backend/internal/server/routes/user.go
/Users/cui/Sites/sub2api/backend/internal/handler/auth_handler.go
/Users/cui/Sites/sub2api/backend/internal/handler/user_handler.go
/Users/cui/Sites/sub2api/backend/internal/handler/dto/types.go
/Users/cui/Sites/sub2api/backend/internal/handler/dto/mappers.go
/Users/cui/Sites/sub2api/backend/internal/pkg/response/response.go
/Users/cui/Sites/sub2api/frontend/src/api/client.ts
/Users/cui/Sites/sub2api/frontend/src/api/auth.ts
/Users/cui/Sites/sub2api/frontend/src/api/user.ts
/Users/cui/Sites/sub2api/frontend/src/stores/auth.ts
/Users/cui/Sites/sub2api/frontend/src/types/index.ts
/Users/cui/Sites/sub2api/frontend/src/components/layout/AppHeader.vue
/Users/cui/Sites/sub2api/frontend/src/utils/embedded-url.ts
/Users/cui/Sites/sub2api/frontend/src/views/user/CustomPageView.vue
/Users/cui/Sites/sub2api/docs/ADMIN_PAYMENT_INTEGRATION_API.md
```

## 现成接口

### 1. 邮箱密码登录

```http
POST /auth/login
Content-Type: application/json
```

完整 URL：

```text
https://<sub2api-domain>/api/v1/auth/login
```

请求体：

```json
{
  "email": "user@example.com",
  "password": "password",
  "turnstile_token": "optional"
}
```

说明：

- `turnstile_token` 可选；如果站点启用了 Turnstile，则前端必须传。
- 登录接口成功后会返回 `access_token`、`refresh_token`、`expires_in`、`token_type` 和 `user`。
- `user.email` 是当前用户邮箱。
- `user.balance` 是登录时刻余额，但余额会变化，实时余额应以后续 `/auth/me` 返回为准。

成功响应是标准 envelope：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 3600,
    "token_type": "Bearer",
    "user": {
      "id": 123,
      "email": "user@example.com",
      "username": "user",
      "role": "user",
      "balance": 12.34,
      "concurrency": 5,
      "status": "active"
    }
  }
}
```

如果返回 2FA：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "requires_2fa": true,
    "temp_token": "...",
    "user_email_masked": "u***@example.com"
  }
}
```

说明用户开启了 2FA，需要继续调用：

```http
POST /auth/login/2fa
Content-Type: application/json
```

请求体：

```json
{
  "temp_token": "...",
  "totp_code": "123456"
}
```

### 2. 获取当前登录用户资料和动态余额

推荐用这个接口作为“当前用户信息 + 当前余额”的唯一实时来源：

```http
GET /auth/me
Authorization: Bearer <access_token>
```

完整 URL：

```text
https://<sub2api-domain>/api/v1/auth/me
```

响应 `data` 中包含右上角头像菜单需要的内容：

- `email`：邮箱，当前最重要字段。
- `username`：展示名来源之一。
- `avatar_url`：头像 URL，可能为空。
- `role`：用户角色。
- `balance`：当前余额。
- `run_mode`：运行模式，可能是 `standard` 或 `simple`。

示例响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 123,
    "email": "user@example.com",
    "username": "user",
    "avatar_url": "https://cdn.example.com/avatar.png",
    "role": "user",
    "balance": 12.34,
    "concurrency": 5,
    "status": "active",
    "allowed_groups": [1, 2],
    "run_mode": "standard"
  }
}
```

外部服务应该用 `data.balance` 作为实时余额，不要只信登录时返回的 `user.balance`。

### 3. 刷新 token

```http
POST /auth/refresh
Content-Type: application/json
```

请求体：

```json
{
  "refresh_token": "<refresh_token>"
}
```

成功后更新本地保存的 `access_token`、`refresh_token`、`expires_in`。

### 4. 登出

```http
POST /auth/logout
Content-Type: application/json
```

请求体：

```json
{
  "refresh_token": "<refresh_token>"
}
```

登出后清除外部服务本地保存的 `access_token`、`refresh_token` 和用户缓存。

## iframe / 自定义页面免登录接入

如果外部服务是被 Sub2API 嵌入为用户侧自定义页面 iframe，Sub2API 已经会把登录态透传到外部页面 URL。

Sub2API 会自动追加 query 参数：

```text
user_id=<当前用户ID>
token=<Sub2API access token>
theme=light|dark
lang=zh|en|...
ui_mode=embedded
src_host=<Sub2API来源站点>
src_url=<Sub2API当前页面URL>
```

示例：

```text
https://external.example.com/page?user_id=123&token=<jwt>&theme=light&lang=zh&ui_mode=embedded&src_host=https%3A%2F%2Fsub2api.example.com&src_url=...
```

外部页面读取 URL query 中的 `token` 后，调用：

```http
GET https://<sub2api-domain>/api/v1/auth/me
Authorization: Bearer <token>
```

这样外部页面无需再次输入邮箱密码。

## curl 示例

登录：

```bash
curl -sS -X POST 'https://<sub2api-domain>/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password"}'
```

获取邮箱和实时余额：

```bash
curl -sS 'https://<sub2api-domain>/api/v1/auth/me' \
  -H 'Authorization: Bearer <access_token>'
```

刷新 token：

```bash
curl -sS -X POST 'https://<sub2api-domain>/api/v1/auth/refresh' \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token":"<refresh_token>"}'
```

## 前端实现要点

1. 所有 Sub2API 业务响应都有 envelope：

```ts
interface ApiEnvelope<T> {
  code: number
  message: string
  data?: T
}
```

必须先判断 `code === 0`，再读取 `data`。

2. 登录成功后保存：

```ts
access_token
refresh_token
expires_in
user.email
user.balance
```

3. 页面展示或业务判断余额时，调用 `/auth/me` 刷新：

```ts
const res = await fetch(`${baseUrl}/auth/me`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
})
const envelope = await res.json()
if (envelope.code !== 0) throw new Error(envelope.message)
const user = envelope.data
console.log(user.email, user.balance)
```

4. 如果 access token 过期，调用 `/auth/refresh`，然后重试 `/auth/me`。

## 安全要求

- token 必须只通过 HTTPS 使用。
- 不要把 `token` 写入服务端日志、URL 访问日志、错误上报或第三方统计。
- iframe query token 模式只适合受信任外部页面。外部页面拿到 token 后应尽快放入内存状态，避免继续传播。
- 如果浏览器跨域请求 Sub2API 被 CORS 拦截，可以选择：
  - 配置 Sub2API CORS 允许该外部域名；
  - 或由外部服务后端代请求 `/auth/me`。

## 当前能力边界

当前 Sub2API 已有：

- 邮箱密码登录。
- 2FA 登录。
- 当前用户资料接口 `/auth/me`。
- 用户资料接口 `/user/profile`。
- refresh token。
- iframe 自定义页面通过 query 透传 `token`。

当前没有看到标准 OAuth Provider / OIDC 授权码模式给第三方网站使用。  
如果需求是真正的“第三方网站跳转到 Sub2API 登录，成功后回调第三方网站并换取用户信息”，需要在 Sub2API 新增 OAuth/OIDC Provider 功能。

## 本地代码依据

- API v1 总路由：`/Users/cui/Sites/sub2api/backend/internal/server/router.go`
- 登录、刷新、当前用户路由：`/Users/cui/Sites/sub2api/backend/internal/server/routes/auth.go`
- 用户资料路由：`/Users/cui/Sites/sub2api/backend/internal/server/routes/user.go`
- 登录响应结构 `AuthResponse`：`/Users/cui/Sites/sub2api/backend/internal/handler/auth_handler.go`
- `/auth/me` handler：`/Users/cui/Sites/sub2api/backend/internal/handler/auth_handler.go`
- `/user/profile` handler：`/Users/cui/Sites/sub2api/backend/internal/handler/user_handler.go`
- 用户 DTO 字段 `email`、`balance`、`avatar_url`：`/Users/cui/Sites/sub2api/backend/internal/handler/dto/types.go`
- DTO 映射：`/Users/cui/Sites/sub2api/backend/internal/handler/dto/mappers.go`
- 标准响应 envelope：`/Users/cui/Sites/sub2api/backend/internal/pkg/response/response.go`
- 前端 axios envelope 解包和 Bearer token 注入：`/Users/cui/Sites/sub2api/frontend/src/api/client.ts`
- 前端登录 API 封装：`/Users/cui/Sites/sub2api/frontend/src/api/auth.ts`
- 前端用户资料 API 封装：`/Users/cui/Sites/sub2api/frontend/src/api/user.ts`
- 前端 auth store，自动刷新 `/auth/me`：`/Users/cui/Sites/sub2api/frontend/src/stores/auth.ts`
- 前端用户类型定义：`/Users/cui/Sites/sub2api/frontend/src/types/index.ts`
- 右上角头像、邮箱、余额展示：`/Users/cui/Sites/sub2api/frontend/src/components/layout/AppHeader.vue`
- iframe URL token 透传工具：`/Users/cui/Sites/sub2api/frontend/src/utils/embedded-url.ts`
- 自定义页面 iframe 调用位置：`/Users/cui/Sites/sub2api/frontend/src/views/user/CustomPageView.vue`
- 自定义页面 query 透传文档：`/Users/cui/Sites/sub2api/docs/ADMIN_PAYMENT_INTEGRATION_API.md`
