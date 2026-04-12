import Parser from 'rss-parser';
import { API_RSS_SOURCES } from './sources';
import type { DailyBriefResponse, FrontendCategory, FrontendNewsItem, SourceConfig } from './types';

interface RawItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  content: string;
}

interface RankedItem extends RawItem {
  hotScore: number;
  matchedTopics: string[];
  category: Exclude<FrontendCategory, 'Hot'>;
}

const parser = new Parser();
const SHANGHAI_TZ = 'Asia/Shanghai';
const SOURCE_FETCH_LIMIT = 12;
const FINAL_LIMIT = 20;

const IMPORTANT_ENTITY_KEYWORDS = [
  'openai', 'google', 'anthropic', 'claude', 'glm', 'gemini', 'deepseek', 'qwen', 'kimi',
  '字节', '百度', '腾讯', '阿里', '微软', 'meta', 'nvidia', 'apple', 'tesla', 'xai',
];

const HOT_EVENT_KEYWORDS = [
  '发布', '开源', '上线', '更新', '升级', '融资', '合作', '收购', 'agent', '推理', '模型',
  '大模型', '多模态', '芯片', '算力', '安全', '监管', '政策', '应用', '产品',
];

const EXCLUDE_KEYWORDS = [
  '日报', '周报', '月报', '合集', '汇总', '回顾', '招聘', '活动', '课程', '直播',
];

const TOPIC_KEYWORDS: Array<{ label: string; patterns: string[] }> = [
  { label: 'LLM', patterns: ['llm', '大模型', '语言模型', 'gpt', 'claude', 'glm', 'gemini', 'qwen'] },
  { label: 'Agent', patterns: ['agent', '智能体'] },
  { label: '多模态', patterns: ['多模态', 'multimodal', '图像', '视频', '语音'] },
  { label: 'AI 产品', patterns: ['产品', '助手', '应用', 'ai 手机', '终端'] },
  { label: '模型发布', patterns: ['发布', '上线', '更新', '升级'] },
  { label: '开源', patterns: ['开源', 'github', '权重开放'] },
  { label: '融资', patterns: ['融资', '投资', '估值'] },
  { label: '推理', patterns: ['推理', 'reasoning'] },
  { label: 'AI 安全', patterns: ['安全', '对齐', '伦理'] },
  { label: '政策监管', patterns: ['政策', '监管', '合规'] },
  { label: '自动驾驶', patterns: ['自动驾驶', '智驾'] },
  { label: '机器人', patterns: ['机器人', '具身'] },
  { label: '算力', patterns: ['算力', 'gpu', '芯片', '英伟达'] },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: SHANGHAI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return parts.replace(' ', ' ');
}

function getYesterdayDateString(): string {
  const now = new Date();
  const local = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return formatDate(local);
}

function isYesterdayInShanghai(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return formatDate(date) === getYesterdayDateString();
}

function resolveContent(item: Parser.Item): string {
  const extended = item as Parser.Item & { description?: string; 'content:encoded'?: string };
  return item.contentSnippet || item.content || item.summary || extended.description || extended['content:encoded'] || '';
}

function buildCategory(text: string): Exclude<FrontendCategory, 'Hot'> {
  if (/(政策|监管|合规|法案|安全)/i.test(text)) return '政策';
  if (/(模型|大模型|llm|gpt|claude|glm|gemini|qwen|deepseek|推理)/i.test(text)) return '模型';
  if (/(产品|应用|助手|手机|终端|机器人|工具)/i.test(text)) return '产品';
  return '商业';
}

function extractTopics(text: string): string[] {
  const matches = TOPIC_KEYWORDS
    .filter((topic) => topic.patterns.some((pattern) => text.includes(pattern.toLowerCase())))
    .map((topic) => topic.label)
    .slice(0, 3);

  if (matches.length > 0) return matches;

  if (text.includes('google')) return ['Google'];
  if (text.includes('openai')) return ['OpenAI'];
  if (text.includes('claude')) return ['Claude'];
  if (text.includes('glm')) return ['GLM'];

  return ['AI 动态'];
}

function buildSummary(item: RawItem, topics: string[]): string {
  const cleanContent = item.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const sourceLead = `${item.source} 昨日报道`;
  if (!cleanContent) {
    return `${sourceLead}：${item.title}。主题聚焦 ${topics.join('、')}。`;
  }

  const sliced = cleanContent.slice(0, 82);
  return `${sourceLead}，核心信息是：${sliced}${cleanContent.length > 82 ? '...' : ''}`;
}

