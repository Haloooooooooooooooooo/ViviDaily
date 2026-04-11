# VIviDaily

> AI热点新闻聚合日报系统

## 项目简介

VIviDaily 是一个 AI 热点新闻聚合系统，自动爬取、处理、存储 AI 领域的热点新闻到 Notion。

### 核心功能

- **多源采集**：支持 RSS 订阅源爬取，涵盖国内外主流 AI 媒体
- **智能筛选**：基于关键词匹配和热度评分算法过滤高质量内容
- **AI 处理**：自动生成摘要、提取主题标签
- **Notion 集成**：一键同步到 Notion 数据库，便于知识管理

## 技术栈

| 技术 | 说明 |
|------|------|
| **运行时** | Node.js + TypeScript |
| **RSS 解析** | rss-parser |
| **AI 处理** | DeepSeek API |
| **存储** | Notion API |

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Haloooooooooooooooooo/ViviDaily.git
cd ViviDaily
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，填写以下配置：

```env
# Notion配置
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx

# DeepSeek AI配置
AI_API_KEY=sk-xxx
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
```

### 4. 运行

```bash
npm start
```

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

## 项目结构

```
src/
├── index.ts          # 主入口
├── types/            # 类型定义
├── sources/          # RSS 采集源
│   ├── rss.ts        # RSS 配置与采集
│   ├── tldr.ts       # TLDR 源
│   ├── hackerNews.ts # HN 源
│   └── ...           # 其他源
├── ai/               # AI 处理模块
│   └── processor.ts  # 摘要生成、标签提取
└── notion/           # Notion 集成
    └── client.ts     # 数据写入
```

## 筛选规则

系统通过以下规则筛选高质量 AI 热点：

1. **关键词匹配**：AI 相关关键词、热点实体、热点事件
2. **热度评分**：综合来源权重、关键词命中、时效性计算
3. **去重机制**：基于标题和事件签名去重
4. **时间过滤**：仅保留北京时间当天的新闻

## Notion 数据库字段

| 字段 | 类型 | 说明 |
|------|------|------|
| Title | 标题 | 新闻标题 |
| Source | 单选 | 新闻来源 |
| Category | 单选 | 分类（商业/模型/产品/政策） |
| Topics | 多选 | 主题标签 |
| HotScore | 数值 | 热度分数 |

## 开发

```bash
# 开发模式（热重载）
npm run dev

# 构建
npm run build
```

## 许可证

MIT
