import Parser from 'rss-parser';
import { API_RSS_SOURCES } from './sources';
import {
  AUTHORITY_WEIGHTS,
  type DailyBriefResponse,
  type FrontendCategory,
  type FrontendNewsItem,
  type SourceConfig,
} from './types';

interface RawItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  content: string;
}

interface RankedItem extends RawItem {
  hotScore: number;
  topics: string[];
  category: Exclude<FrontendCategory, 'Hot'>;
  dedupeKey: string;
}

interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface AIResult {
  summary: string;
  topics: string[];
}

const parser = new Parser({
  timeout: 8000,
});
const SHANGHAI_TZ = 'Asia/Shanghai';
const SOURCE_FETCH_LIMIT = 24;
const FINAL_LIMIT = 30;
const AI_REQUEST_TIMEOUT_MS = 8000;
const MIN_HOT_SCORE = 8;
const MIN_SUPPLEMENT_SCORE = 8;

const IMPORTANT_ENTITIES = [
  'openai', 'google', 'anthropic', 'claude', 'gemini', 'deepseek', 'qwen', 'glm', 'kimi',
  '字节', '百度', '腾讯', '阿里', '微软', 'meta', 'nvidia', 'apple', 'tesla', 'xai', '智谱', '月之暗面',
];
const HOT_EVENT_WORDS = [
  '发布', '开源', '上线', '升级', '融资', '收购', '合作', '首发', '突发', 'agent', '推理', '模型', '多模态',
  '芯片', '算力', '安全', '监管', '政策', '产品',
];
const EXCLUDE_WORDS = ['日报', '周报', '月报', '合集', '回顾', '招聘', '活动', '课程', '直播'];
const LOW_SIGNAL_WORDS = ['股价', '财报', '参数', '售价', '评测', '开箱'];

const TOPIC_KEYWORDS: Array<{ label: string; patterns: string[] }> = [
  { label: 'LLM', patterns: ['llm', '大模型', '语言模型', 'gpt', 'claude', 'gemini', 'qwen', 'glm', 'deepseek'] },
  { label: 'Agent', patterns: ['agent', '智能体'] },
  { label: '多模态', patterns: ['多模态', 'multimodal', '图像', '视频', '语音', '视觉'] },
  { label: '推理', patterns: ['推理', 'reasoning'] },
  { label: 'RAG', patterns: ['rag', '检索增强', '知识库'] },
  { label: 'AI 产品', patterns: ['产品', '应用', '助手', 'copilot', 'chatbot'] },
  { label: '模型发布', patterns: ['发布', '上线', '升级', '首发'] },
  { label: '开源', patterns: ['开源', 'github', 'huggingface'] },
  { label: '融资', patterns: ['融资', '投资', '估值'] },
  { label: 'AI 芯片', patterns: ['芯片', 'gpu', 'nvidia', 'h100', 'h200'] },
  { label: '自动驾驶', patterns: ['自动驾驶', 'waymo', 'fsd'] },
  { label: '机器人', patterns: ['机器人', '具身', '人形机器人'] },
  { label: 'AI 安全', patterns: ['安全', '对齐', '伦理', '红队', '风险'] },
  { label: '政策监管', patterns: ['政策', '监管', '法案', '合规'] },
  { label: '算力', patterns: ['算力', '集群', 'gpu'] },
  { label: 'OpenAI', patterns: ['openai', 'chatgpt', 'gpt-4', 'gpt-5', 'sora'] },
  { label: 'Google', patterns: ['google', 'gemini', 'deepmind'] },
  { label: 'Anthropic', patterns: ['anthropic', 'claude'] },
  { label: 'DeepSeek', patterns: ['deepseek'] },
  { label: '字节跳动', patterns: ['字节', '豆包', '火山引擎'] },
  { label: '智谱AI', patterns: ['智谱', 'glm', 'chatglm'] },
  { label: '月之暗面', patterns: ['月之暗面', 'kimi'] },
];

const SUMMARY_PROMPT = `你是 AI 科技新闻编辑。请基于标题和内容生成 60-100 字中文摘要，只保留关键事实，不做主观评价。
标题：{{title}}
内容：{{content}}
来源：{{source}}`;

