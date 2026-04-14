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
  clusterKey: string;
}

interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface AIResult {
  summary: string;
  category?: Exclude<FrontendCategory, 'Hot'>;
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
const MIN_SUPPLEMENT_SCORE = 6;
const TARGET_MIN_NEWS = 18;
const CORE_SOURCE_NAMES = new Set([
  '量子位',
  '机器之心',
  '新智元',
  'InfoQ',
  'RadarAI',
  '雷锋网AI',
  '36Kr AI',
]);

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
const CLICKBAIT_WORDS = ['重磅', '震惊', '终于', '刚刚', '大动作', '大消息', '要变天', '彻底', '完全', '颠覆'];
const TITLE_STOP_WORDS = new Set([
  '发布', '宣布', '推出', '上线', '升级', '最新', '回应', '独家', '重磅', '刚刚', '昨日', '今天', 'ai',
  '人工智能', '模型', '大模型', '产品', '商业', '政策', '公司', '平台', '应用', '热点',
]);
const ENTITY_ALIAS_MAP: Record<string, string> = {
  'gpt-4': 'openai',
  'gpt-5': 'openai',
  'chatgpt': 'openai',
  'sora': 'openai',
  'o1': 'openai',
  claude: 'anthropic',
  gemini: 'google',
  deepmind: 'google',
  bard: 'google',
  deepseek: 'deepseek',
  豆包: '字节',
  抖音: '字节',
  火山引擎: '字节',
  文心: '百度',
  文心一言: '百度',
  通义: '阿里',
  通义千问: '阿里',
  kimi: '月之暗面',
  chatglm: '智谱',
  glm: '智谱',
  qwen: '阿里',
};
const EVENT_ALIAS_MAP: Record<string, string> = {
  亮相: '发布',
  登场: '发布',
  推出: '发布',
  问世: '发布',
  官宣: '发布',
  曝光: '首发',
  谍照: '首发',
  震撼: '突发',
  重磅: '突发',
  合并: '收购',
  并购: '收购',
  注资: '融资',
  获投: '融资',
  领投: '融资',
};
const TOP_TIER_ENTITIES = ['openai', 'google', 'anthropic', 'deepseek', 'nvidia'];
const SECOND_TIER_ENTITIES = ['字节', '百度', '腾讯', '阿里', '智谱', '月之暗面', '微软', 'meta', 'apple'];

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

const VALID_CATEGORIES: Array<Exclude<FrontendCategory, 'Hot'>> = ['模型', '产品', '政策', '商业'];

const COMBINED_AI_PROMPT = `你是 AI 科技新闻编辑。请基于新闻标题和内容输出 JSON（不要输出 markdown 代码块）。
返回格式必须是：
{"summary":"...","category":"模型|产品|政策|商业","topics":["标签1","标签2","标签3"]}

要求：
1) summary：60-100 字中文，只保留关键事实，不做主观评价。
2) category：只能是 模型/产品/政策/商业 其中一个。
3) topics：1-3 个主题标签，优先从这组选择：LLM、Agent、多模态、开源、融资、推理、AI 产品、模型发布、AI 芯片、自动驾驶、机器人、AI 应用、AI 安全、政策监管、RAG、算力、OpenAI、Google、Anthropic、DeepSeek、字节跳动、智谱AI、月之暗面。
4) 如没有合适标签，可补充 1 个短标签（2-12 字）。

标题：{{title}}
内容：{{content}}
来源：{{source}}`;

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

function tokenizeForSimilarity(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !TITLE_STOP_WORDS.has(token));
}

function normalizeEntities(text: string): string[] {
  const normalized = normalizeText(text);
  const entities = new Set<string>();

  for (const [alias, canonical] of Object.entries(ENTITY_ALIAS_MAP)) {
    if (normalized.includes(alias.toLowerCase())) {
      entities.add(canonical);
    }
  }

  for (const entity of IMPORTANT_ENTITIES) {
    if (normalized.includes(entity.toLowerCase())) {
      entities.add(entity);
    }
  }

  return Array.from(entities);
}

