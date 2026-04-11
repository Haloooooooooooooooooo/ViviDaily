// Hacker News 数据爬取
// API文档: https://github.com/HackerNews/API

import { RawNewsItem, AI_KEYWORDS, SourceType } from '../types';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';

interface HNItem {
  id: number;
  title: string;
  url?: string;
  time: number;
  by: string;
  score: number;
}

// 判断是否为AI相关内容
function isAIRelated(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return AI_KEYWORDS.some(keyword =>
    lowerTitle.includes(keyword.toLowerCase())
  );
}

// 获取单个故事详情
async function getItem(id: number): Promise<HNItem | null> {
  try {
    const response = await fetch(`${HN_API_BASE}/item/${id}.json`);
    if (!response.ok) return null;
    const data = await response.json() as HNItem;
    return data;
  } catch {
    return null;
  }
}

// 并发获取多个故事
async function getItems(ids: number[], limit: number): Promise<HNItem[]> {
  const items = await Promise.all(
    ids.slice(0, limit).map(id => getItem(id))
  );
  return items.filter((item): item is HNItem =>
    item !== null &&
    item.url !== undefined && // 必须有外部链接
    isAIRelated(item.title) // 必须是AI相关
  );
}

// 主函数：爬取HN上的AI相关热门故事
export async function fetchHackerNews(limit: number = 15): Promise<RawNewsItem[]> {
  console.log('[Hacker News] 开始获取热门故事...');

  // 获取热门故事ID列表
  const topStoriesRes = await fetch(`${HN_API_BASE}/topstories.json`);
  const topStoriesIds: number[] = await topStoriesRes.json() as number[];

  // 获取详情（多取一些ID，因为需要过滤AI相关）
  const items = await getItems(topStoriesIds, 100);

  // 取前limit条
  const result = items.slice(0, limit).map(item => ({
    title: item.title,
    source: 'Hacker News' as SourceType,
    url: item.url!,
    publishedAt: new Date(item.time * 1000).toISOString(),
  }));

  console.log(`[Hacker News] 获取到 ${result.length} 条AI相关新闻`);
  return result;
}