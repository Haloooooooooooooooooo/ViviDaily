// InfoQ AI 网页爬取
// https://www.infoq.cn/artificial-intelligence/

import { RawNewsItem, SourceType } from '../types';

export async function fetchInfoQ(limit: number = 3): Promise<RawNewsItem[]> {
  console.log('[InfoQ AI] 开始获取今日AI热门...');

  try {
    const response = await fetch('https://www.infoq.cn/artificial-intelligence/');
    if (!response.ok) {
      console.log('[InfoQ AI] 访问失败');
      return [];
    }

    const html = await response.text();
    const result: RawNewsItem[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 提取文章链接和标题
    const patterns = [
      /<a[^>]*href="([^"]*\/article\/[^"]*)"[^>]*>([^<]*)<\/a>/g,
      /<a[^>]*href="([^"]*)"[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*)<\/a>/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && result.length < limit) {
        const url = match[1];
        const title = match[2].trim();

        if (title && url && title.length > 10) {
          result.push({
            title,
            source: 'InfoQ AI' as SourceType,
            url: url.startsWith('http') ? url : `https://www.infoq.cn${url}`,
            publishedAt: `${today}T08:00:00Z`,
          });
        }
      }
    }

    console.log(`[InfoQ AI] 获取到 ${result.length} 条新闻`);
    return result.slice(0, limit);
  } catch (error) {
    console.error('[InfoQ AI] 获取失败:', error);
    return [];
  }
}