# ViviDaily PRD 进度

> 最后更新：2026-04-14（信息源扩展至 22 个 RSS 源 + 国际源接入）

## 一、当前正式实现口径

当前项目以 `frontend + backend` 结构作为唯一正式主线，不再以 `ViviDaily-github` 作为运行入口。

- `frontend/`：产品前端界面
- `backend/`：RSS 抓取、过滤、热度排序、AI 处理、Notion 写入

当前页面实现以现有前端原型为准，不再额外设计一套“正式落地页”再开发。

## 二、产品核心定义

- 产品名：ViviDaily
- 产品形态：中文 AI 热点新闻聚合网页应用
- 核心触发方式：用户在 Landing Page 点击 `Get Started` 后，进入抓取加载态，再进入 Feed Page
- 内容时间口径：只看昨天的新闻
- 无结果规则：如果昨天没有符合规则的新闻，则不展示结果

## 三、信息源范围

当前已接入 22 个 RSS 源，按优先级分层：

### P0 核心源（最高优先级）

| 源 | 类型 | 说明 |
|---|---|---|
| 量子位 | 中文 AI 垂直媒体 | 模型、产品、产业动态密度高 |
| InfoQ | 中文技术媒体 | 技术与工程化质量稳定 |
| RadarAI | AI 聚合站 | 更新快，适合补热点和开源动态 |
| 雷锋网AI | 中文 AI 垂直媒体 | 产业、产品与公司新闻 |
| OpenAI News | 官方源 | OpenAI 模型、产品、平台发布 |
| DeepMind Blog | 官方源 | Google DeepMind 研究和模型发布 |
| Google AI Blog | 官方源 | Gemini、产品和平台能力 |
| Hugging Face Blog | 官方源 | 开源生态核心，模型、工具链和社区热点 |

### P1 重要源（次优先级）

| 源 | 类型 | 说明 |
|---|---|---|
| 机器之心 | 中文 AI 技术媒体 | 技术与论文向新闻 |
| 新智元 | 中文 AI 产业媒体 | 行业落地和商业动态 |
| 36Kr | 泛科技媒体 | 创业、融资和商业化 |
| 钛媒体 | 泛科技商业媒体 | 行业趋势和公司动态 |
| 少数派 | 产品媒体 | AI 产品实践 |
| IT之家 | 科技媒体 | 大厂、终端、产品快讯 |
| 爱范儿 | 消费科技媒体 | AI 产品落地 |
| Berkeley BAIR | 研究机构 | 研究方向和学术动态 |
| MIT Tech Review | 国际科技媒体 | AI 趋势、政策和产业分析 |
| TechCrunch AI | 国际科技媒体 | 创业和产品发布，国际 AI 商业动态 |
| VentureBeat AI | 国际科技媒体 | 企业级 AI、产品和商业新闻 |
| Ars Technica AI | 国际科技媒体 | AI 政策、安全与产品新闻 |

### P2 补充源（低优先级）

| 源 | 类型 | 说明 |
|---|---|---|
| Hacker News AI | 社区聚合 | 开源项目和开发者侧热点 |

### 源状态说明

- `active`: 当前启用，参与抓取
- `candidate`: 待验证，暂不启用
- `paused`: 暂停使用

### 已知问题

部分中文源 RSS 端点不稳定：
- 机器之心：RSS 重定向到付费数据服务
- 新智元：请求超时
- 36Kr：请求失败

说明：
- 国际源（OpenAI、DeepMind、Google AI 等）已接入，提升国际 AI 动态覆盖
- 重点抓取大公司、大模型与高热事件相关内容
- 对 Google、OpenAI、Claude、DeepSeek、Gemini 等重要名词提高关注权重

## 四、数据字段口径

当前 Notion 与前端展示统一使用以下字段：

| 字段 | 类型 | 用途 |
|------|------|------|
| `Title` | Title | 新闻标题 |
| `URL` | URL（必填） | 原文链接 |
| `Source` | Select | 新闻来源 |
| `Category` | Select | 主分类 |
| `Topics` | Multi-select | 主题标签 |
| `HotScore` | Number | 热度分数 |
| `Summary` | Rich Text | AI 摘要 |
| `PublishAt` | Date | 发布时间 |

