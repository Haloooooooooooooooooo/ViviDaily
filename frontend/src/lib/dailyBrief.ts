import type { DailyBrief, NewsItem } from '../types/news';

const REQUEST_TIMEOUT_MS = 45000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3102';
const DAILY_BRIEF_CACHE_KEY = 'vividaily_daily_brief_cache_v1';

type DailyBriefCachePayload = {
  cachedOn: string;
  brief: DailyBrief & { date?: string; total?: number };
};

function formatShanghaiDate(offsetDays = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function getTodayInShanghai(): string {
  return formatShanghaiDate(0);
}

function getYesterdayInShanghai(): string {
  return formatShanghaiDate(-1);
}

export function getCachedDailyBrief(): DailyBrief | null {
  try {
    const raw = window.localStorage.getItem(DAILY_BRIEF_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DailyBriefCachePayload;
    if (!parsed?.brief?.news || !Array.isArray(parsed.brief.news)) return null;
    if (parsed.cachedOn !== getTodayInShanghai()) return null;
    if (parsed.brief.date && parsed.brief.date !== getYesterdayInShanghai()) return null;

    return parsed.brief;
  } catch {
    return null;
  }
}

function setCachedDailyBrief(brief: DailyBrief & { date?: string; total?: number }): void {
  try {
    const payload: DailyBriefCachePayload = {
      cachedOn: getTodayInShanghai(),
      brief,
    };
    window.localStorage.setItem(DAILY_BRIEF_CACHE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

export function clearCachedDailyBrief(): void {
  try {
    window.localStorage.removeItem(DAILY_BRIEF_CACHE_KEY);
  } catch {
    return;
  }
}

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

    setCachedDailyBrief(data);

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
