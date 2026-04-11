// 虎嗅 RSS 爬取
// RSS地址: https://rss.huxiu.com

import Parser from 'rss-parser';
import { RawNewsItem, AI_KEYWORDS, EXCLUDE_KEYWORDS, SourceType } from '../types';

const parser = new Parser();

export async function fetchHuxiu(limit: number = 3): Promise<RawNewsItem[]> {
  console.log('[虎嗅] 开始获取今日AI热门...');

  try {
    const feed = await parser.parseURL('https://rss.huxiu.com');

    const today = new Date();

    const aiItems = feed.items
      .filter(item => {
        const title = (item.title || '').toLowerCase();
        const content = (item.contentSnippet || item.content || '').toLowerCase();

        // 1. 先检查排除关键词（标题和内容都要检查）
        if (EXCLUDE_KEYWORDS.some(k => title.includes(k.toLowerCase()) || content.includes(k.toLowerCase()))) {
          return false;
        }

        // 2. AI关键词过滤 - 只在标题中匹配，更严格
        const isAI = AI_KEYWORDS.some(k => title.includes(k.toLowerCase()));
        if (!isAI) return false;

        // 3. 当天或昨天过滤
        const pubDate = new Date(item.pubDate || '');
        const daysDiff = Math.abs(today.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 1.5;
      })
      .slice(0, limit);

    const result: RawNewsItem[] = aiItems.map(item => ({
      title: item.title || '未知标题',
      source: '虎嗅' as SourceType,
      url: item.link || '',
      publishedAt: item.pubDate || new Date().toISOString(),
      content: item.contentSnippet || item.content,
    }));

    console.log(`[虎嗅] 获取到 ${result.length} 条AI热门`);
    return result;
  } catch (error) {
    console.error('[虎嗅] 获取失败:', error);
    return [];
  }
}