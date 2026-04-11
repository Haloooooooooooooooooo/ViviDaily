import dotenv from 'dotenv';
import { processAllNews, createAIConfig } from './ai/processor';
import { writeAllToNotion, createNotionConfig } from './notion/client';
import { RSS_SOURCES, fetchRssSource } from './sources/rss';
import {
  AI_STRONG_KEYWORDS,
  DIGEST_KEYWORDS,
  EXCLUDE_KEYWORDS,
  HOT_ENTITY_KEYWORDS,
  HOT_EVENT_KEYWORDS,
  LOW_SIGNAL_KEYWORDS,
  RankedRawNewsItem,
  RawNewsItem,
} from './types';

dotenv.config();

const SOURCE_FETCH_LIMIT = 12;
const FINAL_NEWS_LIMIT = 20;
const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';
const EVENT_STOPWORDS = new Set([
  '一个',
  '这次',
  '今天',
  '刚刚',
  '突发',
  '最新',
  '正式',
  '完成',
  '上线',
  '发布',
  '推出',
  '实现',
  '相关',
  '中国',
  '全球',
  '首次',
  '再次',
  '已经',
  '正在',
  '还是',
  '这个',
  '那个',
  '我们',
  '他们',
  '你们',
  '什么',
  '如何',
  '为何',
  '以及',
  '还有',
  '之后',
  '因为',
  '所以',
  '进行',
  '通过',
  '成为',
  '使用',
  '支持',
  '公司',
  '产品',
  '服务',
  '模型',
  '大模型',
  'ai',
  'agent',
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[【】\[\]()（）:：!！?？,，.。/\\|"'“”‘’`~@#$%^&*_+=-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatShanghaiDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

function isTodayInShanghai(dateStr: string): boolean {
  const itemDate = new Date(dateStr);
  if (Number.isNaN(itemDate.getTime())) {
    return false;
  }

  return formatShanghaiDate(itemDate) === formatShanghaiDate(new Date());
}

function isExcluded(text: string): boolean {
  return EXCLUDE_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

function findMatchedKeywords(text: string, keywords: readonly string[]): string[] {
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}

function extractEventTokens(title: string, content: string): string[] {
  const text = `${title} ${content}`.trim();
  const normalized = normalizeText(text);
  const tokens = normalized
    .split(' ')
    .filter((token) => token.length >= 2)
    .filter((token) => !EVENT_STOPWORDS.has(token))
    .filter((token) => !/^\d+$/.test(token));

  const entityMatches = findMatchedKeywords(normalized, HOT_ENTITY_KEYWORDS);
  const eventMatches = findMatchedKeywords(normalized, HOT_EVENT_KEYWORDS);
  const aiMatches = findMatchedKeywords(normalized, AI_STRONG_KEYWORDS)
    .filter((token) => !['ai', '模型', '大模型', 'agent'].includes(token))
    .slice(0, 3);

  const descriptiveTokens = tokens
    .filter((token) => token.length >= 3 || /[a-z]/.test(token))
    .slice(0, 6);

  return Array.from(new Set([...entityMatches, ...eventMatches, ...aiMatches, ...descriptiveTokens])).slice(0, 8);
}

function buildEventSignature(item: RawNewsItem): string | undefined {
  const tokens = extractEventTokens(item.title, item.content || '');
  if (tokens.length < 2) {
    return undefined;
  }

  return tokens.sort().join('|');
}

function calculateHotScore(item: RawNewsItem): RankedRawNewsItem | null {
  const title = normalizeText(item.title);
  const content = normalizeText(item.content || '');
  const text = `${title} ${content}`.trim();

  if (!text || isExcluded(text)) {
    return null;
  }

  const aiMatches = findMatchedKeywords(text, AI_STRONG_KEYWORDS);
  const entityMatches = findMatchedKeywords(text, HOT_ENTITY_KEYWORDS);
  const eventMatches = findMatchedKeywords(text, HOT_EVENT_KEYWORDS);
  const digestMatches = findMatchedKeywords(title, DIGEST_KEYWORDS);
  const lowSignalMatches = findMatchedKeywords(text, LOW_SIGNAL_KEYWORDS);

  const isAIRelevant = aiMatches.length > 0 || (entityMatches.length > 0 && eventMatches.length > 0);
  if (!isAIRelevant) {
    return null;
  }

  if (digestMatches.length > 0 && entityMatches.length === 0) {
    return null;
  }

  const sourcePriority = RSS_SOURCES.find((source) => source.name === item.source)?.priority || 0.8;
  const titleEntityMatches = findMatchedKeywords(title, HOT_ENTITY_KEYWORDS);
  const titleEventMatches = findMatchedKeywords(title, HOT_EVENT_KEYWORDS);

  let hotScore = 0;
  hotScore += aiMatches.length * 2;
  hotScore += entityMatches.length * 4;
  hotScore += eventMatches.length * 2;
  hotScore += titleEntityMatches.length * 3;
  hotScore += titleEventMatches.length * 2;
  hotScore += Math.round(sourcePriority * 10);
  hotScore -= digestMatches.length * 5;
  hotScore -= lowSignalMatches.length * 2;

  if (title.includes('大模型') || title.includes('模型')) {
    hotScore += 2;
  }
  if (title.includes('google') || title.includes('谷歌') || title.includes('claude') || title.includes('glm')) {
    hotScore += 3;
  }
  if (title.includes('发布') || title.includes('开源') || title.includes('融资') || title.includes('上线')) {
    hotScore += 2;
  }
  if (title.includes('专访')) {
    hotScore -= 4;
  }
  if (title.includes('早报') || title.includes('晚报') || title.includes('周报')) {
    hotScore -= 6;
  }
  if (title.includes('股') || title.includes('财报') || title.includes('售价')) {
    hotScore -= 3;
  }

  if (hotScore < 6) {
    return null;
  }

  const matchedKeywords = Array.from(new Set([...aiMatches, ...entityMatches, ...eventMatches]));
  const eventSignature = buildEventSignature(item);

  return {
    ...item,
    hotScore,
    matchedKeywords,
    eventSignature,
  };
}

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    const removableParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'spm',
      'from',
      'source',
    ];
    removableParams.forEach((key) => parsed.searchParams.delete(key));
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function dedupeNews(items: RankedRawNewsItem[]): RankedRawNewsItem[] {
  const byTitle = new Map<string, RankedRawNewsItem>();
  const byEvent = new Map<string, RankedRawNewsItem>();

  for (const item of items) {
    const normalizedTitle = normalizeText(item.title);
    const normalizedUrl = canonicalizeUrl(item.url);
    const existing = byTitle.get(normalizedTitle);

    if (!existing || item.hotScore > existing.hotScore) {
      byTitle.set(normalizedTitle, {
        ...item,
        url: normalizedUrl,
      });
    }
  }

  for (const item of byTitle.values()) {
    if (!item.eventSignature) {
      const fallbackKey = `${normalizeText(item.title)}::${item.url}`;
      byEvent.set(fallbackKey, item);
      continue;
    }

    const existing = byEvent.get(item.eventSignature);
    if (!existing || item.hotScore > existing.hotScore) {
      byEvent.set(item.eventSignature, item);
    }
  }

  return Array.from(byEvent.values()).sort(
    (a, b) => b.hotScore - a.hotScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}

function filterAndRankNews(items: RawNewsItem[]): RankedRawNewsItem[] {
  const ranked = items
    .filter((item) => {
      if (!isTodayInShanghai(item.publishedAt)) {
        console.log(`[过滤] 非北京时间当天: ${item.source} - ${item.title.slice(0, 40)}...`);
        return false;
      }

      if (!item.url || item.url.includes('github.com') || item.url.includes('youtube.com') || item.url.includes('bilibili.com')) {
        console.log(`[过滤] 无效链接: ${item.url}`);
        return false;
      }

      const normalizedTitle = normalizeText(item.title);
      if (findMatchedKeywords(normalizedTitle, DIGEST_KEYWORDS).length > 0) {
        console.log(`[过滤] 汇总型内容: ${item.title.slice(0, 40)}...`);
        return false;
      }

      if (normalizedTitle.includes('专访') || normalizedTitle.includes('回顾')) {
        console.log(`[过滤] 非快讯热点内容: ${item.title.slice(0, 40)}...`);
        return false;
      }

      return true;
    })
    .map(calculateHotScore)
    .filter((item): item is RankedRawNewsItem => item !== null)
    .sort((a, b) => b.hotScore - a.hotScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return dedupeNews(ranked).slice(0, FINAL_NEWS_LIMIT);
}

function checkEnvVars(): boolean {
  const required = ['NOTION_API_KEY', 'NOTION_DATABASE_ID', 'AI_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('缺少必要的环境变量:', missing.join(', '));
    return false;
  }

  return true;
}

async function collectAllNews(): Promise<RawNewsItem[]> {
  const fetched = await Promise.all(
    RSS_SOURCES.map((source) => fetchRssSource(source, SOURCE_FETCH_LIMIT)),
  );

  return fetched.flat();
}

async function main() {
  console.log('=================================');
  console.log('  ViviDaily 中文 AI 热点采集');
  console.log('  严格北京时间当天新闻');
  console.log('=================================\n');

  if (!checkEnvVars()) {
    process.exit(1);
  }

  console.log('[Step 1] RSS 采集...\n');
  const allRawNews = await collectAllNews();
  console.log(`\n[采集完成] 共获取 ${allRawNews.length} 条原始内容\n`);

  console.log('[Step 2] 当天过滤 + AI 强相关 + 热点排序...\n');
  const filteredNews = filterAndRankNews(allRawNews);
  console.log(`\n[筛选完成] 保留 ${filteredNews.length} 条热点新闻\n`);

  if (filteredNews.length === 0) {
    console.log('今天没有抓到符合规则的中文 AI 热点新闻，程序结束。');
    process.exit(0);
  }

  console.log('[Step 3] AI 处理...\n');
  const aiConfig = createAIConfig();
  const processedNews = await processAllNews(filteredNews, aiConfig);

  console.log('[Step 4] 写入 Notion...\n');
  const notionConfig = createNotionConfig();
  const successCount = await writeAllToNotion(processedNews, notionConfig);

  console.log('\n=================================');
  console.log(`  完成，成功写入 ${successCount} 条新闻`);
  console.log('=================================\n');
}

main().catch((error) => {
  console.error('程序出错:', error);
  process.exit(1);
});
