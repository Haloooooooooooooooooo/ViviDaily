import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { buildDailyBrief, buildDailyBriefDebug } from './daily-brief';
import { exportNewsToNotion, isValidExportPayload } from './notion-export';
import { isSupabaseAdminReady, isSupabaseReady, signUp, signIn, getUser, signOut } from '../lib/supabase';
import {
  buildOAuthStartUrl,
  disconnectUserNotion,
  getNotionExportMode,
  getUserNotionConnection,
  handleOAuthCallback,
  normalizeNotionDatabaseId,
  setUserNotionDatabase,
} from './notion-oauth';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const PORT = Number(process.env.API_PORT || 3102);
const CORS_ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN || '*';
const serverStartedAt = new Date().toISOString();

function resolveAllowOrigin(requestOrigin?: string): string {
  if (CORS_ALLOW_ORIGIN === '*') return '*';
  const allowList = CORS_ALLOW_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean);
  if (requestOrigin && allowList.includes(requestOrigin)) return requestOrigin;
  return allowList[0] || 'http://127.0.0.1:3000';
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const requestOrigin = res.req?.headers.origin;
  const allowOrigin = resolveAllowOrigin(requestOrigin);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    Vary: 'Origin',
  });
  res.end(JSON.stringify(body));
}

function redirectTo(res: http.ServerResponse, target: string) {
  res.writeHead(302, { Location: target });
  res.end();
}

function parseJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('error', reject);
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function getAuthedUser(req: http.IncomingMessage) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false as const, error: '未登录' };
  }

  const token = authHeader.slice(7);
  const result = await getUser(token);
  if (!result.ok || !result.user) {
    return { ok: false as const, error: result.error || '登录态无效' };
  }

  return { ok: true as const, token, user: result.user };
}

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const pathname = req.url ? new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname : '/';
    console.log(`[api] ${req.method || 'GET'} ${pathname} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });

  if (!req.url) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'vividaily-api',
      startedAt: serverStartedAt,
      now: new Date().toISOString(),
      notionExportMode: getNotionExportMode(),
      supabaseReady: isSupabaseReady(),
      supabaseAdminReady: isSupabaseAdminReady(),
    });
    return;
  }

  if (pathname === '/api/daily-brief' && req.method === 'GET') {
    try {
      const data = await buildDailyBrief();
      sendJson(res, 200, data);
    } catch (error) {
      console.error('[api] daily brief failed', error);
      sendJson(res, 500, { error: 'Failed to build daily brief' });
    }
    return;
  }

  if (pathname === '/api/daily-brief/debug' && req.method === 'GET') {
    try {
      const data = await buildDailyBriefDebug();
      sendJson(res, 200, data);
    } catch (error) {
      console.error('[api] daily brief debug failed', error);
      sendJson(res, 500, { error: 'Failed to build daily brief debug payload' });
    }
    return;
  }

  if (pathname === '/api/notion/export' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      if (!isValidExportPayload(payload)) {
        sendJson(res, 400, { ok: false, message: 'Invalid request payload' });
        return;
      }

      const mode = getNotionExportMode();
      if (mode === 'user_oauth') {
        const authed = await getAuthedUser(req);
        if (!authed.ok) {
          sendJson(res, 401, { ok: false, message: authed.error });
          return;
        }

        const connection = await getUserNotionConnection(authed.user.id);
        if (!connection) {
          sendJson(res, 400, { ok: false, message: '你还没有连接 Notion，请先授权。' });
          return;
        }
        if (!connection.databaseId) {
          sendJson(res, 400, { ok: false, message: '请先设置 Notion Database ID。' });
          return;
        }

        const result = await exportNewsToNotion(payload.item, {
          apiKey: connection.accessToken,
          databaseId: connection.databaseId,
        });
        sendJson(res, result.ok ? 200 : 400, result);
        return;
      }

      const result = await exportNewsToNotion(payload.item);
      sendJson(res, result.ok ? 200 : 400, result);
    } catch (error) {
      console.error('[api] notion export failed', error);
      const msg = error instanceof Error ? error.message : 'Failed to export to Notion';
      sendJson(res, 500, { ok: false, message: msg });
    }
    return;
  }

  if (pathname === '/api/notion/oauth/start' && req.method === 'GET') {
    try {
      const authed = await getAuthedUser(req);
      if (!authed.ok) {
        sendJson(res, 401, { ok: false, error: authed.error });
        return;
      }

      const authUrl = buildOAuthStartUrl(authed.user.id);
      sendJson(res, 200, { ok: true, authUrl });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Notion OAuth start failed';
      sendJson(res, 500, { ok: false, error: msg });
    }
    return;
  }

  // Dev-only helper: inspect generated Notion OAuth URL and key config values.
  if (pathname === '/api/notion/oauth/debug' && req.method === 'GET') {
    if (process.env.NODE_ENV === 'production') {
      sendJson(res, 404, { ok: false, error: 'Not found' });
      return;
    }

    try {
      const authUrl = buildOAuthStartUrl('debug-user');
      sendJson(res, 200, {
        ok: true,
        mode: getNotionExportMode(),
        notionClientId: process.env.NOTION_CLIENT_ID || '',
        notionRedirectUri: process.env.NOTION_REDIRECT_URI || '',
        frontendUrl: process.env.FRONTEND_URL || '',
        authUrl,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Notion OAuth debug failed';
      sendJson(res, 500, { ok: false, error: msg });
    }
    return;
  }

  if (pathname === '/api/notion/oauth/callback' && req.method === 'GET') {
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    if (!code || !state) {
      redirectTo(res, `${process.env.FRONTEND_URL || 'http://127.0.0.1:3000'}/?notion_oauth=invalid_callback`);
      return;
    }

    try {
      const target = await handleOAuthCallback(code, state);
      redirectTo(res, target);
    } catch {
      redirectTo(res, `${process.env.FRONTEND_URL || 'http://127.0.0.1:3000'}/?notion_oauth=failed`);
    }
    return;
  }

  if (pathname === '/api/notion/oauth/status' && req.method === 'GET') {
    const authed = await getAuthedUser(req);
    if (!authed.ok) {
      sendJson(res, 401, { ok: false, error: authed.error });
      return;
    }

    const connection = await getUserNotionConnection(authed.user.id);
    sendJson(res, 200, {
      ok: true,
      mode: getNotionExportMode(),
      connected: Boolean(connection),
      workspaceName: connection?.workspaceName || null,
      workspaceId: connection?.workspaceId || null,
      databaseId: connection?.databaseId || null,
    });
    return;
  }

  if (pathname === '/api/notion/oauth/database' && req.method === 'POST') {
    const authed = await getAuthedUser(req);
    if (!authed.ok) {
      sendJson(res, 401, { ok: false, error: authed.error });
      return;
    }

    const payload = (await parseJsonBody(req)) as { databaseId?: string };
    if (!payload.databaseId || !payload.databaseId.trim()) {
      sendJson(res, 400, { ok: false, error: 'databaseId 不能为空' });
      return;
    }

    const normalizedDatabaseId = normalizeNotionDatabaseId(payload.databaseId);
    if (!normalizedDatabaseId) {
      sendJson(res, 400, { ok: false, error: '请输入正确的 Notion 数据库 URL 或 Database ID' });
      return;
    }

    const updated = await setUserNotionDatabase(authed.user.id, normalizedDatabaseId);
    if (!updated) {
      sendJson(res, 400, { ok: false, error: '请先连接 Notion，再设置数据库。' });
      return;
    }

    sendJson(res, 200, { ok: true, databaseId: updated.databaseId });
    return;
  }

  if (pathname === '/api/notion/oauth/disconnect' && req.method === 'DELETE') {
    const authed = await getAuthedUser(req);
    if (!authed.ok) {
      sendJson(res, 401, { ok: false, error: authed.error });
      return;
    }

    await disconnectUserNotion(authed.user.id);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    try {
      const payload = (await parseJsonBody(req)) as { email?: string; password?: string };
      if (!payload.email || !payload.password) {
        sendJson(res, 400, { ok: false, error: '邮箱和密码不能为空' });
        return;
      }

      const result = await signUp(payload.email, payload.password);
      sendJson(res, result.ok ? 200 : 400, result);
    } catch (error) {
      console.error('[api] register failed', error);
      const msg = error instanceof Error ? error.message : '注册失败';
      sendJson(res, 500, { ok: false, error: msg });
    }
    return;
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const payload = (await parseJsonBody(req)) as { email?: string; password?: string };
      if (!payload.email || !payload.password) {
        sendJson(res, 400, { ok: false, error: '邮箱和密码不能为空' });
        return;
      }

      const result = await signIn(payload.email, payload.password);
      sendJson(res, result.ok ? 200 : 400, result);
    } catch (error) {
      console.error('[api] login failed', error);
      const msg = error instanceof Error ? error.message : '登录失败';
      sendJson(res, 500, { ok: false, error: msg });
    }
    return;
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    try {
      const authed = await getAuthedUser(req);
      if (!authed.ok) {
        sendJson(res, 401, { ok: false, error: authed.error });
        return;
      }
      sendJson(res, 200, { ok: true, user: authed.user });
    } catch (error) {
      console.error('[api] get user failed', error);
      sendJson(res, 500, { ok: false, error: '获取用户失败' });
    }
    return;
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    try {
      const authed = await getAuthedUser(req);
      if (!authed.ok) {
        sendJson(res, 401, { ok: false, error: authed.error });
        return;
      }
      const result = await signOut(authed.token);
      sendJson(res, result.ok ? 200 : 400, result);
    } catch (error) {
      console.error('[api] logout failed', error);
      sendJson(res, 500, { ok: false, error: '退出失败' });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[api] ViviDaily API listening on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
    console.error(`[api] Port ${PORT} is already in use. Please free it or set API_PORT in .env.`);
    process.exit(1);
  }

  console.error('[api] Server failed to start:', error);
  process.exit(1);
});