已移除字段：

- `Impact`
- `Audience`

## 五、分类与标签

### 分类标签

分类标签固定为：

- `Hot`
- `商业`
- `模型`
- `产品`
- `政策`

说明：

- `Hot` 指昨天抓取到的全部新闻总入口
- 其他分类用于左侧筛选与页面展示

### 主题标签

主题标签采用“AI 辅助提取”方案：

- 将标题和摘要输入 AI
- 优先从预定义标签集合中选出 1 到 3 个
- 如果预定义集合里没有合适标签，允许 AI 额外提炼 1 个短标签

当前预定义主题标签集合：

- `LLM`
- `Agent`
- `AIGC`
- `多模态`
- `开源`
- `融资`
- `推理`
- `AI 产品`
- `模型发布`
- `AI 芯片`
- `自动驾驶`
- `机器人`
- `AI 应用`
- `AI 安全`
- `政策监管`
- `数据工程`
- `RAG`
- `算力`
- `云平台`
- `编程助手`

补充规则：

- 补充标签应尽量短
- 不与分类标签重复
- 不使用“AI”“热点”“新闻”这类过宽标签

## 六、HotScore 与 Top5 逻辑

### 每条新闻打分逻辑

`HotScore` 由规则加权生成，核心考虑：

- **来源权重**：`priority × authorityLevel × 10`
  - authorityLevel: official(1.5) > headMedia(1.2) > generalMedia(1.0)
- **实体权重**：命中重点公司/模型加分
  - Top Tier (OpenAI, Google, Anthropic, DeepSeek, NVIDIA): +12
  - Second Tier (字节, 百度, 腾讯, 阿里, 智谱, 月之暗面, 微软, Meta, Apple): +8
  - 其他重要实体: +5
- **事件加分**：命中”发布、开源、上线、升级、融资、收购”等 +5
- **AI 关键词**：命中 AI 相关词 +3/词
- **跨平台热度**：同一事件被多个源报道，额外加分 (+5/+10)
- **内容密度**：长内容 (>1500字) +5，中等内容 (>800字) +3
- **标题强实体**：标题含 OpenAI/Google/Anthropic/DeepSeek 等 +8
- **标题中国大厂**：标题含 字节/百度/腾讯/阿里/华为/智谱/月之暗面 +6
- **标题热点事件**：标题含 发布/开源/上线/升级/融资/收购 +5
- **低信号惩罚**：命中”股价、财报、售价、评测”等 -5/词
- **汇总词惩罚**：命中”日报、周报、合集、回顾” -10
- **标题党惩罚**：命中”重磅、震惊、终于”等 + 内容薄 (<200字) -8~-15

最低门槛：`HotScore >= 8` 才进入候选池

一句话版：

系统会根据”关键词强度 + 重点实体 + 热点事件 + 来源权重 + 跨平台热度 - 低信号惩罚”计算每条新闻的 `HotScore`。

### Top5 逻辑

Top5 面向”昨天抓取到的全部新闻”，不是某个单独分类。

一句话版：

系统会对昨天全部新闻按 `HotScore` 从高到低排序，去重后取前 5 条，生成热门榜单 Top5。

### Debug 端点

`GET /api/daily-brief/debug` 提供每个源的详细抓取统计：

- `fetchedCount`: 该源成功抓取的条数
- `yesterdayCount`: 昨天发布的条数
- `todayCount`: 今天发布的条数
- `strictRankedCount`: 通过严格筛选的条数
- `selectedCount`: 最终入选候选池的条数
- `finalCount`: 最终输出到前端的条数

## 七、前端当前页面结构

### 1. Landing Page

- 品牌名 `ViviDaily`
- 顶部导航
- 核心文案
- `Get Started` 按钮

### 2. Loading State

- 语义与“抓取昨天的 AI 热点”一致
- 展示 RSS 拉取、过滤、摘要生成、榜单整理等步骤感知

### 3. Feed Page

- 顶部搜索框
- 左侧分类栏
- 中部新闻流
- 右侧 Top5 与 AI Summary

### 4. Favorites