function normalizeEvents(text: string): string[] {
  const normalized = normalizeText(text);
  const events = new Set<string>();

  for (const [alias, canonical] of Object.entries(EVENT_ALIAS_MAP)) {
    if (normalized.includes(alias.toLowerCase())) {
      events.add(canonical);
    }
  }

  for (const event of HOT_EVENT_WORDS) {
    if (normalized.includes(event.toLowerCase())) {
      events.add(event);
    }
  }

  return Array.from(events);
}

function getEntityWeight(entity: string): number {
  if (TOP_TIER_ENTITIES.includes(entity.toLowerCase())) return 12;
  if (SECOND_TIER_ENTITIES.includes(entity)) return 8;
  return 5;
}

function detectClickbait(title: string, content: string): number {
  const titleNormalized = normalizeText(title);
  const clickbaitHits = CLICKBAIT_WORDS.filter((keyword) => titleNormalized.includes(keyword)).length;
  const isThinContent = sanitizeText(content).length < 200;

  if (clickbaitHits >= 2 && isThinContent) return -15;
  if (clickbaitHits >= 1 && isThinContent) return -8;
  if (clickbaitHits >= 3) return -5;
  return 0;
}

function getContentDensityBonus(content: string): number {
  const length = sanitizeText(content).length;
  if (length >= 1500) return 5;
  if (length >= 800) return 3;
  return 0;
}

function overlapScore(leftTokens: string[], rightTokens: string[]): number {
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;

  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  let same = 0;

  for (const token of left) {
    if (right.has(token)) same += 1;
  }

  return same / Math.max(left.size, right.size);
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

function buildClusterKey(title: string, content: string): string {
  const text = `${title} ${content}`;
  const entities = normalizeEntities(text).sort().slice(0, 2).join('|');
  const events = normalizeEvents(text).sort().slice(0, 2).join('|');
  const titleTokens = tokenizeForSimilarity(title).slice(0, 4).join('|');
  return [entities, events, titleTokens].filter(Boolean).join('||') || normalizeText(title).slice(0, 72);
}

function buildDedupeKey(title: string, content: string): string {
  const titleTokens = tokenizeForSimilarity(title).slice(0, 8).join('|');
  const entities = normalizeEntities(`${title} ${content}`).sort().slice(0, 2).join('|');
  const contentTokens = tokenizeForSimilarity(content).slice(0, 6).join('|');
  return [entities, titleTokens, contentTokens].filter(Boolean).join('||') || normalizeText(title).slice(0, 96);
}

function areLikelyDuplicates(left: RankedItem, right: RankedItem): boolean {
  if (left.url === right.url) return true;
  if (left.dedupeKey === right.dedupeKey) return true;
  if (left.clusterKey !== right.clusterKey) return false;

  const leftTitleTokens = tokenizeForSimilarity(left.title);
  const rightTitleTokens = tokenizeForSimilarity(right.title);
  const leftContentTokens = tokenizeForSimilarity(left.content).slice(0, 20);
  const rightContentTokens = tokenizeForSimilarity(right.content).slice(0, 20);

  const titleOverlap = overlapScore(leftTitleTokens, rightTitleTokens);
  const contentOverlap = overlapScore(leftContentTokens, rightContentTokens);

  return titleOverlap >= 0.55 || (titleOverlap >= 0.4 && contentOverlap >= 0.35);
}

function calculateHotScore(item: RawItem, source: SourceConfig): RankedItem | null {
  const title = sanitizeText(item.title);
  const content = sanitizeText(item.content);
  const text = normalizeText(`${title} ${content}`);
  const titleNormalized = normalizeText(title);
  if (!text) return null;
  if (EXCLUDE_WORDS.some((keyword) => titleNormalized.includes(keyword))) return null;
  const isCoreSource = CORE_SOURCE_NAMES.has(source.name);

  const entities = normalizeEntities(text);
  const events = normalizeEvents(text);
  const entityHits = entities.length;
  const eventHits = events.length;
  const aiHits = ['ai', '人工智能', '大模型', '模型', 'agent', '智能体'].filter((keyword) => text.includes(keyword)).length;
  const lowSignalHits = LOW_SIGNAL_WORDS.filter((keyword) => text.includes(keyword)).length;
  if (entityHits === 0 && eventHits === 0 && aiHits === 0) return null;

  if (!isCoreSource) {
    if (aiHits === 0) return null;
    if (entityHits + eventHits + aiHits < 2) return null;
  }

  const authorityWeight = AUTHORITY_WEIGHTS[source.authorityLevel];
  let hotScore = Math.round(source.priority * 10 * authorityWeight);
  entities.forEach((entity) => {
    hotScore += getEntityWeight(entity);
  });
  hotScore += eventHits * 5;
  hotScore += aiHits * 3;
  hotScore -= lowSignalHits * 5;

  if (/(openai|google|anthropic|claude|gemini|deepseek)/i.test(title)) hotScore += 8;
  if (/(字节|百度|腾讯|阿里|华为|智谱|月之暗面)/i.test(title)) hotScore += 6;
  if (/(发布|开源|上线|升级|融资|收购|首发|突发)/i.test(title)) hotScore += 5;
  if (/(日报|周报|合集|回顾)/i.test(title)) hotScore -= 10;
  hotScore += detectClickbait(title, content);
  hotScore += getContentDensityBonus(content);
  if (hotScore < MIN_HOT_SCORE) return null;

  return {
    ...item,
    hotScore,
    topics: extractTopics(text),
    category: buildCategory(text),
    dedupeKey: buildDedupeKey(title, content),
    clusterKey: buildClusterKey(title, content),
  };
}

function applyCrossPlatformBonus(items: RankedItem[]): RankedItem[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.clusterKey, (counts.get(item.clusterKey) || 0) + 1);
  }

  return items.map((item) => {
    const occurrences = counts.get(item.clusterKey) || 1;
    const bonus = occurrences >= 3 ? 10 : occurrences === 2 ? 5 : 0;
    return { ...item, hotScore: item.hotScore + bonus };
  });
}

