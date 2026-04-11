// MIT Technology Review AI RSS 爬取
// RSS: https://www.technologyreview.com/feed/

import Parser from 'rss-parser';
import { RawNewsItem, SourceType } from '../types';

const parser = new Parser();

export async function fetchMITTechReview(limit: number = 3): Promise<RawNewsItem[]> {
  console.log('[MIT Tech Review] 开始获取RSS内容...');

  try {
    const feed = await parser.parseURL('https://www.technologyreview.com/feed/');

    const today = new Date();
    const aiKeywords = ['AI', 'artificial intelligence', 'machine learning', 'GPT', 'LLM', 'neural'];

    const items = feed.items
      .filter(item => {
        const title = item.title?.toLowerCase() || '';
        const content = item.contentSnippet?.toLowerCase() || '';
        const text = title + ' ' + content;

        // 过滤AI相关
        const isAI = aiKeywords.some(k => text.includes(k.toLowerCase()));

        // 过滤当天或最近
        const pubDate = new Date(item.pubDate || '');
        const daysDiff = Math.abs(today.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
        const isRecent = daysDiff <= 2;

        return isAI && isRecent;
      })
      .slice(0, limit);

    const result: RawNewsItem[] = items.map(item => ({
      title: item.title || '未知标题',
      source: 'MIT Tech Review' as SourceType,
      url: item.link || '',
      publishedAt: item.pubDate || new Date().toISOString(),
      content: item.contentSnippet || item.content,
    }));

    console.log(`[MIT Tech Review] 获取到 ${result.length} 条新闻`);
    return result;
  } catch (error) {
    console.error('[MIT Tech Review] 获取失败:', error);
    return [];
  }
}