- 收藏内容独立视图
- 支持取消收藏

## 八、当前已完成

- [✅] 前端主线恢复到 `frontend/`
- [✅] 修复前端运行配置损坏问题
- [✅] 修复一轮明显乱码与错误文案
- [✅] Landing Page -> Loading -> Feed Page 交互链路打通
- [✅] 分类筛选逻辑与当前字段对齐
- [✅] 顶部搜索支持标题、摘要、来源、分类、主题标签检索
- [✅] 新闻卡片字段展示对齐到 `Title / Source / Category / Topics / HotScore / Summary / PublishAt`
- [✅] Top5 标签与 HotScore 放到新闻标题下方
- [✅] 收藏、分享、导入 Notion 的前端交互已具备演示逻辑
- [✅] 新闻流、Top5、AI Summary 已统一走同一套前端数据入口
- [✅] 前端已切换为只读取真实新闻 API，失败时直接显示错误提示，不再降级到本地 mock 数据
- [✅] 后端已新增 `daily-brief` API，能够返回昨天新闻、Top5 和 AI Summary
- [✅] 登录门禁：未登录点击收藏/导入 Notion 弹出登录窗，登录后才可操作
- [✅] 首次导入 Notion 引导：未连接/未配置数据库时自动弹出连接引导弹窗
- [✅] Notion 授权回跳体验：OAuth 成功后回到 Feed，并自动重开 Notion 引导弹窗
- [✅] Notion Database ID 兼容：支持粘贴完整 Notion 数据库 URL，后端自动提取正确 ID
- [✅] 退出登录交互优化：退出后保持当前页面并弹出登录框，可直接切换账号
- [✅] 部署模板补齐：新增 `frontend/vercel.json`、`frontend/.env.production.example`、`backend/.env.production.example`
- [✅] 补充 Vercel 上线认证说明：新增 Supabase Auth（Site URL/Redirect URLs）与 Notion OAuth 回调一致性检查项
- [✅] 请求超时优化：后端 AI 请求 8s 超时，前端 API 请求 18s 超时，避免长时间阻塞
- [✅] 已完成基础线上部署链路：前端 Vercel、后端 Render 可运行
- [✅] RSS 源扩展至 22 个：新增国际源（OpenAI, DeepMind, Google AI, Hugging Face, Berkeley BAIR, MIT Tech Review, TechCrunch AI, VentureBeat AI, Ars Technica AI, Hacker News AI）
- [✅] 新增中文源：钛媒体、少数派、IT之家、爱范儿
- [✅] 源分层系统：P0/P1/P2 三级优先级，支持 status 字段管理源状态
- [✅] Debug 端点：`/api/daily-brief/debug` 提供每个源的抓取统计，便于排查问题
- [✅] HotScore 优化：实体别名映射（GPT-4→OpenAI, Claude→Anthropic 等）、标题党检测、跨平台热度加分
- [✅] 去重优化：基于 clusterKey + overlapScore 的相似度去重，减少重复新闻

## 九、当前未完成

- [ ] 继续优化真实接口的分类、主题标签、摘要与热度计算质量
- [✅] 接入真实 Notion 导出能力（后端 `POST /api/notion/export` + 前端导出按钮真实调用）
- [ ] 清理剩余历史目录与过期文档
- [ ] 评估面向其他用户开放时需要的部署、环境变量、鉴权与回调配置
- [ ] 继续优化线上稳定性，包括 RSS 超时、链接提取、抓取数量与日志监控

## 十、下一步建议执行顺序

1. 先把后端输出整理为可供前端读取的稳定数据接口
2. 再让前端改为真实读取昨天新闻
3. 接着接入真实 Notion 导出
4. 最后处理部署与多人使用配置

## 十一、后续任务清单

### 第一阶段：把真实新闻链路做稳

- [ ] 优化真实新闻接口的数据质量，包括 `Category`、`Topics`、`Summary` 与 `HotScore`
- [ ] 强化重复新闻识别，减少“同一新闻不同标题改写”的转载内容混入结果
- [ ] 优化热点筛选规则，让真正高价值新闻更稳定进入前列
- [ ] 评估并决定摘要是否升级为 AI 精修版本
- [✅] 固定前后端端口：前端固定 `3000`（占用即报错不跳端口），后端固定 `3102`
- [✅] 前端同日缓存：同一天内再次点击 `Get Started` 直接读取缓存，不重复抓取