function dedupeBySignature(items: RankedItem[]): RankedItem[] {
  const sorted = [...items].sort(
    (a, b) => b.hotScore - a.hotScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  const deduped: RankedItem[] = [];

  for (const item of sorted) {
    const duplicateIndex = deduped.findIndex((existing) => areLikelyDuplicates(existing, item));
    if (duplicateIndex === -1) {
      deduped.push(item);
      continue;
    }

    if (item.hotScore > deduped[duplicateIndex].hotScore) {
      deduped[duplicateIndex] = item;
    }
  }

  return deduped.sort((a, b) => b.hotScore - a.hotScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
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
    const isCoreSource = source ? CORE_SOURCE_NAMES.has(source.name) : false;
    const base = source ? Math.round(source.priority * 10 * AUTHORITY_WEIGHTS[source.authorityLevel]) : 10;
    const aiHits = ['ai', '人工智能', '大模型', '模型', 'agent', '智能体'].filter((keyword) => text.includes(keyword)).length;
    const entities = normalizeEntities(text);
    const events = normalizeEvents(text);
    const entityHits = entities.length;
    const eventHits = events.length;
    if (!isCoreSource) {
      const titleHasAICue = /(ai|人工智能|大模型|模型|agent|智能体|openai|claude|gemini|deepseek|qwen|glm)/i.test(title);
      if (aiHits === 0 && entityHits === 0 && !titleHasAICue) continue;
      if (entityHits + eventHits + aiHits < 1 && !titleHasAICue) continue;
    }
    const score =
      base +
      aiHits * 3 +
      entities.reduce((sum, entity) => sum + Math.max(3, getEntityWeight(entity) - 4), 0) +
      eventHits * 2 +
      getContentDensityBonus(content) +
      detectClickbait(title, content);

    if (score < MIN_SUPPLEMENT_SCORE) continue;

    supplements.push({
      ...item,
      hotScore: score,
      topics: extractTopics(text),
      category: buildCategory(text),
      dedupeKey,
      clusterKey: buildClusterKey(title, content),
    });
  }

  return dedupeBySignature(supplements);
}

function buildLooseSupplementItems(
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

    const dedupeKey = buildDedupeKey(title, content);
    if (selectedKeys.has(dedupeKey) || selectedUrls.has(item.url)) continue;
    if (EXCLUDE_WORDS.some((keyword) => normalizeText(title).includes(keyword))) continue;

    const source = API_RSS_SOURCES.find((x) => x.name === item.source);
    const base = source ? Math.round(source.priority * 10 * AUTHORITY_WEIGHTS[source.authorityLevel]) : 10;
    const aiHits = ['ai', '人工智能', '大模型', '模型', 'agent', '智能体'].filter((keyword) => text.includes(keyword)).length;
    const entities = normalizeEntities(text);
    const events = normalizeEvents(text);
    const titleHasAICue = /(ai|人工智能|大模型|模型|agent|智能体|openai|claude|gemini|deepseek|qwen|glm|字节|百度|腾讯|阿里)/i.test(title);

    if (aiHits === 0 && entities.length === 0 && !titleHasAICue) continue;

    const score =
      base +
      aiHits * 2 +
      entities.reduce((sum, entity) => sum + Math.max(2, getEntityWeight(entity) - 6), 0) +
      events.length * 2 +
      getContentDensityBonus(content) +
      detectClickbait(title, content);

    supplements.push({
      ...item,
      hotScore: Math.max(MIN_SUPPLEMENT_SCORE, score),
      topics: extractTopics(text),
      category: buildCategory(text),
      dedupeKey,
      clusterKey: buildClusterKey(title, content),
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
      max_tokens: 360,
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

function parseAIJsonResult(raw: string): {
  summary: string;
  category?: Exclude<FrontendCategory, 'Hot'>;
  topics: string[];
} {
  const cleaned = raw
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      summary?: string;
      category?: string;
      topics?: string[];
    };

    const summary = sanitizeText(parsed.summary || '');
    const topics = Array.isArray(parsed.topics)
      ? parsed.topics
          .map((x) => sanitizeText(String(x)))
          .filter((x) => x.length >= 2 && x.length <= 12)
          .slice(0, 3)
      : [];
    const category = VALID_CATEGORIES.find((c) => (parsed.category || '').includes(c));

    return { summary, category, topics };
  } catch {
    return { summary: '', topics: [] };
  }
}

async function generateAIResult(item: RankedItem, config: AIConfig): Promise<AIResult> {
  const prompt = COMBINED_AI_PROMPT
    .replace('{{title}}', item.title)
    .replace('{{content}}', item.content.slice(0, 500))
    .replace('{{source}}', item.source);

  try {
    const raw = await callAI(prompt, config);
    const parsed = parseAIJsonResult(raw);

    return {
      summary: parsed.summary,
      category: parsed.category,
      topics: [...item.topics, ...parsed.topics].filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 3),
    };
  } catch {
    return {
      summary: '',
      category: undefined,
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

function toDisplayHotScore(raw: number, rankIndex: number): number {
  const scaled = Math.round(raw * 1.6 + 28);
  const rankBonus = Math.max(0, 8 - rankIndex);
  return Math.max(58, Math.min(99, scaled + rankBonus));
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
  const category = aiResult?.category && VALID_CATEGORIES.includes(aiResult.category) ? aiResult.category : item.category;
  const summary =
    aiResult?.summary && aiResult.summary.length >= 20 && aiResult.summary.length <= 180
      ? aiResult.summary
      : buildFallbackSummary(item, topics);

  return {
    id: `${index + 1}`,
    Title: item.title,
    Source: item.source,
    Category: category,
    Topics: topics,
    HotScore: toDisplayHotScore(item.hotScore, index),
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

    if (deduped.length < TARGET_MIN_NEWS) {
      const secondSelectedKeys = new Set(deduped.map((x) => x.dedupeKey));
      const secondSelectedUrls = new Set(deduped.map((x) => x.url));
      const looseSupplements = buildLooseSupplementItems(yesterdayItems, secondSelectedKeys, secondSelectedUrls);
      deduped = dedupeBySignature([...deduped, ...looseSupplements]).slice(0, FINAL_LIMIT);
    }
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
