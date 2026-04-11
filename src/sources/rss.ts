import Parser from 'rss-parser';
import { RawNewsItem, SourceType } from '../types';

const parser = new Parser();

export interface RssSourceConfig {
  name: SourceType;
  category: 'ai_media' | 'tech_media' | 'developer' | 'research';
  url: string;
  priority: number;
  enabled?: boolean;
}

function resolveItemContent(item: Parser.Item): string {
  const extendedItem = item as Parser.Item & {
    description?: string;
    'content:encoded'?: string;
  };

  return (
    item.contentSnippet ||
    item.content ||
    item.summary ||
    extendedItem.description ||
    extendedItem['content:encoded'] ||
    ''
  );
}

function normalizeLink(item: Parser.Item): string {
  return item.link || item.guid || '';
}

export async function fetchRssSource(
  source: RssSourceConfig,
  limit: number,
): Promise<RawNewsItem[]> {
  if (source.enabled === false) {
    console.log(`[采集] ${source.name} 已暂时停用`);
    return [];
  }

  console.log(`[采集] ${source.name} RSS 抓取中...`);

  try {
    const feed = await parser.parseURL(source.url);

    const items = feed.items
      .map((item): RawNewsItem | null => {
        const title = (item.title || '').trim();
        const url = normalizeLink(item).trim();

        if (!title || !url) {
          return null;
        }

        return {
          title,
          source: source.name,
          url,
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          content: resolveItemContent(item),
        };
      })
      .filter((item): item is RawNewsItem => item !== null)
      .slice(0, limit);

    console.log(`[采集] ${source.name} 获取 ${items.length} 条 RSS 原始内容`);
    return items;
  } catch (error) {
    console.error(`[采集] ${source.name} 失败:`, error);
    return [];
  }
}

export const RSS_SOURCES: RssSourceConfig[] = [
  { name: '量子位', category: 'ai_media', url: 'https://www.qbitai.com/feed', priority: 1.0 },
  { name: '机器之心', category: 'ai_media', url: 'https://www.jiqizhixin.com/rss', priority: 1.0, enabled: false },
  { name: '新智元', category: 'ai_media', url: 'https://www.aixinzhi.com/rss', priority: 1.0, enabled: false },
  { name: 'RadarAI', category: 'ai_media', url: 'https://radarai.top/feed.xml', priority: 0.95 },
  { name: '雷锋网 AI', category: 'ai_media', url: 'https://www.leiphone.com/feed/categoryRss/name/aijuejinzhi', priority: 0.96 },
  { name: '雷锋网 研究社', category: 'research', url: 'https://www.leiphone.com/feed/categoryRss/name/yanxishe', priority: 0.9 },
  { name: 'IT之家', category: 'tech_media', url: 'https://www.ithome.com/rss', priority: 0.9 },
  { name: '极客公园', category: 'tech_media', url: 'https://www.geekpark.net/rss', priority: 0.92, enabled: false },
  { name: '爱范儿', category: 'tech_media', url: 'https://www.ifanr.com/feed', priority: 0.9 },
  { name: '36氪', category: 'tech_media', url: 'https://36kr.com/feed', priority: 0.95 },
  { name: 'InfoQ', category: 'tech_media', url: 'https://www.infoq.cn/feed', priority: 0.95 },
  { name: '掘金', category: 'developer', url: 'https://juejin.cn/channel/6868434286512263175/rss', priority: 0.88, enabled: false },
  { name: '阿里云开发者社区', category: 'developer', url: 'https://developer.aliyun.com/topic/ai/rss', priority: 0.9, enabled: false },
  { name: '百度 AI 开发者社区', category: 'developer', url: 'https://ai.baidu.com/forum/rss', priority: 0.88, enabled: false },
  { name: '腾讯研究院', category: 'research', url: 'https://research.tencent.com/rss', priority: 0.82, enabled: false },
  { name: '阿里研究院', category: 'research', url: 'https://www.aliresearch.com/rss', priority: 0.82, enabled: false },
  { name: 'cnBeta', category: 'tech_media', url: 'http://www.cnbeta.com/backend.php', priority: 0.86 },
];
