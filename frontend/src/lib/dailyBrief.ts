import { DAILY_BRIEF } from '../data/mockData';
import type { DailyBrief, NewsItem } from '../types/news';

const DELAY_MS = 2400;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3102';

export async function fetchDailyBrief(): Promise<DailyBrief> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/daily-brief`);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = (await response.json()) as DailyBrief;
    if (!data.news || !Array.isArray(data.news)) {
      throw new Error('Invalid daily brief payload');
    }

    return data;
  } catch (error) {
    console.warn('[dailyBrief] fallback to local mock data', error);
    await new Promise((resolve) => window.setTimeout(resolve, DELAY_MS));
    return DAILY_BRIEF;
  }
}

export function sortNewsByHotScore(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.HotScore - a.HotScore);
}
