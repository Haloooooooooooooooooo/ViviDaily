import http from 'http';
import { buildDailyBrief } from './daily-brief';

const PORT = Number(process.env.PORT || 3102);

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
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

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[api] ViviDaily API listening on http://localhost:${PORT}`);
});