const TOPIC_PROMPT = `请从以下标签中选择 1-3 个最匹配的：LLM、Agent、多模态、开源、融资、推理、AI 产品、模型发布、AI 芯片、自动驾驶、机器人、AI 应用、AI 安全、政策监管、RAG、算力、OpenAI、Google、Anthropic、DeepSeek、字节跳动、智谱AI、月之暗面。
如果都不匹配，可补充 1 个短标签。只输出标签，用中文逗号分隔。
标题：{{title}}
内容：{{content}}`;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\.[a-z]{2,}\/.+/i.test(value) || /^[\w.-]+\.[a-z]{2,}$/i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

function isFeedLikeUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.endsWith('/rss') ||
    lower.includes('/rss/') ||
    lower.includes('feed.xml') ||
    lower.includes('/feed') ||
    lower.includes('backend.php') ||
    lower.endsWith('.xml')
  );
}

function isLikelyArticleUrl(url: string): boolean {
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  if (isFeedLikeUrl(url)) return false;
  return true;
}

function extractFirstHrefFromHtml(html: string): string {
  if (!html) return '';
  const match = html.match(/href\s*=\s*["']([^"']+)["']/i);
  if (!match?.[1]) return '';
  return normalizeUrl(match[1]);
}

function resolveItemUrl(item: Parser.Item, sourceUrl: string): string {
  const extended = item as Parser.Item & { guid?: string; id?: string; description?: string; 'content:encoded'?: string };
  const fromHtml = extractFirstHrefFromHtml(
    `${item.content || ''}\n${item.contentSnippet || ''}\n${item.summary || ''}\n${extended.description || ''}\n${extended['content:encoded'] || ''}`,
  );

  const candidates = [
    normalizeUrl((item.link || '').trim()),
    normalizeUrl((extended.guid || '').trim()),
    normalizeUrl((extended.id || '').trim()),
    fromHtml,
  ].filter(Boolean);

  const sourceHost = (() => {
    try {
      return new URL(sourceUrl).host;
    } catch {
      return '';
    }
  })();

  for (const candidate of candidates) {
    if (!isLikelyArticleUrl(candidate)) continue;
    try {
      const host = new URL(candidate).host;
      // Prefer in-domain article links first.
      if (sourceHost && host === sourceHost) return candidate;
    } catch {
      // ignore invalid URL here, filtered by normalize/regex anyway
    }
  }

  for (const candidate of candidates) {
    if (isLikelyArticleUrl(candidate)) return candidate;
  }

  return '';
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
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: SHANGHAI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getYesterdayDateString(): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return formatDate(yesterday);
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
  if (/(政策|监管|法案|合规|禁令|安全|对齐|伦理)/i.test(text)) return '政策';
  if (/(模型|大模型|llm|gpt|claude|gemini|glm|qwen|deepseek|推理|训练|微调|多模态)/i.test(text)) return '模型';
  if (/(产品|应用|助手|工具|终端|手机|机器人|智能体|agent|copilot|chatbot)/i.test(text)) return '产品';
  return '商业';
}

function extractTopics(text: string): string[] {
  const normalized = normalizeText(text);
  const byRule = TOPIC_KEYWORDS
    .map((topic) => ({
      label: topic.label,
      score: topic.patterns.filter((pattern) => normalized.includes(pattern.toLowerCase())).length,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.label);

  return byRule.length ? byRule : ['AI 动态'];
}

function buildDedupeKey(title: string, content: string): string {
  // Use title-led key to avoid over-merging distinct stories under one entity/event.
  // Keep a small entity suffix so exact same title from different sources still dedupes.
  const titleCore = normalizeText(title).slice(0, 72);
  const text = normalizeText(`${title} ${content}`);
  const entity = IMPORTANT_ENTITIES.find((keyword) => text.includes(keyword.toLowerCase())) || '';
  return entity ? `${titleCore}|${entity}` : titleCore;
}

function calculateHotScore(item: RawItem, source: SourceConfig): RankedItem | null {
  const text = normalizeText(`${item.title} ${item.content}`);
  const title = normalizeText(item.title);
  if (!text) return null;
  if (EXCLUDE_WORDS.some((keyword) => title.includes(keyword))) return null;

  const entityHits = IMPORTANT_ENTITIES.filter((keyword) => text.includes(keyword)).length;
  const eventHits = HOT_EVENT_WORDS.filter((keyword) => text.includes(keyword)).length;
  const aiHits = ['ai', '人工智能', '大模型', '模型', 'agent', '智能体'].filter((keyword) => text.includes(keyword)).length;
  const lowSignalHits = LOW_SIGNAL_WORDS.filter((keyword) => text.includes(keyword)).length;
  if (entityHits === 0 && eventHits === 0 && aiHits === 0) return null;

  const authorityWeight = AUTHORITY_WEIGHTS[source.authorityLevel];
  let hotScore = Math.round(source.priority * 10 * authorityWeight);
  hotScore += entityHits * 9;
  hotScore += eventHits * 5;
  hotScore += aiHits * 3;
  hotScore -= lowSignalHits * 4;

  if (/(openai|google|anthropic|claude|gemini|deepseek)/i.test(title)) hotScore += 8;
  if (/(字节|百度|腾讯|阿里|华为|智谱|月之暗面)/i.test(title)) hotScore += 6;
  if (/(发布|开源|上线|升级|融资|收购|首发|突发)/i.test(title)) hotScore += 5;
  if (/(日报|周报|合集|回顾)/i.test(title)) hotScore -= 10;
  if (hotScore < MIN_HOT_SCORE) return null;

  return {
    ...item,
    hotScore,
    topics: extractTopics(text),
    category: buildCategory(text),
    dedupeKey: buildDedupeKey(item.title, item.content),
  };
}

function applyCrossPlatformBonus(items: RankedItem[]): RankedItem[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.dedupeKey, (counts.get(item.dedupeKey) || 0) + 1);
  }

  return items.map((item) => {
    const occurrences = counts.get(item.dedupeKey) || 1;
    const bonus = occurrences >= 3 ? 10 : occurrences === 2 ? 5 : 0;
    return { ...item, hotScore: item.hotScore + bonus };
  });
}

