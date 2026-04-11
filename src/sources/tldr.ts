// TLDR AI 网页爬取
// URL格式: https://tldr.tech/ai/YYYY-MM-DD

import { RawNewsItem, SourceType } from '../types';

interface TLDRSection {
  title: string;
  links?: { text: string; href: string }[];
}

// 获取今日TLDR AI内容
export async function fetchTLDRAI(limit: number = 5): Promise<RawNewsItem[]> {
  console.log('[TLDR AI] 开始获取今日内容...');

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const url = `https://tldr.tech/ai/${dateStr}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // 如果今天还没发布，尝试昨天
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const fallbackUrl = `https://tldr.tech/ai/${yesterdayStr}`;

      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) {
        console.log('[TLDR AI] 今日和昨日内容均未找到');
        return [];
      }
      return parseTLDRPage(await fallbackRes.text(), yesterdayStr);
    }

    return parseTLDRPage(await response.text(), dateStr);
  } catch (error) {
    console.error('[TLDR AI] 获取失败:', error);
    return [];
  }
}

// 解析TLDR页面内容
function parseTLDRPage(html: string, dateStr: string): RawNewsItem[] {
  const result: RawNewsItem[] = [];

  // 简化的解析逻辑：提取标题和链接
  // TLDR AI页面结构比较规整，标题通常在<h3>或<strong>标签中

  // 匹配新闻标题模式
  const titlePatterns = [
    /<h3[^>]*>(.*?)<\/h3>/g,
    /<strong[^>]*>(.*?)<\/strong>/g,
  ];

  // 提取链接
  const linkPattern = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g;

  // 简化处理：提取包含"AI"、"Claude"、"GPT"等关键词的段落
  const aiKeywords = ['AI', 'Claude', 'GPT', 'LLM', 'OpenAI', 'Anthropic', 'Gemini', 'Copilot'];

  // 使用正则提取主要内容块
  const sections = html.split(/<section|<div class="content/);

  for (const section of sections.slice(0, 20)) {
    // 提取标题
    const titleMatch = section.match(/<h3[^>]*>(.*?)<\/h3>/);
    if (titleMatch) {
      const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();

      // 提取链接
      const linkMatch = section.match(/<a[^>]*href="([^"]*)"[^>]*>/);
      const link = linkMatch ? linkMatch[1] : '';

      if (title && link && aiKeywords.some(k => title.includes(k))) {
        result.push({
          title,
          source: 'TLDR AI' as SourceType,
          url: link.startsWith('http') ? link : `https://tldr.tech${link}`,
          publishedAt: `${dateStr}T08:00:00Z`,
        });
      }
    }
  }

  console.log(`[TLDR AI] 获取到 ${result.length} 条AI新闻`);
  return result.slice(0, 5);
}