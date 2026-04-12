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
│   │   │   └── notion-export.ts # Notion 导出
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
# Notion（可选，用于导出功能）
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx

# AI（必需，用于摘要生成）
AI_API_KEY=sk-xxx
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat

# Backend
API_PORT=3102
CORS_ALLOW_ORIGIN=http://127.0.0.1:3000

# Frontend
VITE_API_BASE_URL=http://127.0.0.1:3102
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

详见 [docs/deployment-env.md](docs/deployment-env.md)

## 开发进度

详见 [docs/prd-progress.md](docs/prd-progress.md)

## License

MIT