function dedupeBySignature(items: RankedItem[]): RankedItem[] {
  const map = new Map<string, RankedItem>();
  for (const item of items) {
    const existing = map.get(item.dedupeKey);
    if (!existing || item.hotScore > existing.hotScore) {
      map.set(item.dedupeKey, item);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.hotScore - a.hotScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}

function buildSupplementItems(
  rawItems: RawItem[],
  selectedKeys: Set<string>,
  selectedUrls: Set<string>,
): RankedItem[] {
  const supplements: RankedItem[] = [];

  for (const item of rawItems) {
    const title = sanitizeText(item.title);
    const content = sanitizeText(item.content);
    const text = normalizeText(`${title} ${content}`);
    if (!title || !item.url) continue;
    if (EXCLUDE_WORDS.some((keyword) => normalizeText(title).includes(keyword))) continue;

    const dedupeKey = buildDedupeKey(title, content);
    if (selectedKeys.has(dedupeKey)) continue;
    if (selectedUrls.has(item.url)) continue;

    const source = API_RSS_SOURCES.find((x) => x.name === item.source);
    const base = source ? Math.round(source.priority * 10 * AUTHORITY_WEIGHTS[source.authorityLevel]) : 10;
    const aiHits = ['ai', '人工智能', '大模型', '模型', 'agent', '智能体'].filter((keyword) => text.includes(keyword)).length;
    const entityHits = IMPORTANT_ENTITIES.filter((keyword) => text.includes(keyword)).length;
    const eventHits = HOT_EVENT_WORDS.filter((keyword) => text.includes(keyword)).length;
    const score = base + aiHits * 3 + entityHits * 2 + eventHits * 2;

    supplements.push({
      ...item,
      hotScore: Math.max(MIN_SUPPLEMENT_SCORE, score),
      topics: extractTopics(text),
      category: buildCategory(text),
      dedupeKey,
    });
  }

  return dedupeBySignature(supplements);
}

function getAIConfig(): AIConfig {
  return {
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com',
    model: process.env.AI_MODEL || 'deepseek-chat',
  };
}

async function callAI(prompt: string, config: AIConfig): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 280,
    }),
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeout);
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  return sanitizeText(data.choices[0]?.message?.content || '');
}

async function generateAIResult(item: RankedItem, config: AIConfig): Promise<AIResult> {
  const summaryPrompt = SUMMARY_PROMPT
    .replace('{{title}}', item.title)
    .replace('{{content}}', item.content.slice(0, 500))
    .replace('{{source}}', item.source);

  const topicPrompt = TOPIC_PROMPT
    .replace('{{title}}', item.title)
    .replace('{{content}}', item.content.slice(0, 300));

  try {
    const [summaryResult, topicResult] = await Promise.all([
      callAI(summaryPrompt, config),
      item.topics.length < 2 ? callAI(topicPrompt, config) : Promise.resolve(''),
    ]);

    const aiTopics = topicResult
      .split(/[,，]/)
      .map((x) => sanitizeText(x))
      .filter((x) => x.length >= 2 && x.length <= 12);

    return {
      summary: summaryResult,
      topics: [...item.topics, ...aiTopics].filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 3),
    };
  } catch {
    return {
      summary: '',
      topics: item.topics,
    };
  }
}

