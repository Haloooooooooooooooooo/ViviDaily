import crypto from 'crypto';

interface NotionOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  frontendUrl: string;
}

export interface UserNotionConnection {
  userId: string;
  accessToken: string;
  workspaceId: string;
  workspaceName: string;
  databaseId?: string;
  connectedAt: string;
}

const OAUTH_STATE_CACHE = new Map<string, { userId: string; createdAt: number }>();
const USER_NOTION_CONNECTIONS = new Map<string, UserNotionConnection>();
const OAUTH_STATE_TTL_MS = 1000 * 60 * 10;

function getConfig(): NotionOAuthConfig {
  return {
    clientId: process.env.NOTION_CLIENT_ID || '',
    clientSecret: process.env.NOTION_CLIENT_SECRET || '',
    redirectUri: process.env.NOTION_REDIRECT_URI || '',
    frontendUrl: process.env.FRONTEND_URL || 'http://127.0.0.1:3000',
  };
}

function cleanupExpiredStates() {
  const now = Date.now();
  for (const [key, value] of OAUTH_STATE_CACHE.entries()) {
    if (now - value.createdAt > OAUTH_STATE_TTL_MS) {
      OAUTH_STATE_CACHE.delete(key);
    }
  }
}

function ensureOAuthConfig(config: NotionOAuthConfig) {
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error('Notion OAuth 未配置完成，请设置 NOTION_CLIENT_ID / NOTION_CLIENT_SECRET / NOTION_REDIRECT_URI。');
  }
}

export function getNotionExportMode(): 'shared' | 'user_oauth' {
  return process.env.NOTION_EXPORT_MODE === 'user_oauth' ? 'user_oauth' : 'shared';
}

export function buildOAuthStartUrl(userId: string): string {
  const config = getConfig();
  ensureOAuthConfig(config);

  cleanupExpiredStates();
  const state = crypto.randomUUID();
  OAUTH_STATE_CACHE.set(state, { userId, createdAt: Date.now() });

  const authorizeUrl = new URL('https://api.notion.com/v1/oauth/authorize');
  authorizeUrl.searchParams.set('owner', 'user');
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('state', state);
  return authorizeUrl.toString();
}

export async function handleOAuthCallback(code: string, state: string): Promise<string> {
  const config = getConfig();
  ensureOAuthConfig(config);
  cleanupExpiredStates();

  const stateRecord = OAUTH_STATE_CACHE.get(state);
  if (!stateRecord) {
    return `${config.frontendUrl}/?notion_oauth=invalid_state`;
  }

  OAUTH_STATE_CACHE.delete(state);

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    return `${config.frontendUrl}/?notion_oauth=failed`;
  }

  const data = (await response.json()) as {
    access_token?: string;
    workspace_id?: string;
    workspace_name?: string;
  };

  if (!data.access_token || !data.workspace_id) {
    return `${config.frontendUrl}/?notion_oauth=failed`;
  }

  USER_NOTION_CONNECTIONS.set(stateRecord.userId, {
    userId: stateRecord.userId,
    accessToken: data.access_token,
    workspaceId: data.workspace_id,
    workspaceName: data.workspace_name || 'Notion Workspace',
    connectedAt: new Date().toISOString(),
  });

  return `${config.frontendUrl}/?notion_oauth=success`;
}

export function getUserNotionConnection(userId: string): UserNotionConnection | null {
  return USER_NOTION_CONNECTIONS.get(userId) || null;
}

export function setUserNotionDatabase(userId: string, databaseId: string): UserNotionConnection | null {
  const connection = USER_NOTION_CONNECTIONS.get(userId);
  if (!connection) return null;

  USER_NOTION_CONNECTIONS.set(userId, {
    ...connection,
    databaseId: databaseId.trim(),
  });
  return USER_NOTION_CONNECTIONS.get(userId) || null;
}

export function disconnectUserNotion(userId: string): void {
  USER_NOTION_CONNECTIONS.delete(userId);
}
