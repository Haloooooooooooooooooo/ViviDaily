# ViviDaily

ViviDaily 是一个中文 AI 热点聚合产品原型。当前项目采用 `frontend + backend` 双目录结构：

- [frontend](/e:/my_vibecoding/dailynews/frontend)：React + Vite 前端，负责 Landing Page、加载态、Feed Page、收藏夹和交互展示
- [backend](/e:/my_vibecoding/dailynews/backend)：Node.js 抓取与处理脚本，负责 RSS 采集、过滤、热度排序、AI 处理与 Notion 写入

## 当前状态

- 前端主线已恢复到 [frontend](/e:/my_vibecoding/dailynews/frontend)，不再以 `ViviDaily-github` 作为正式运行入口
- 前端页面可启动，已修复一轮目录变更后导致的配置损坏与明显乱码
- 新闻流、Top5、AI Summary 已统一走同一套前端数据入口，方便后续替换为真实接口
- 后端目前仍是脚本式执行，不是长期运行的 HTTP API 服务

## 快速启动

### 前端

```bash
cd frontend
npm install
npm run dev
```

默认访问：`http://localhost:3000`

### 后端

```bash
cd backend
npm install
npm run dev
```

### 前端读取真实新闻 API

```bash
cd backend
npm run dev:api
```

默认 API 地址：`http://127.0.0.1:3102/api/daily-brief`

说明：

- `npm run dev`：执行原有抓取脚本主流程
- `npm run dev:api`：启动前端可读取的新闻接口

## 后端环境变量

在项目根目录或 `backend/` 下配置 `.env`：

```env
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx
AI_API_KEY=sk-xxx
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
```

## 当前产品口径

- 只抓取“昨天”的新闻
- 如果目标日期没有符合规则的新闻，则不展示结果
- `Hot` 表示昨天抓取到的全部新闻总入口，不是单独分类
- 当前前端字段口径：
  - `Title`
  - `Source`
  - `Category`
  - `Topics`
  - `HotScore`
  - `Summary`
  - `PublishAt`

## 下一步重点

- 继续优化真实接口的分类、主题标签与摘要质量
- 接入真实 Notion 导出能力
- 清理剩余历史目录和过期文档

## Port Rules (Fixed)

- Frontend dev server is fixed to `http://127.0.0.1:3000`
- Backend daily brief API is fixed to `http://127.0.0.1:3102`
- Frontend uses `strictPort: true`, so if `3000` is occupied it will fail fast instead of switching ports
- Backend uses `API_PORT` (default `3102`), so avoid using generic `PORT` for this service

## Deployment & Env

See deployment checklist and env setup:
- [docs/deployment-env.md](/e:/my_vibecoding/dailynews/docs/deployment-env.md)
