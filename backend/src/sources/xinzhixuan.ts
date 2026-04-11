// 新智元 网页爬取
// https://www.xinzhixinyuan.com

import { RawNewsItem, SourceType } from '../types';

export async function fetchXinzhixuan(limit: number = 3): Promise<RawNewsItem[]> {
  console.log('[新智元] 开始获取今日AI热门...');

  try {
    const response = await fetch('https://www.xinzhixinyuan.com');
    if (!response.ok) {
      console.log('[新智元] 访问失败');
      return [];
    }

    const html = await response.text();
    const result: RawNewsItem[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 提取文章链接和标题
    const pattern = /<a[^>]*href="([^"]*)"[^>]*title="([^"]*)"/g;

    let match;
    while ((match = pattern.exec(html)) !== null && result.length < limit) {
      const url = match[1];
      const title = match[2].trim();

      if (title && url && title.length > 10 && url.includes('/')) {
        result.push({
          title,
          source: '新智元' as SourceType,
          url: url.startsWith('http') ? url : `https://www.xinzhixinyuan.com${url}`,
          publishedAt: `${today}T08:00:00Z`,
        });
      }
    }

    console.log(`[新智元] 获取到 ${result.length} 条新闻`);
    return result.slice(0, limit);
  } catch (error) {
    console.error('[新智元] 获取失败:', error);
    return [];
  }
}