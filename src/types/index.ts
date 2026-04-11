export const CURRENT_SOURCE_TYPES = [
  '量子位',
  '机器之心',
  '新智元',
  'RadarAI',
  '雷锋网 AI',
  '雷锋网 研究社',
  'IT之家',
  '极客公园',
  '爱范儿',
  '36氪',
  'InfoQ',
  '掘金',
  '阿里云开发者社区',
  '百度 AI 开发者社区',
  '腾讯研究院',
  '阿里研究院',
  'cnBeta',
] as const;

export const LEGACY_SOURCE_TYPES = [
  '虎嗅',
  'TLDR AI',
  'VentureBeat AI',
  'MIT Tech Review',
  'InfoQ AI',
  'Hacker News',
  "Lenny's Newsletter",
] as const;

export type SourceType =
  | (typeof CURRENT_SOURCE_TYPES)[number]
  | (typeof LEGACY_SOURCE_TYPES)[number];

export type ImpactLevel = '高' | '中' | '低';

export type AudienceType =
  | '开发者'
  | '产品经理'
  | '研究者'
  | '投资者'
  | '创业者'
  | '普通爱好者';

export interface RawNewsItem {
  title: string;
  source: SourceType;
  url: string;
  publishedAt: string;
  content?: string;
}

export interface RankedRawNewsItem extends RawNewsItem {
  hotScore: number;
  matchedKeywords: string[];
  eventSignature?: string;
}

export interface NewsItem extends RawNewsItem {
  summary: string;
  impact: ImpactLevel;
  audience: AudienceType[];
}

export const AI_STRONG_KEYWORDS = [
  'ai',
  'aigc',
  'agi',
  'agent',
  'rag',
  'llm',
  'gpt',
  'copilot',
  'chatgpt',
  'claude',
  'gemini',
  'glm',
  'kimi',
  'qwen',
  'deepseek',
  'ernie',
  '通义',
  '文心',
  '豆包',
  '元宝',
  '混元',
  '人工智能',
  '生成式ai',
  '生成式',
  '大模型',
  '多模态',
  '语言模型',
  '机器学习',
  '深度学习',
  '智能体',
  '自动驾驶',
  '算力',
  '模型',
] as const;

export const HOT_ENTITY_KEYWORDS = [
  'google',
  '谷歌',
  'alphabet',
  'openai',
  'anthropic',
  'microsoft',
  '微软',
  'meta',
  'amazon',
  'aws',
  'nvidia',
  '英伟达',
  'tesla',
  'xai',
  '苹果',
  'apple',
  '阿里',
  '阿里云',
  '腾讯',
  '百度',
  '字节',
  '字节跳动',
  '华为',
  '智谱',
  '月之暗面',
  'deepseek',
  'openai',
  'claude',
  'gemini',
  'glm',
  'gpt-4',
  'gpt-4.1',
  'gpt-4o',
  'gpt-5',
  'qwen',
  'kimi',
  '豆包',
  '文心',
  '混元',
  '元宝',
  'llama',
  'mistral',
  'sora',
  'cursor',
  'manus',
] as const;

export const HOT_EVENT_KEYWORDS = [
  '发布',
  '开源',
  '上线',
  '推出',
  '更新',
  '升级',
  '发布会',
  '融资',
  '收购',
  '合作',
  '入局',
  '首发',
  '登顶',
  '突破',
  '刷榜',
  '夺冠',
  '落地',
  '商用',
  '量产',
  '裁员',
  '禁用',
  '停用',
  '论文',
  'benchmark',
  'agent',
  '推理',
  '多模态',
  '端侧',
  '芯片',
  '算力',
  '自动驾驶',
] as const;

export const EXCLUDE_KEYWORDS = [
  '招聘',
  '求职',
  '课程',
  '培训',
  '讲座',
  '直播',
  '活动预告',
  '视频',
  '播客',
  'podcast',
  'newsletter',
  '周报',
  '周刊',
  '电视剧',
  '电影',
  '综艺',
  '音乐',
  '旅游',
  '美食',
  '酒店',
  '游戏评测',
] as const;

export const AI_KEYWORDS = AI_STRONG_KEYWORDS;

export const DIGEST_KEYWORDS = [
  '早报',
  '晚报',
  '日报',
  '周报',
  '周刊',
  '月报',
  '简报',
  '汇总',
  '合集',
  '盘点',
  '回顾',
  '观察',
  '快讯',
  '播报',
  '导读',
  '精选',
  '速览',
  '值得买',
] as const;

export const LOW_SIGNAL_KEYWORDS = [
  '股票',
  '股价',
  '美股',
  '港股',
  '研报',
  '财报',
  '开箱',
  '评测',
  '上手',
  '体验',
  '参数',
  '售价',
  '发售',
] as const;
