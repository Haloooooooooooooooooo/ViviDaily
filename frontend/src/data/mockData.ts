import { Box, Brain, Briefcase, Flame, ShieldCheck } from 'lucide-react';
import type { Category, DailyBrief, NewsItem } from '../types/news';

export const FEED_CATEGORIES: Array<{
  id: Category;
  label: string;
  icon: typeof Flame;
}> = [
  { id: 'Hot', label: 'Hot', icon: Flame },
  { id: '商业', label: '商业', icon: Briefcase },
  { id: '模型', label: '模型', icon: Brain },
  { id: '产品', label: '产品', icon: Box },
  { id: '政策', label: '政策', icon: ShieldCheck },
];

const NEWS_ITEMS: NewsItem[] = [
  {
    id: '1',
    Title: 'OpenAI 发布新一轮模型与产品更新，Agent 能力成为行业关注焦点',
    Source: 'OpenAI News',
    Category: '模型',
    Topics: ['LLM', 'Agent', '模型发布'],
    HotScore: 95,
    Summary:
      'OpenAI 围绕模型能力、工具调用与 Agent 工作流的更新成为昨日最强热点，讨论集中在可执行性、推理效率与开发者工作方式变化上。',
    PublishAt: '2026-04-11 22:10',
    isBookmarked: false,
    originalUrl: 'https://openai.com/news/rss.xml',
  },
  {
    id: '2',
    Title: 'Google 持续加码 AI 产品矩阵，搜索、办公与多模态协同再次升温',
    Source: 'InfoQ',
    Category: '商业',
    Topics: ['Google', '多模态', 'AI 产品'],
    HotScore: 92,
    Summary:
      'Google 相关 AI 动态在多家媒体同步出现，热点集中在产品整合速度、入口级场景布局以及与生成式工作流结合带来的商业化空间。',
    PublishAt: '2026-04-11 20:45',
    isBookmarked: false,
    originalUrl: 'https://www.infoq.cn/feed',
  },
  {
    id: '3',
    Title: 'Claude 与 Agent 工作流持续升温，开发者更关注真实可用性与稳定性',
    Source: '雷锋网 AI',
    Category: '产品',
    Topics: ['Claude', 'Agent', 'AI 应用'],
    HotScore: 89,
    Summary:
      '围绕 Claude 的相关新闻和解读明显增多，关注点从模型能力本身延伸到工作流编排、长任务执行与团队实际落地效果。',
    PublishAt: '2026-04-11 19:20',
    isBookmarked: false,
    originalUrl: 'https://www.leiphone.com/feed/categoryRss/name/aijuejinzhi',
  },
  {
    id: '4',
    Title: 'GLM 相关模型进展与应用落地被集中讨论，国产大模型维持高热度',
    Source: '量子位',
    Category: '模型',
    Topics: ['GLM', '国产模型', 'AI 应用'],
    HotScore: 86,
    Summary:
      'GLM 相关内容在中文 AI 媒体中持续保持曝光，讨论重点落在模型能力提升、生态动作以及实际业务接入表现。',
    PublishAt: '2026-04-11 18:05',
    isBookmarked: false,
    originalUrl: 'https://www.qbitai.com/feed',
  },
  {
    id: '5',
    Title: 'AI 手机与终端入口继续升温，消费级产品形态成为讨论重点',
    Source: '爱范儿',
    Category: '产品',
    Topics: ['AI 产品', '终端', '消费硬件'],
    HotScore: 82,
    Summary:
      '从 AI 手机到智能硬件，消费级入口的竞争继续升温，用户体验与使用闭环开始比单纯参数更加重要。',
    PublishAt: '2026-04-11 16:40',
    isBookmarked: false,
    originalUrl: 'https://www.ifanr.com/feed',
  },
  {
    id: '6',
    Title: '政策与监管信号持续增加，生成式 AI 合规边界再次成为焦点',
    Source: 'IT 之家',
    Category: '政策',
    Topics: ['政策监管', 'AI 安全'],
    HotScore: 79,
    Summary:
      '从平台治理到监管口径，关于生成式 AI 的透明度、内容安全与责任划分的讨论明显增加，成为昨日稳定的次级热点。',
    PublishAt: '2026-04-11 15:15',
    isBookmarked: false,
    originalUrl: 'https://www.ithome.com/rss',
  },
  {
    id: '7',
    Title: '开源模型与轻量化部署保持活跃，小模型实用价值被重新评估',
    Source: 'RadarAI',
    Category: '产品',
    Topics: ['开源', '推理', '边缘部署'],
    HotScore: 77,
    Summary:
      '不少热议内容都围绕开源模型、低成本部署和工程效率展开，说明市场关注点正在从“更大”逐渐转向“更可用”。',
    PublishAt: '2026-04-11 13:50',
    isBookmarked: false,
    originalUrl: 'https://radarai.top/feed.xml',
  },
  {
    id: '8',
    Title: '36Kr 聚焦 AI 创业与应用落地，商业化节奏成为投资讨论主线',
    Source: '36Kr',
    Category: '商业',
    Topics: ['融资', 'AI 应用', '创业'],
    HotScore: 75,
    Summary:
      '36Kr 的相关报道更多从公司动作、融资节奏与商业落地角度切入，为模型热点提供了更偏产业侧的补充视角。',
    PublishAt: '2026-04-11 12:30',
    isBookmarked: false,
    originalUrl: 'https://36kr.com/feed',
  },
];

export const DAILY_BRIEF: DailyBrief = {
  news: NEWS_ITEMS,
  top5: [
    { rank: '01', title: 'OpenAI Agent 能力成为昨日最热模型话题', hotScore: 95, category: '模型', newsId: '1' },
    { rank: '02', title: 'Google AI 产品矩阵再成商业焦点', hotScore: 92, category: '商业', newsId: '2' },
    { rank: '03', title: 'Claude 工作流热度继续上升', hotScore: 89, category: '产品', newsId: '3' },
    { rank: '04', title: 'GLM 生态进展维持国产模型关注度', hotScore: 86, category: '模型', newsId: '4' },
    { rank: '05', title: 'AI 终端与消费入口竞争继续升温', hotScore: 82, category: '产品', newsId: '5' },
  ],
  summary: [
    '昨日热点明显集中在 OpenAI、Google、Claude、GLM 等核心公司与模型动态，模型更新仍然是流量中心。',
    '第二层热点来自 Agent 工作流、AI 产品入口和消费级落地，说明用户越来越关心“怎么真正用起来”。',
    '政策监管、开源部署与创业融资保持稳定讨论度，但整体热度仍弱于大模型主线。',
  ],
};
