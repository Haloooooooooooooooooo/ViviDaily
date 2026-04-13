import type { DailyBrief, NewsItem } from '../types/news';

const REQUEST_TIMEOUT_MS = 18000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3102';

export async function fetchDailyBrief(): Promise<DailyBrief> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/daily-brief`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = (await response.json()) as DailyBrief;
    if (!data.news || !Array.isArray(data.news)) {
      throw new Error('Invalid daily brief payload');
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('抓取超时，请稍后重试');
    }
    throw new Error('抓取失败，请稍后重试');
  } finally {
    window.clearTimeout(timeout);
  }
}

export function sortNewsByHotScore(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.HotScore - a.HotScore);
}
