# ViviDaily

**中文 AI 热点新闻聚合日报** —— 每日自动抓取、筛选、排序昨天的 AI 行业热点新闻，生成 Top5 榜单和 AI 摘要。

## 功能特性

### 核心功能

- **RSS 新闻抓取**：从 12+ 中文 AI 媒体源自动采集新闻
- **智能热度排序**：基于实体命中、事件关键词、来源权威度计算 HotScore
- **AI 摘要生成**：调用 DeepSeek API 生成 60-100 字精炼摘要
- **实体去重**：基于公司+产品+事件签名去重，避免同一事件重复展示
- **Top5 热门榜单**：自动生成昨日最热新闻排行
- **Notion 导出**：支持将新闻导出到 Notion 数据库
- **用户级 Notion OAuth**：登录用户可授权自己的 Notion 工作区
- **用户认证**：基于 Supabase 的邮箱密码注册/登录
- **登录门禁**：收藏和导出功能需要登录后使用

### 热度计算逻辑

| 因素 | 权重 | 说明 |
|------|------|------|
| 来源权威度 | 0.9x ~ 1.5x | 官方博客 > 头部媒体 > 综合媒体 |
| 实体命中 | ×9 | OpenAI、Google、字节等公司名 |
| 事件命中 | ×5 | 发布、开源、融资、上线等 |
| 跨平台热度 | +5 ~ +10 | 同一事件被多平台报道 |
| 发布时间 | -3 ~ +5 | 白天高峰加分，凌晨减分 |

### 信息源

| 等级 | 来源 |
|------|------|
| **官方** | OpenAI News |
| **头部媒体** | 量子位、机器之心、新智元、InfoQ、RadarAI、雷锋网AI、36Kr |
| **综合媒体** | IT之家、极客公园、爱范儿、cnBeta |

## 技术架构

```
dailynews/
├── frontend/          # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   ├── lib/          # API 调用、工具函数
│   │   └── data/         # Mock 数据
│   └── vite.config.ts
│
├── backend/           # Node.js + TypeScript
│   ├── src/
│   │   ├── api/          # HTTP API 服务
│   │   │   ├── daily-brief.ts  # 核心业务逻辑
│   │   │   ├── server.ts       # HTTP 服务器
│   │   │   ├── notion-export.ts # Notion 导出
│   │   │   └── notion-oauth.ts  # 用户级 OAuth
│   │   ├── lib/          # Supabase 客户端、认证
│   │   ├── ai/           # AI 处理模块
│   │   ├── notion/       # Notion 客户端
│   │   └── sources/      # RSS 源配置
│   └── tsconfig.json
│
├── docs/              # 项目文档
│   ├── prd-progress.md     # PRD 进度
│   └── deployment-env.md   # 部署指南
│
└── .env               # 环境变量配置
```

## 快速启动

### 1. 环境准备

在项目根目录创建 `.env` 文件：

```env
# Notion（共享模式导出）
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx

# Notion OAuth（用户级授权，可选）
NOTION_CLIENT_ID=xxx
NOTION_CLIENT_SECRET=xxx
NOTION_REDIRECT_URI=http://127.0.0.1:3102/api/notion/oauth/callback
NOTION_EXPORT_MODE=user_oauth  # 或 shared

# AI（必需，用于摘要生成）
AI_API_KEY=sk-xxx
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat

# Backend
API_PORT=3102
CORS_ALLOW_ORIGIN=http://127.0.0.1:3000
FRONTEND_URL=http://127.0.0.1:3000

# Supabase（用户认证）
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend
VITE_API_BASE_URL=http://127.0.0.1:3102
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. 安装依赖

```bash
# 后端
cd backend && npm install

# 前端
cd frontend && npm install
```

### 3. 启动服务

```bash
# 终端 1：启动后端 API
cd backend && npm run dev:api

