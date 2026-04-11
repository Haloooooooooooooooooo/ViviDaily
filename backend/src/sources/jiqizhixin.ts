// 机器之心 网页爬取
// https://www.jiqizhixin.com

import { RawNewsItem, SourceType } from '../types';

export async function fetchJiqizhixin(limit: number = 3): Promise<RawNewsItem[]> {
  console.log('[机器之心] 开始获取今日AI热门...');

  try {
    const response = await fetch('https://www.jiqizhixin.com');
    if (!response.ok) {
      console.log('[机器之心] 访问失败');
      return [];
    }

    const html = await response.text();
    const result: RawNewsItem[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 提取文章链接和标题
    const articlePatterns = [
      /<a[^>]*href="([^"]*\/articles\/[^"]*)"[^>]*>([^<]*)<\/a>/g,
      /<a[^>]*href="([^"]*\/[^"]*\.html)"[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*)<\/a>/g,
    ];

    for (const pattern of articlePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && result.length < limit) {
        const url = match[1];
        const title = match[2].trim();

        if (title && url && title.length > 10) {
          result.push({
            title,
            source: '机器之心' as SourceType,
            url: url.startsWith('http') ? url : `https://www.jiqizhixin.com${url}`,
            publishedAt: `${today}T08:00:00Z`,
          });
        }
      }
    }

    console.log(`[机器之心] 获取到 ${result.length} 条新闻`);
    return result.slice(0, limit);
  } catch (error) {
    console.error('[机器之心] 获取失败:', error);
    return [];
  }
}