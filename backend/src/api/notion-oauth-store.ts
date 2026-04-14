import { isSupabaseAdminReady, supabaseAdmin } from '../lib/supabase';
import type { UserNotionConnection } from './notion-oauth';

const NOTION_OAUTH_TABLE = process.env.NOTION_OAUTH_TABLE || 'user_notion_connections';

type NotionConnectionRow = {
  user_id: string;
  access_token: string;
  workspace_id: string;
  workspace_name: string;
  database_id: string | null;
  connected_at: string;
  updated_at: string;
};

const MEMORY_CONNECTIONS = new Map<string, UserNotionConnection>();

function toConnection(row: NotionConnectionRow): UserNotionConnection {
  return {
    userId: row.user_id,
    accessToken: row.access_token,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    databaseId: row.database_id || undefined,
    connectedAt: row.connected_at,
  };
}

function toRow(connection: UserNotionConnection): NotionConnectionRow {
  const now = new Date().toISOString();
  return {
    user_id: connection.userId,
    access_token: connection.accessToken,
    workspace_id: connection.workspaceId,
    workspace_name: connection.workspaceName,
    database_id: connection.databaseId || null,
    connected_at: connection.connectedAt,
    updated_at: now,
  };
}

export async function getStoredNotionConnection(userId: string): Promise<UserNotionConnection | null> {
  if (!isSupabaseAdminReady()) {
    return MEMORY_CONNECTIONS.get(userId) || null;
  }

  const { data, error } = await supabaseAdmin
    .from(NOTION_OAUTH_TABLE)
    .select('user_id, access_token, workspace_id, workspace_name, database_id, connected_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle<NotionConnectionRow>();

  if (error) {
    console.error('[notion-oauth-store] read failed', error);
    return MEMORY_CONNECTIONS.get(userId) || null;
  }

  if (!data) {
    return MEMORY_CONNECTIONS.get(userId) || null;
  }

  const connection = toConnection(data);
  MEMORY_CONNECTIONS.set(userId, connection);
  return connection;
}

export async function saveNotionConnection(connection: UserNotionConnection): Promise<UserNotionConnection> {
  MEMORY_CONNECTIONS.set(connection.userId, connection);

  if (!isSupabaseAdminReady()) {
    return connection;
  }

  const row = toRow(connection);
  const { error } = await supabaseAdmin.from(NOTION_OAUTH_TABLE).upsert(row, { onConflict: 'user_id' });

  if (error) {
    console.error('[notion-oauth-store] upsert failed', error);
  }

  return connection;
}

export async function saveNotionDatabaseId(userId: string, databaseId: string): Promise<UserNotionConnection | null> {
  const existing = await getStoredNotionConnection(userId);
  if (!existing) return null;

  const updated: UserNotionConnection = {
    ...existing,
    databaseId,
  };

  await saveNotionConnection(updated);
  return updated;
}

export async function removeNotionConnection(userId: string): Promise<void> {
  MEMORY_CONNECTIONS.delete(userId);

  if (!isSupabaseAdminReady()) {
    return;
  }

  const { error } = await supabaseAdmin.from(NOTION_OAUTH_TABLE).delete().eq('user_id', userId);
  if (error) {
    console.error('[notion-oauth-store] delete failed', error);
  }
}
