# ViviDaily 部署监控与运维检查

## 当前已落地

- 后端提供 `/health` 健康检查接口
- 健康检查会返回：
  - 服务名
  - 启动时间
  - 当前时间
  - Notion 导出模式
  - `supabaseReady`
  - `supabaseAdminReady`
- 后端为每个请求输出基础访问日志：方法、路径、状态码、耗时

## 建议的日常检查项

1. 检查前端是否能正常打开
- Vercel 页面是否返回 200

2. 检查后端健康状态
- `GET https://<your-backend-domain>/health`
- 重点看：
  - `ok`
  - `supabaseReady`
  - `supabaseAdminReady`
  - `notionExportMode`

3. 检查核心接口
- `GET /api/daily-brief`
- 看是否能在合理时间内返回新闻数据

4. 检查 Notion OAuth
- 登录后调用 `/api/notion/oauth/status`
- 确认连接状态与数据库 ID 正常

## 建议重点关注的异常

- RSS 源大量超时
- `/api/daily-brief` 返回新闻数过少
- Notion OAuth 回调失败
- Notion 导出 400/401/404 激增
- Supabase 配置缺失导致登录或 OAuth 状态异常

## 生产环境建议保留的变量

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTION_EXPORT_MODE`
- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`
- `NOTION_REDIRECT_URI`
- `FRONTEND_URL`
- `CORS_ALLOW_ORIGIN`
- `AI_API_KEY`

## 后续可继续补的监控

- 接入 Render / Vercel 平台告警
- 统计每日抓取成功率与平均返回条数
- 统计每个 RSS 源的失败率
- 统计 Notion 导出成功率
- 把关键错误上报到日志平台
