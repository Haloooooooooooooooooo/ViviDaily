# VIviDaily

> AI 热点新闻聚合日报 — 每日一推，洞察全球 AI 动态

## 项目简介

VIviDaily 是一个日报形式的 AI 新闻聚合网页应用。用户点击按钮即可获取昨天的 AI 热点新闻，快速了解行业动态。

**目标用户**：AI从业者、研究者、投资者、产品经理、技术观察者、开发者

**使用场景**：
- 工作间隙快速浏览 AI 行业热点
- 深夜/办公室环境使用（Dark Mode 优先）
- 需要高效获取信息，而非沉浸式阅读

---

## 项目结构

本项目采用前后端分离架构：

```
ViviDaily/
├── frontend/          # React 前端应用
│   ├── src/           # 源代码
│   ├── package.json   # 前端依赖
│   └── vite.config.ts # Vite 配置
├── backend/           # Node.js 后端服务
│   ├── src/           # 源代码
│   │   ├── sources/   # RSS 采集源
│   │   ├── ai/        # AI 处理模块
│   │   └── notion/    # Notion 集成
│   └── package.json   # 后端依赖
└── docs/              # 项目文档
```

---

## 功能概览

| 功能 | 状态 | 说明 |
|------|------|------|
| Landing Page | ✅ | 极简入口，一键获取今日热点 |
| Feed Page | ✅ | 三栏布局：左侧菜单 + 中间新闻流 + 右侧 Top5/AI总结 |
| 收藏夹页面 | ✅ | 三列卡片展示已收藏内容 |
| 登录弹窗 | ✅ | 邮箱密码注册/登录 |
| 菜单筛选 | ✅ | Hot/商业/模型/产品/政策 分类筛选 |
| 搜索功能 | ✅ | 关键词实时搜索 |
| 收藏功能 | ✅ | 收藏/取消收藏，收藏夹同步 |
| 分享功能 | ✅(前端) | 复制链接 + Toast 提示 |
| 导入 Notion | ✅(前端) | 按钮状态切换，待接入 API |
| 热门榜单交互 | ✅ | 点击跳转对应新闻 + 高亮动画 |
| 加载状态 | ✅ | 居中大图标加载动画 |
| 后端 API | 🔜 | 爬取数据、AI处理、存储 |
| Notion 导出 | 🔜 | 用户授权后写入 |

---

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 pnpm

### 1. 克隆项目

```bash
git clone https://github.com/Haloooooooooooooooooo/ViviDaily.git
cd ViviDaily
```

### 2. 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 3. 配置环境变量（后端）

在 `backend/` 目录下创建 `.env` 文件：

```env
# Notion配置
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx

# DeepSeek AI配置
AI_API_KEY=sk-xxx
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
```

### 4. 启动开发服务器

```bash
# 启动前端开发服务器
cd frontend
npm run dev
# 访问 http://localhost:3000

# 启动后端服务（另一个终端）
cd backend
npm run dev
```

---

## 技术栈

### 前端

| 技术 | 说明 |
|------|------|
| React 18 | 前端框架 |
| TypeScript | 类型安全 |
| Tailwind CSS | 原子化样式 |
| Framer Motion | 动画库 |
| Vite | 构建工具 |
| Lucide React | 图标库 |

### 后端

| 技术 | 说明 |
|------|------|
| Node.js | 运行时 |
| TypeScript | 类型安全 |
| rss-parser | RSS 解析 |
| DeepSeek API | AI 处理 |
| Notion API | 数据存储 |

---

## 数据源

当前支持的 RSS 信息源：

| 来源 | 类型 | 优先级 |
|------|------|--------|
| 36氪 | 中文 | 高 |
| 量子位 | 中文 | 高 |
| 机器之心 | 中文 | 高 |
| 新智元 | 中文 | 高 |
| 虎嗅 | 中文 | 中 |
| InfoQ | 中文 | 中 |
| Hacker News | 英文 | 高 |
| TLDR AI | 英文 | 高 |
| VentureBeat | 英文 | 中 |
| MIT Tech Review | 英文 | 中 |

---

## 标签体系

| 标签类型 | 说明 | 示例 |
|---------|------|------|
| 来源标签 | 标识新闻来源 | 量子位、36氪、HackerNews |
| 分类标签 | 菜单筛选依据 | Hot、商业、模型、产品、政策 |
| 主题标签 | AI 提取的技术主题 | LLM、Agent、AIGC、多模态 |

**预定义主题标签**：
LLM、Agent、AIGC、多模态、开源、融资、推理、AI产品、模型发布、AI芯片、自动驾驶、机器人、AI应用、AI安全、政策监管、数据工程、RAG、算力、云平台、编程助手

---

## 设计原则

1. **信息密度优先**：一屏展示尽可能多的有用内容
2. **功能优先**：每个视觉元素都有明确功能，不为装饰而装饰
3. **Dark Mode 原生**：基于暗色设计，而非从 Light Mode 转换
4. **科技感克制**：技术硬核但不冷冰冰，保持可读性
5. **高效交互**：点击少、路径短、操作快

---

## 开发路线图

### P0 - MVP
- [x] Landing Page
- [x] Feed Page 三栏布局
- [x] 收藏夹页面
- [x] 登录弹窗
- [x] 菜单筛选 + 搜索
- [x] 收藏功能
- [ ] 后端 API（爬取 + AI处理 + 存储）
- [ ] Notion 导出

### P1 - 增强
- [ ] 用户收藏同步
- [ ] 热度评分算法
- [ ] 更多信息源

---

## 许可证

MIT
