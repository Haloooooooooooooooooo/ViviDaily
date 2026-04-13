# ViviDaily PRD 进度

> 最后更新：2026-04-13（请求超时优化 + Notion OAuth 体验修正 + 部署前配置清单补充）

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

当前确认保留和重点使用的信息源：

- 量子位
- 机器之心
- 新智元
- RadarAI
- 雷锋网 AI
- IT 之家
- 极客公园
- 爱范儿
- 36Kr
- InfoQ
- cnBeta
- OpenAI News

说明：

- 外源暂不保留为主线信息源
- 重点抓取大公司、大模型与高热事件相关内容
- 对 Google、OpenAI、Claude、GLM 等重要名词提高关注权重

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

- 是否命中重点 AI 关键词
- 是否命中重点公司 / 模型名词
- 是否命中“发布、开源、融资、上线、升级”等热点事件词
- 来源权重是否更高
- 是否存在低信号词、汇总词、非热点特征
- 是否与当天多条内容围绕同一热点事件聚集

一句话版：

系统会根据“关键词强度 + 重点实体 + 热点事件 + 来源权重 - 低信号惩罚”计算每条新闻的 `HotScore`。

### Top5 逻辑

Top5 面向“昨天抓取到的全部新闻”，不是某个单独分类。

一句话版：

系统会对昨天全部新闻按 `HotScore` 从高到低排序，去重后取前 5 条，生成热门榜单 Top5。

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
- [✅] 前端已优先读取真实新闻 API，失败时自动降级到本地演示数据
- [✅] 后端已新增 `daily-brief` API，能够返回昨天新闻、Top5 和 AI Summary
- [✅] 登录门禁：未登录点击收藏/导入 Notion 弹出登录窗，登录后才可操作
- [✅] 同日缓存：当日第一次点击 `Get Started` 后缓存结果，当天再次进入不重复抓取
- [✅] 首次导入 Notion 引导：未连接/未配置数据库时自动弹出连接引导弹窗
- [✅] Notion 授权回跳体验：OAuth 成功后回到 Feed，并自动重开 Notion 引导弹窗
- [✅] Notion Database ID 兼容：支持粘贴完整 Notion 数据库 URL，后端自动提取正确 ID
- [✅] 退出登录交互优化：退出后保持当前页面并弹出登录框，可直接切换账号
- [✅] 部署模板补齐：新增 `frontend/vercel.json`、`frontend/.env.production.example`、`backend/.env.production.example`
- [✅] 补充 Vercel 上线认证说明：新增 Supabase Auth（Site URL/Redirect URLs）与 Notion OAuth 回调一致性检查项
- [✅] 请求超时优化：后端 AI 请求 8s 超时，前端 API 请求 18s 超时，避免长时间阻塞

## 九、当前未完成

- [ ] 继续优化真实接口的分类、主题标签、摘要与热度计算质量
- [✅] 接入真实 Notion 导出能力（后端 `POST /api/notion/export` + 前端导出按钮真实调用）
- [ ] 清理剩余历史目录与过期文档
- [ ] 评估面向其他用户开放时需要的部署、环境变量、鉴权与回调配置
- [ ] 完成线上实际发布（当前阻塞：本机 npm cache 权限 `EPERM`，Vercel CLI 无法稳定执行）

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

### 当前执行优先级（产品优先）

1. 先完成产品功能闭环（真实导出、错误反馈、部署可用）
2. 再回到第一阶段继续做数据质量优化

### 第三阶段：为对外开放做准备

- [ ] 清理旧目录与剩余过期文档，彻底统一项目主线
- [✅] 整理前后端环境变量与启动说明（见 `docs/deployment-env.md`）
- [✅] 评估正式部署方式、API 域名、跨域配置与 HTTPS（见 `docs/deploy-vercel.md`）
- [✅] 评估用户级授权方案（Notion OAuth）并完成后端接口接入
- [ ] 补充日志、错误监控与缓存策略

## 十二、明日直接执行清单（按顺序）

1. 完成前端部署到 Vercel（`frontend` 作为 Root Directory）。
2. 完成后端部署到 Render/Railway（当前后端是长驻服务，不直接走 Vercel Functions）。
3. 把前端环境变量 `VITE_API_BASE_URL` 改为线上后端 HTTPS 地址并重新部署前端。
4. 把后端 `CORS_ALLOW_ORIGIN` 改为前端正式域名（不要再用 `*`）。
5. 把 Notion OAuth 三件套改为线上值并验证回调：
   - `NOTION_CLIENT_ID`
   - `NOTION_CLIENT_SECRET`
   - `NOTION_REDIRECT_URI=https://<后端域名>/api/notion/oauth/callback`
6. 把 `FRONTEND_URL` 改为线上前端地址，确保 OAuth 回跳正确。
7. 线上验收：注册/登录、抓取昨日新闻、连接 Notion、导入 Notion、重复导入提示。
8. 清理旧目录 `ViviDaily-github` 与过期文档，减少后续协作误改风险。

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