### 第二阶段：把产品动作做真

- [✅] 接入真实 Notion 导出能力（依赖 `NOTION_API_KEY` 与 `NOTION_DATABASE_ID`）
- [✅] 严格对齐 Notion 当前字段：`Title / URL / Source / Category / Topics / HotScore / Summary / PublishAt`
- [✅] 完善导出成功、失败的前端反馈（后端返回可读错误信息，前端直接展示）
- [✅] 补充重复导入的明确提示（后端查重后返回“已导入（重复跳过）”）
- [✅] 明确导出模式：导入模式定为 `shared + user_oauth` 双轨（见 `docs/notion-export-mode.md`）
- [✅] 登录/注册与登录门禁已打通，未登录时收藏与导入 Notion 会触发登录弹窗
- [✅] Notion OAuth 用户连接状态已支持落到 Supabase 持久化表中

### 当前执行优先级（产品优先）

1. 先完成产品功能闭环（真实导出、错误反馈、部署可用）
2. 再回到第一阶段继续做数据质量优化

### 第三阶段：为对外开放做准备

- [ ] 清理旧目录与剩余过期文档，彻底统一项目主线
- [✅] 整理前后端环境变量与启动说明（见 `docs/deployment-env.md`）
- [✅] 评估正式部署方式、API 域名、跨域配置与 HTTPS（见 `docs/deploy-vercel.md`）
- [✅] 评估用户级授权方案（Notion OAuth）并完成后端接口接入
- [✅] 补齐前端 Vercel 与后端 Render 的最终生产环境验收清单
- [✅] 补充基础日志、健康检查与部署监控文档（见 `docs/ops-monitoring.md`）

## 十二、下一轮直接执行清单（按顺序）

1. **修复失效 RSS 源**：机器之心、新智元、36Kr 请求失败，需寻找替代方案或自建 RSSHub
2. **优化中文源覆盖率**：当前中文源昨天发布量低（部分源 0 条），需验证是否为周日发布规律或 RSS 更新问题
3. **放宽 AI 相关性检测**：爱范儿等泛科技源有内容但被过滤，考虑降低 `hasModerateAICue` 门槛
4. **扩大日期范围**：当前只取昨天，周末发布量低时可考虑取最近 2 天
5. 继续排查与优化 RSS 原文链接提取，减少跳到 XML 页的情况
6. 做一轮线上验收：注册/登录、抓取昨日新闻、连接 Notion、导入 Notion、重复导入提示
7. 清理旧目录与过期文档，降低后续协作误改风险

## 十三、Vercel 上线后认证与配置必须修改项

### 前端（Vercel Project Environment Variables）

- `VITE_API_BASE_URL=https://<你的后端域名>`
- `VITE_SUPABASE_URL=<你的 Supabase URL>`
- `VITE_SUPABASE_ANON_KEY=<你的 Supabase anon key>`

### 后端（Render/Railway Environment Variables）

- `CORS_ALLOW_ORIGIN=https://<你的前端域名>`
- `FRONTEND_URL=https://<你的前端域名>`
- `NOTION_EXPORT_MODE=user_oauth`
- `NOTION_CLIENT_ID=<Notion Public Integration Client ID>`
- `NOTION_CLIENT_SECRET=<Notion Public Integration Client Secret>`
- `NOTION_REDIRECT_URI=https://<你的后端域名>/api/notion/oauth/callback`
- `SUPABASE_URL=<你的 Supabase URL>`
- `SUPABASE_ANON_KEY=<你的 Supabase anon key>`

### 第三方控制台同步修改（非常关键）

- Notion Integration 后台的 Redirect URI 必须与 `NOTION_REDIRECT_URI` 完全一致。
- Supabase Auth URL 配置里补齐线上站点地址与回调地址（Site URL / Redirect URLs）。
- 若已泄露过旧密钥（如 Notion Client Secret），上线前先 Rotate 再部署。
