import type { NewsItem } from '../types/news';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3102';

interface ExportResponse {
  ok: boolean;
  message: string;
  duplicate?: boolean;
}

export async function exportNewsToNotion(item: NewsItem): Promise<ExportResponse> {
  const response = await fetch(`${API_BASE_URL}/api/notion/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
