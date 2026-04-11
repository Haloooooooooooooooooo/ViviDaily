// VentureBeat AI RSS 爬取
// RSS: https://venturebeat.com/category/ai/feed/

import Parser from 'rss-parser';
import { RawNewsItem, AI_KEYWORDS, SourceType } from '../types';

const parser = new Parser();

export async function fetchVentureBeat(limit: number = 3): Promise<RawNewsItem[]> {
  console.log('[VentureBeat AI] 开始获取RSS内容...');

  try {
    const feed = await parser.parseURL('https://venturebeat.com/category/ai/feed/');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const items = feed.items
      .filter(item => {
        // 过滤：只取当天或最近的内容
        const pubDate = new Date(item.pubDate || '');
        const daysDiff = Math.abs(today.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 1; // 当天或昨天
      })
      .slice(0, limit);

    const result: RawNewsItem[] = items.map(item => ({
      title: item.title || '未知标题',
      source: 'VentureBeat AI' as SourceType,
      url: item.link || '',
      publishedAt: item.pubDate || new Date().toISOString(),
      content: item.contentSnippet || item.content,
    }));

    console.log(`[VentureBeat AI] 获取到 ${result.length} 条新闻`);
    return result;
  } catch (error) {
    console.error('[VentureBeat AI] 获取失败:', error);
    return [];
  }
}