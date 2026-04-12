import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { buildDailyBrief } from './daily-brief';
import { exportNewsToNotion, isValidExportPayload } from './notion-export';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = Number(process.env.API_PORT || 3102);
const CORS_ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN || '*';

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
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  });
  res.end(JSON.stringify(body));
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

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.url === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.url === '/api/daily-brief' && req.method === 'GET') {
    try {
      const data = await buildDailyBrief();
      sendJson(res, 200, data);
    } catch (error) {
      console.error('[api] daily brief failed', error);
      sendJson(res, 500, { error: 'Failed to build daily brief' });
    }
    return;
  }

  if (req.url === '/api/notion/export' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      if (!isValidExportPayload(payload)) {
        sendJson(res, 400, { ok: false, message: 'Invalid request payload' });
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
