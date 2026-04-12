# ViviDaily 交接规范（给 ClaudeCode）

## 0. 目标

在不破坏当前可用链路的前提下，继续推进 ViviDaily 到“可公开访问 + 用户可导入自己 Notion”的状态。

---

## 1. 绝对红线（一定不能改）

1. 不能改“只抓取昨天新闻（yesterday-only）”的产品规则。
2. 不能改 Notion 最终字段与类型：
   - `Title` (title)
   - `URL` (url, 必填)
   - `Source` (select)
   - `Category` (select)
   - `Topics` (multi_select)
   - `HotScore` (number)
   - `Summary` (rich_text)
   - `PublishAt` (date)
3. 不能移除 Notion 导出保护逻辑：
   - 字段严格校验
   - 重复导入提示
   - 乱码拦截
4. 不能改端口策略为自动跳端口：
   - 前端固定 `3000`
   - 后端固定 `3102`
5. 不能在生产环境使用宽松 CORS（`*`），必须限定正式域名。
6. 不能让用户提交 Notion 密钥给管理员/AI代配（安全风险高）。
7. 禁止破坏性 git 操作（如 `git reset --hard`、强制回滚目录结构）。
8. 不能引入乱码数据回流（尤其 mock 数据与文案编码）。

---

## 2. 当前状态摘要（接手基线）

1. 前端可运行，后端可返回 yesterday 新闻流、Top5、summary。
2. Notion 导出 API 已接通：`POST /api/notion/export`。
3. Notion 导出已具备：
   - 严格字段校验
   - URL 必填校验
   - 重复导入跳过
   - 乱码拦截
4. 环境变量与部署基础文档已存在：
   - `docs/deployment-env.md`

---

## 3. 待办任务（按优先级）

### P0（先做）

1. 登录门禁：
   - 未登录点击“收藏” => 弹登录页/弹窗，不执行收藏。
   - 未登录点击“导入 Notion” => 弹登录页/弹窗，不执行导入。
   - 登录后再放开收藏与导入动作。

2. 用户级 Notion 导入（必须 OAuth 化）：
   - 不再使用“单一管理员 Notion 库”作为唯一导出模式。
   - 每个用户连接自己的 Notion（Public Integration + OAuth）。
   - 保存用户授权 token（加密存储，至少服务端环境加密）。

3. 首次导入引导（产品要求）：
   - 第一次点击导入时弹出引导：
     1) 为什么需要连接 Notion
     2) 一键去授权
     3) 授权后返回并选择数据库（或检查默认库）
   - 引导中禁止要求用户复制密钥给管理员/AI。

### P1（再做）

4. 部署上线（对外可用）：
   - 前端部署到 Vercel。
   - 后端需可公网稳定访问（Vercel Functions 或独立服务）。
   - 配置正式域名 + HTTPS + CORS 白名单。

5. 运维基础：
   - 健康检查、错误日志、基础监控。
   - 给出故障排查文档（API 连接失败、Notion 授权失败、CORS 错误等）。

---

## 4. 技术约束与实现建议

### 4.1 登录

1. 先做最小可用鉴权（例如邮箱验证码或第三方登录）。
2. 前端需要有显式 `isLoggedIn` 状态与用户信息状态。
3. “收藏/导入”按钮必须走统一权限守卫，避免绕过。

### 4.2 Notion OAuth（关键）

1. 使用 Notion Public Integration（不是 Internal Integration）。
2. 实现标准 OAuth Code Flow：
   - `/api/notion/oauth/start`
   - `/api/notion/oauth/callback`
   - 按用户存储 access token 与 workspace 信息
3. 导出时根据当前登录用户读取其 token。
4. 若用户未连接 Notion，返回前端特定状态码/错误码触发引导弹窗。

### 4.3 部署

1. 前端优先 Vercel。
2. 后端短期可独立部署（Render/Railway/Fly）；长期再统一为 Vercel Functions。
3. 生产必须：
   - HTTPS
   - CORS 白名单域名
   - 环境变量分环境管理（dev/preview/prod）

---

## 5. 验收标准（每次提交都要过）

1. 未登录状态：
   - 点击收藏 => 仅弹登录，不改收藏状态。
   - 点击导入 => 仅弹登录/引导，不发导入请求。

2. 登录且未连接 Notion：
   - 点击导入 => 弹“连接 Notion”流程。

3. 登录且已连接 Notion：
   - 点击导入 => 成功写入用户自己的 Notion 数据库。
   - 重复导入 => 返回“已导入（重复跳过）”。
   - 脏数据/乱码 => 被后端拦截并返回可读错误。

4. 生产部署后：
   - 前端页面可访问。
   - 后端 API 连通。
   - CORS 正常。
   - HTTPS 正常。

---

## 6. 提交规范

1. 每完成一个任务，更新 `docs/prd-progress.md` 对应勾选状态。
2. 每个 PR/提交必须包含：
   - 改动说明
   - 风险点
   - 验证结果（命令或手工步骤）
3. 若发现和本规范冲突，优先停下并说明，不要自行覆盖红线。

---

## 7. 一句话原则

先保住当前可用链路，再做登录门禁与用户级 Notion OAuth，最后上线到对外稳定可访问环境；整个过程中不允许牺牲安全边界和字段契约。