# 终端 2：启动前端
cd frontend && npm run dev
```

### 4. 访问

- **前端**：http://localhost:3000
- **后端健康检查**：http://localhost:3102/health
- **每日简报 API**：http://localhost:3102/api/daily-brief

## API 文档

### GET /api/daily-brief

获取昨天的 AI 热点新闻简报。

**响应示例**：

```json
{
  "news": [
    {
      "id": "1",
      "Title": "OpenAI 发布 GPT-5",
      "Source": "量子位",
      "Category": "模型",
      "Topics": ["LLM", "模型发布", "OpenAI"],
      "HotScore": 150,
      "Summary": "OpenAI 正式发布 GPT-5 模型...",
      "PublishAt": "2026-04-11 10:30",
      "originalUrl": "https://..."
    }
  ],
  "top5": [...],
  "summary": ["昨日共筛出 20 条新闻..."],
  "date": "2026-04-11",
  "total": 20
}
```

### POST /api/notion/export

将新闻导出到 Notion 数据库。

**请求体**：

```json
{
  "item": {
    "Title": "...",
    "Source": "...",
    "Category": "...",
    "Topics": [...],
    "HotScore": 100,
    "Summary": "...",
    "PublishAt": "...",
    "originalUrl": "..."
  }
}
```

### POST /api/auth/register

注册新用户。

**请求体**：

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST /api/auth/login

用户登录。

**请求体**：

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**：

```json
{
  "ok": true,
  "user": { "id": "xxx", "email": "user@example.com" },
  "session": { "access_token": "xxx", "refresh_token": "xxx" }
}
```

### GET /api/auth/me

获取当前用户信息。

**请求头**：`Authorization: Bearer <access_token>`

### POST /api/auth/logout

登出当前用户。

**请求头**：`Authorization: Bearer <access_token>`

### Notion OAuth API

用户级 Notion 授权相关接口：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/notion/oauth/start` | GET | 发起 Notion OAuth 授权 |
| `/api/notion/oauth/callback` | GET | OAuth 回调（系统内部使用） |
| `/api/notion/oauth/status` | GET | 获取用户 Notion 连接状态 |
| `/api/notion/oauth/database` | POST | 设置导出目标数据库 ID |
| `/api/notion/oauth/disconnect` | DELETE | 断开 Notion 连接 |

**Notion OAuth 流程**：

1. 用户登录后调用 `/api/notion/oauth/start` 获取授权链接
2. 用户在 Notion 页面授权后回调到前端
3. 前端调用 `/api/notion/oauth/status` 检查连接状态
4. 调用 `/api/notion/oauth/database` 设置目标数据库 ID
5. 之后即可使用导出功能

**Notion 数据库字段要求**：

首次导出前，需要在 Notion 数据库中创建以下字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| Title | 标题 | 新闻标题（必填） |
| URL | URL | 原文链接 |
| Source | 单选 | 新闻来源 |
| Category | 单选 | 分类：模型/产品/政策/商业 |
| Topics | 多选 | 主题标签 |
| HotScore | 数字 | 热度分数 |
| Summary | 文本 | AI 摘要 |
| PublishAt | 日期 | 发布时间 |

**提示**：支持直接粘贴完整的 Notion 数据库 URL，系统会自动提取 Database ID。

## 产品口径

- **时间范围**：只抓取"昨天"的新闻（北京时间）
- **无结果规则**：如果昨天没有符合规则的新闻，不展示结果
- **分类标签**：Hot（全部）、模型、产品、政策、商业
- **排序规则**：按 HotScore 降序，同分按发布时间降序

## 字段定义

| 字段 | 类型 | 说明 |
|------|------|------|
| `Title` | string | 新闻标题 |
| `Source` | string | 新闻来源 |
| `Category` | select | 分类：模型/产品/政策/商业 |
| `Topics` | multi-select | 主题标签（1-3 个） |
| `HotScore` | number | 热度分数 |
| `Summary` | string | AI 生成的摘要 |
| `PublishAt` | string | 发布时间 |

## 分类优先级

模型 > 产品 > 政策 > 商业

## 主题标签

预定义标签：LLM、Agent、多模态、开源、融资、推理、AI 产品、模型发布、AI 芯片、自动驾驶、机器人、AI 安全、政策监管、RAG、算力、OpenAI、Google、Anthropic、DeepSeek、字节跳动、智谱AI、月之暗面

## 端口规则

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 3000 | `strictPort: true`，端口占用会报错 |
| 后端 API | 3102 | 可通过 `API_PORT` 环境变量修改 |

## 部署

### 部署架构

推荐部署方案：
- **前端**：Vercel（静态托管 + SPA 路由）
- **后端**：Render / Railway（长驻 Node 服务）

### 部署步骤

1. **前端部署到 Vercel**
   - Root Directory 设置为 `frontend`
   - 环境变量参考 `frontend/.env.production.example`

2. **后端部署到 Render/Railway**
   - 环境变量参考 `backend/.env.production.example`

3. **关键配置项**

| 配置 | 说明 |
|------|------|
| `CORS_ALLOW_ORIGIN` | 设置为前端域名，不要用 `*` |
| `NOTION_REDIRECT_URI` | 必须与 Notion Integration 后台一致 |
| `FRONTEND_URL` | OAuth 回跳地址，必须与实际域名一致 |

4. **第三方配置同步**

- Notion Integration 后台的 Redirect URI 必须与 `NOTION_REDIRECT_URI` 完全一致
- Supabase Auth 配置里补齐 Site URL 和 Redirect URLs

详见 [docs/deployment-env.md](docs/deployment-env.md) 和 [docs/deploy-vercel.md](docs/deploy-vercel.md)

## 开发进度

详见 [docs/prd-progress.md](docs/prd-progress.md)

## License

MIT
