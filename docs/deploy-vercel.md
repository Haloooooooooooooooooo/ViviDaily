# ViviDaily 对外部署（Vercel 实操）

## 部署目标

1. 前端：Vercel 托管  
2. 后端：可公网访问（先独立部署，后续可迁到 Vercel Functions）  
3. 全链路：HTTPS + CORS 白名单 + 可导出 Notion

---

## 一、前置准备

1. 代码已推送 GitHub 主仓库  
2. 已有域名（可选）  
3. Notion 与 Supabase 配置已准备

---

## 二、部署前端到 Vercel

1. 登录 Vercel -> `Add New Project`  
2. 选择仓库 `ViviDaily`  
3. `Root Directory` 设为 `frontend`  
4. 构建配置：
- Build Command: `npm run build`
- Output Directory: `dist`
5. 配置环境变量：
- `VITE_API_BASE_URL=https://<你的后端域名>`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`
6. 点击 Deploy

建议：可直接参考 `frontend/.env.production.example` 配置 Vercel 环境变量。

---

## 三、部署后端（推荐独立服务）

建议先用 Render / Railway / Fly 任一平台部署 `backend`，确保稳定。

后端必要环境变量：

```env
API_PORT=3102
CORS_ALLOW_ORIGIN=https://<你的前端域名>

SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

NOTION_EXPORT_MODE=user_oauth
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=https://<你的后端域名>/api/notion/oauth/callback
FRONTEND_URL=https://<你的前端域名>
NOTION_OAUTH_TABLE=user_notion_connections

# 仍可保留 shared 模式备用
NOTION_API_KEY=...
NOTION_DATABASE_ID=...
```

建议：可直接参考 `backend/.env.production.example` 逐项填写生产环境变量。

---

## 四、域名与 HTTPS

1. 前端域名接入 Vercel（Project -> Domains）  
2. 后端绑定自己的 API 域名（如 `api.vividaily.xxx`）  
3. 确保两端都启用 HTTPS  
4. 将后端 `CORS_ALLOW_ORIGIN` 限定为前端正式域名

---

## 五、上线验收清单

1. 首页可访问，`Get Started` 正常  
2. 昨日新闻、搜索、分类、Top5 正常  
3. 未登录点收藏/导入会弹登录  
4. 登录后可收藏  
5. 连接 Notion 后可导入自己数据库  
6. 重复导入显示“已导入（重复跳过）”  
7. 错误提示可读（非乱码）
8. `GET /health` 返回 `ok: true`，且 `supabaseReady`、`supabaseAdminReady` 符合预期

---

## 六、常见问题

1. 前端能开但无数据：
- 检查 `VITE_API_BASE_URL` 是否正确

2. 跨域报错：
- 检查 `CORS_ALLOW_ORIGIN` 是否匹配前端域名

3. OAuth 回调失败：
- 检查 `NOTION_REDIRECT_URI` 与 Notion 后台配置是否一致

4. Notion 导出失败：
- 检查数据库字段是否严格匹配最终版字段类型

5. 登录成功但刷新后状态异常 / 授权回调异常：
- 到 Supabase 控制台检查 Auth 配置
- `Site URL` 设置为前端线上地址（如 `https://xxx.vercel.app`）
- `Redirect URLs` 添加：
  - `https://xxx.vercel.app`
  - `https://xxx.vercel.app/*`
- 确认前端环境变量 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY` 使用的是同一个项目