async function batchProcessWithAI(items: RankedItem[], config: AIConfig): Promise<Map<string, AIResult>> {
  const result = new Map<string, AIResult>();
  const batchSize = 5;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const outputs = await Promise.all(batch.map(async (item) => ({
      url: item.url,
      value: await generateAIResult(item, config),
    })));

    outputs.forEach((x) => result.set(x.url, x.value));
  }

  return result;
}

function buildFallbackSummary(item: RankedItem, topics: string[]): string {
  const clean = sanitizeText(item.content.replace(/<[^>]+>/g, ' '));
  if (!clean) return `${item.source} 昨日报道：${item.title}。主题聚焦 ${topics.join('、')}。`;
  const snippet = clean.slice(0, 90);
  return `${item.source} 昨日报道：${snippet}${clean.length > 90 ? '...' : ''}`;
}

async function fetchSource(source: SourceConfig): Promise<RawItem[]> {
  if (source.enabled === false) return [];
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items
        .map((item) => {
          const title = sanitizeText((item.title || '').trim());
          const url = resolveItemUrl(item, source.url);
          if (!title || !url) return null;

        return {
          title,
          source: source.name,
          url,
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          content: sanitizeText(resolveContent(item)),
        };
      })
      .filter((item): item is RawItem => Boolean(item))
      .slice(0, SOURCE_FETCH_LIMIT);
  } catch (error) {
    console.error(`[daily-brief] source failed: ${source.name}`, error);
    return [];
  }
}

function toFrontendItem(item: RankedItem, aiResult: AIResult | undefined, index: number): FrontendNewsItem {
  const topics = aiResult?.topics?.length ? aiResult.topics : item.topics;
  const summary =
    aiResult?.summary && aiResult.summary.length >= 20 && aiResult.summary.length <= 180
      ? aiResult.summary
      : buildFallbackSummary(item, topics);

  return {
    id: `${index + 1}`,
    Title: item.title,
    Source: item.source,
    Category: item.category,
    Topics: topics,
    HotScore: item.hotScore,
    Summary: summary,
    PublishAt: formatDateTime(new Date(item.publishedAt)),
    originalUrl: item.url,
  };
}

function buildSummaryBullets(news: FrontendNewsItem[]): string[] {
  if (news.length === 0) {
    return ['昨天没有抓到符合规则的 AI 热点新闻。'];
  }

  const topSources = Array.from(new Set(news.slice(0, 5).map((x) => x.Source))).slice(0, 3);
  const topTopics = Array.from(new Set(news.flatMap((x) => x.Topics))).slice(0, 3);

  return [
    `昨天共筛出 ${news.length} 条高相关 AI 新闻，热点集中在 ${topTopics.join('、')}。`,
    `高频来源主要来自 ${topSources.join('、')}。`,
    '热门内容以模型更新、产品发布和商业化动作为主，政策与安全相关议题保持关注度。',
  ];
}

export async function buildDailyBrief(): Promise<DailyBriefResponse> {
  const rawGroups = await Promise.all(API_RSS_SOURCES.map((source) => fetchSource(source)));
  const rawItems = rawGroups.flat();
  const yesterdayItems = rawItems.filter((item) => isYesterdayInShanghai(item.publishedAt));

  const ranked = yesterdayItems
    .map((item) => {
      const source = API_RSS_SOURCES.find((x) => x.name === item.source);
      return source ? calculateHotScore(item, source) : null;
    })
    .filter((item): item is RankedItem => Boolean(item));

  const primary = dedupeBySignature(applyCrossPlatformBonus(ranked)).slice(0, FINAL_LIMIT);

  let deduped = primary;
  if (primary.length < FINAL_LIMIT) {
    const selectedKeys = new Set(primary.map((x) => x.dedupeKey));
    const selectedUrls = new Set(primary.map((x) => x.url));
    const supplements = buildSupplementItems(yesterdayItems, selectedKeys, selectedUrls);
    deduped = [...primary, ...supplements].slice(0, FINAL_LIMIT);
  }

  const aiConfig = getAIConfig();
  const aiResults =
    aiConfig.apiKey
      ? await batchProcessWithAI(deduped.slice(0, Math.min(5, deduped.length)), aiConfig)
      : new Map<string, AIResult>();

  const news = deduped.map((item, index) => toFrontendItem(item, aiResults.get(item.url), index));
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
