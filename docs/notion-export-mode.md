# Notion 导出模式（最终决策）

## 结论

ViviDaily 使用双模式导出：

1. `shared`（默认）  
- 使用平台统一的 `NOTION_API_KEY + NOTION_DATABASE_ID` 导出。  
- 适合开发期、演示期、单人使用。

2. `user_oauth`（对外开放推荐）  
- 每个用户用自己的 Notion 账号授权（OAuth）。  
- 每个用户设置自己的 `databaseId`。  
- 导出时写入用户自己的数据库。

当前通过 `NOTION_EXPORT_MODE` 控制：
- `shared`
- `user_oauth`

---

## 后端接口（已接入）

1. `GET /api/notion/oauth/start`  
- 需要登录态 `Authorization: Bearer <access_token>`  
- 返回 `authUrl`

2. `GET /api/notion/oauth/callback`  
- Notion OAuth 回调地址  
- 成功后重定向到 `FRONTEND_URL/?notion_oauth=success`

3. `GET /api/notion/oauth/status`  
- 查询当前用户是否已连接 Notion，是否已设置数据库 ID

4. `POST /api/notion/oauth/database`  
- body: `{ "databaseId": "xxx" }`  
- 给当前登录用户绑定导出目标数据库

5. `DELETE /api/notion/oauth/disconnect`  
- 断开当前用户的 Notion 连接

---

## 首次导入引导（前端建议）

当用户第一次点击“导入 Notion”时：

1. 先调用 `/api/notion/oauth/status`  
2. 若未连接：提示“连接 Notion”并调用 `/api/notion/oauth/start` 跳转授权  
3. 授权回跳后再次查状态  
4. 若无 `databaseId`：弹窗让用户输入数据库 ID 并调用 `/api/notion/oauth/database`  
5. 再执行导出

---

## 环境变量

```env
NOTION_EXPORT_MODE=user_oauth
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=https://api.yourdomain.com/api/notion/oauth/callback
FRONTEND_URL=https://your-frontend-domain.com
```

---

## 安全说明

1. 不要求用户提交 Notion 密钥给管理员/AI。  
2. 走标准 OAuth 授权。  
3. 当前版本已支持把用户 Notion 连接信息持久化到 Supabase 表中，避免服务重启后授权状态丢失。  

---

## Supabase 持久化说明

推荐创建表：`user_notion_connections`

建议字段：

- `user_id` `text primary key`
- `access_token` `text not null`
- `workspace_id` `text not null`
- `workspace_name` `text not null`
- `database_id` `text null`
- `connected_at` `timestamptz not null`
- `updated_at` `timestamptz not null default now()`

后端使用的环境变量：

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NOTION_OAUTH_TABLE=user_notion_connections
```

如果没有配置 `SUPABASE_SERVICE_ROLE_KEY`，后端仍会退回到进程内存作为兜底，但生产环境不建议这样部署。