function calculateHotScore(item: RawItem, source: SourceConfig): RankedItem | null {
  const text = normalizeText(`${item.title} ${item.content}`);
  const title = normalizeText(item.title);

  if (!text) return null;
  if (EXCLUDE_KEYWORDS.some((keyword) => title.includes(keyword))) return null;

  const entityHits = IMPORTANT_ENTITY_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
  const eventHits = HOT_EVENT_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
  const aiHits = ['ai', '人工智能', '大模型', '模型', 'agent'].filter((keyword) => text.includes(keyword)).length;

  if (entityHits === 0 && eventHits === 0 && aiHits === 0) return null;

  let hotScore = Math.round(source.priority * 10);
  hotScore += entityHits * 8;
  hotScore += eventHits * 4;
  hotScore += aiHits * 2;

  if (/(openai|google|claude|glm|gemini)/i.test(title)) hotScore += 6;
  if (/(发布|上线|开源|融资|升级)/i.test(title)) hotScore += 4;
  if (/(agent|智能体)/i.test(title)) hotScore += 3;
  if (/(日报|周报|合集|回顾)/i.test(title)) hotScore -= 10;

  if (hotScore < 12) return null;

  const category = buildCategory(text);
  const matchedTopics = extractTopics(text);

  return {
    ...item,
    hotScore,
    matchedTopics,
    category,
  };
}

async function fetchSource(source: SourceConfig): Promise<RawItem[]> {
  if (source.enabled === false) return [];

  try {
    const feed = await parser.parseURL(source.url);
    return feed.items
      .map((item) => {
        const title = (item.title || '').trim();
        const url = (item.link || item.guid || '').trim();
        if (!title || !url) return null;

        return {
          title,
          source: source.name,
          url,
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          content: resolveContent(item),
        };
      })
      .filter((item): item is RawItem => Boolean(item))
      .slice(0, SOURCE_FETCH_LIMIT);
  } catch (error) {
    console.error(`[daily-brief] source failed: ${source.name}`, error);
    return [];
  }
}

function dedupe(items: RankedItem[]): RankedItem[] {
  const map = new Map<string, RankedItem>();

  for (const item of items) {
    const key = normalizeText(item.title);
    const current = map.get(key);
    if (!current || item.hotScore > current.hotScore) {
      map.set(key, item);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.hotScore - a.hotScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}

function toFrontendItem(item: RankedItem, index: number): FrontendNewsItem {
  const date = new Date(item.publishedAt);
  return {
    id: `${index + 1}`,
    Title: item.title,
    Source: item.source,
    Category: item.category,
    Topics: item.matchedTopics,
    HotScore: item.hotScore,
    Summary: buildSummary(item, item.matchedTopics),
    PublishAt: formatDateTime(date),
    originalUrl: item.url,
  };
}

function buildSummaryBullets(news: FrontendNewsItem[]): string[] {
  const topSources = Array.from(new Set(news.slice(0, 5).map((item) => item.Source))).slice(0, 3);
  const topTopics = Array.from(new Set(news.flatMap((item) => item.Topics))).slice(0, 3);

  if (news.length === 0) {
    return ['昨天没有抓到符合规则的 AI 热点新闻。'];
  }

  return [
    `昨天共筛出 ${news.length} 条高相关 AI 新闻，热度最高的话题集中在 ${topTopics.join('、')}。`,
    `高频来源主要来自 ${topSources.join('、')}，说明这些站点在昨天的信息密度更高。`,
    '热门内容仍以大模型更新、产品发布和商业化动作为主，政策与安全相关话题保持次级热度。',
  ];
}

export async function buildDailyBrief(): Promise<DailyBriefResponse> {
  const rawGroups = await Promise.all(API_RSS_SOURCES.map((source) => fetchSource(source)));
  const rawItems = rawGroups.flat().filter((item) => isYesterdayInShanghai(item.publishedAt));

  const ranked = rawItems
    .map((item) => {
      const source = API_RSS_SOURCES.find((entry) => entry.name === item.source);
      return source ? calculateHotScore(item, source) : null;
    })
    .filter((item): item is RankedItem => Boolean(item));

  const deduped = dedupe(ranked).slice(0, FINAL_LIMIT);
  const news = deduped.map(toFrontendItem);
  const top5 = news.slice(0, 5).map((item, index) => ({
    rank: `${index + 1}`.padStart(2, '0'),
    title: item.Title,
    hotScore: item.HotScore,
    category: item.Category,
    newsId: item.id,
  }));

  return {
    news,
    top5,
    summary: buildSummaryBullets(news),
    date: getYesterdayDateString(),
    total: news.length,
  };
}
