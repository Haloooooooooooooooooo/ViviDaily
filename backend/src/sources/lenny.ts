// Lenny's Newsletter RSS 爬取
// RSS地址: https://www.lennysnewsletter.com/feed

import Parser from 'rss-parser';
import { RawNewsItem, AI_KEYWORDS, SourceType } from '../types';

const parser = new Parser();

// 判断是否为AI相关内容
function isAIRelated(title: string, content?: string): boolean {
  const text = `${title} ${content || ''}`.toLowerCase();
  return AI_KEYWORDS.some(keyword =>
    text.includes(keyword.toLowerCase())
  );
}

export async function fetchLennyNewsletter(limit: number = 3): Promise<RawNewsItem[]> {
  console.log('[Lenny\'s Newsletter] 开始获取RSS内容...');

  try {
    const feed = await parser.parseURL('https://www.lennysnewsletter.com/feed');

    const aiItems = feed.items
      .filter(item => isAIRelated(item.title || '', item.contentSnippet || item.content))
      .slice(0, limit);

    const result: RawNewsItem[] = aiItems.map(item => ({
      title: item.title || '未知标题',
      source: 'Lenny\'s Newsletter' as SourceType,
      url: item.link || '',
      publishedAt: item.pubDate || new Date().toISOString(),
      content: item.contentSnippet || item.content,
    }));

    console.log(`[Lenny's Newsletter] 获取到 ${result.length} 条AI相关新闻`);
    return result;
  } catch (error) {
    console.error('[Lenny\'s Newsletter] 获取失败:', error);
    return [];
  }
}