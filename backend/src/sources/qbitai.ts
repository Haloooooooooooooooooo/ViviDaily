// 量子位 网页爬取
// https://www.qbitai.com

import { RawNewsItem, SourceType } from '../types';

export async function fetchQbitai(limit: number = 3): Promise<RawNewsItem[]> {
  console.log('[量子位] 开始获取今日AI热门...');

  try {
    const response = await fetch('https://www.qbitai.com');
    if (!response.ok) {
      console.log('[量子位] 访问失败');
      return [];
    }

    const html = await response.text();
    const result: RawNewsItem[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 提取文章链接和标题
    const patterns = [
      /<a[^>]*href="([^"]*)"[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*)<\/a>/g,
      /<h[23][^>]*><a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && result.length < limit) {
        const url = match[1];
        const title = match[2].trim();

        if (title && url && title.length > 10) {
          result.push({
            title,
            source: '量子位' as SourceType,
            url: url.startsWith('http') ? url : `https://www.qbitai.com${url}`,
            publishedAt: `${today}T08:00:00Z`,
          });
        }
      }
    }

    console.log(`[量子位] 获取到 ${result.length} 条新闻`);
    return result.slice(0, limit);
  } catch (error) {
    console.error('[量子位] 获取失败:', error);
    return [];
  }
}