import type { NewsItem } from '../types/news';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3102';

interface ExportResponse {
  ok: boolean;
  message: string;
  duplicate?: boolean;
}

export interface NotionOAuthStatusResponse {
  ok: boolean;
  mode?: 'shared' | 'user_oauth';
  connected?: boolean;
  workspaceName?: string | null;
  workspaceId?: string | null;
  databaseId?: string | null;
  error?: string;
}

export async function exportNewsToNotion(item: NewsItem, token?: string): Promise<ExportResponse> {
  const response = await fetch(`${API_BASE_URL}/api/notion/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ item }),
  });

  const data = (await response.json()) as ExportResponse;

  if (!response.ok) {
    return {
      ok: false,
      message: data?.message || 'Notion export failed',
    };
  }

  return data;
}

export async function getNotionOAuthStatus(token: string): Promise<NotionOAuthStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/notion/oauth/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json()) as NotionOAuthStatusResponse;
  return data;
}

export async function startNotionOAuth(token: string): Promise<{ ok: boolean; authUrl?: string; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/notion/oauth/start`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

export async function setNotionOAuthDatabase(
  token: string,
  databaseId: string,
): Promise<{ ok: boolean; databaseId?: string; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/notion/oauth/database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ databaseId }),
  });
  return response.json();
}
