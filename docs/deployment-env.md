# ViviDaily 部署与环境配置（对外可用）

## 1) 固定端口与服务职责

- 前端开发端口：`3000`（`VITE_DEV_PORT=3000`，`strictPort=true`）
- 后端 API 端口：`3102`（`API_PORT=3102`）
- 前端调用后端：`VITE_API_BASE_URL=http://127.0.0.1:3102`

## 2) Notion 字段最终版（严格对齐）

Notion Database 必须包含以下字段，且类型必须一致：

- `Title`: `title`
- `URL`: `url`（必填）
- `Source`: `select`
- `Category`: `select`
- `Topics`: `multi_select`
- `HotScore`: `number`
- `Summary`: `rich_text`
- `PublishAt`: `date`

后端已启用严格校验：任一字段缺失或类型不匹配，会直接返回可读错误并拒绝写入。

## 3) 环境变量清单

建议在项目根目录 `.env` 统一配置（后端会读取根目录 `.env`）：

```env
# Notion
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxx

# AI
AI_API_KEY=sk-xxx
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat

# Backend
API_PORT=3102
CORS_ALLOW_ORIGIN=http://127.0.0.1:3000

# Frontend
VITE_API_BASE_URL=http://127.0.0.1:3102
VITE_DEV_PORT=3000
```

生产环境把 `CORS_ALLOW_ORIGIN` 改成你的前端域名，例如：

```env
CORS_ALLOW_ORIGIN=https://vividaily.yourdomain.com
```

## 4) 本地启动

1. 根目录创建 `.env`，填好配置。
2. 安装依赖：
   - `cd frontend && npm install`
   - `cd ../backend && npm install`
3. 启动后端：
   - `cd backend && npm run dev:api`
4. 启动前端：
   - `cd frontend && npm run dev`

访问：

- 前端：`http://127.0.0.1:3000`
- 后端健康检查：`http://127.0.0.1:3102/health`

## 5) 对外开放前必做

- 后端部署到公网可访问地址（带 HTTPS）。
- 前端 `VITE_API_BASE_URL` 改成公网后端地址。
- 后端 `CORS_ALLOW_ORIGIN` 只允许前端正式域名。
- 确保 Notion Integration 已共享到目标数据库。
- 配置日志与重启策略（PM2 / Docker / 平台托管）。

## 6) 快速排障

- 前端能开但无数据：检查 `VITE_API_BASE_URL` 与 `/api/daily-brief`。
- 导出 Notion 失败：检查 `NOTION_API_KEY`、`NOTION_DATABASE_ID`、数据库字段类型。
- 浏览器跨域报错：检查 `CORS_ALLOW_ORIGIN` 是否匹配前端域名。
- 端口冲突：前端 3000 或后端 3102 被占用时，先释放端口再启动。
