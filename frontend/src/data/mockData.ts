import { Box, Brain, Briefcase, Flame, ShieldCheck } from 'lucide-react';
import type { Category, NewsItem } from '../types/news';

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

export const INITIAL_NEWS_DATA: NewsItem[] = [
  {
    id: '1',
    Title: 'OpenAI 发布新一轮模型与产品更新，Agent 能力成为行业关注焦点',
    Source: 'InfoQ',
    Category: '模型',
    Topics: ['LLM', 'Agent'],
    HotScore: 95,
    Summary: '围绕 OpenAI 最新模型能力、工具调用与 Agent 化工作流的讨论在多家媒体集中出现，成为当天最具代表性的模型热点之一。',
    PublishAt: '2026-04-10 20:10',
    isBookmarked: false,
  },
  {
    id: '2',
    Title: 'Google 持续加码 AI 产品矩阵，搜索、办公与多模态协同再度升温',
    Source: '36氪',
    Category: '商业',
    Topics: ['AI产品', '多模态'],
    HotScore: 90,
    Summary: 'Google 相关 AI 动态在当天保持高讨论度，热点集中在产品化推进、入口级应用整合与商业化落地节奏上。',
    PublishAt: '2026-04-10 18:40',
    isBookmarked: false,
  },
  {
    id: '3',
    Title: 'Claude 与 Agent 工作流持续升温，开发者更关注可执行性与稳定性',
    Source: '雷锋网 AI',
    Category: '产品',
    Topics: ['Agent', 'AI应用'],
    HotScore: 88,
    Summary: '围绕 Claude 的最新实践文章和行业解读明显增多，焦点从模型能力本身转向 Agent 场景、流程编排和真实可用性。',
    PublishAt: '2026-04-10 17:55',
    isBookmarked: false,
  },
  {
    id: '4',
    Title: 'GLM 相关模型进展与应用落地被集中讨论，国产大模型保持高热度',
    Source: '量子位',
    Category: '模型',
    Topics: ['模型发布', 'AI应用'],
    HotScore: 84,
    Summary: 'GLM 相关内容在中文 AI 媒体中有持续讨论热度，关注点主要落在模型进展、生态动作和具体应用场景表现。',
    PublishAt: '2026-04-10 16:20',
    isBookmarked: false,
  },
  {
    id: '5',
    Title: 'AI 手机与终端入口继续升温，消费级产品形态成为讨论重点',
    Source: '爱范儿',
    Category: '产品',
    Topics: ['AI产品', 'AI应用'],
    HotScore: 81,
    Summary: '从 AI 手机到智能硬件，消费级入口的产品化竞争持续升温，用户体验与场景闭环正在取代单纯参数对比。',
    PublishAt: '2026-04-10 14:35',
    isBookmarked: false,
  },
  {
    id: '6',
    Title: '政策与监管信号持续增加，生成式 AI 合规边界再次成为焦点',
    Source: 'IT之家',
    Category: '政策',
    Topics: ['政策监管', 'AI安全'],
    HotScore: 79,
    Summary: '从海内外政策动态到平台治理要求，关于生成式 AI 合规、透明度与内容安全的消息密度明显上升。',
    PublishAt: '2026-04-10 12:25',
    isBookmarked: false,
  },
  {
    id: '7',
    Title: '开源模型与轻量化部署继续活跃，小模型实用价值被重新评估',
    Source: 'RadarAI',
    Category: '产品',
    Topics: ['开源', '推理'],
    HotScore: 77,
    Summary: '当天不少热议内容都与开源模型、低成本部署和工程效率相关，说明市场关注点正在从“更大”转向“更可用”。',
    PublishAt: '2026-04-10 10:50',
    isBookmarked: false,
  },
  {
    id: '8',
    Title: '机器人、自动驾驶与具身智能仍有稳定热度，但未压过模型主线',
    Source: '雷锋网 研究社',
    Category: '政策',
    Topics: ['机器人', '自动驾驶'],
    HotScore: 72,
    Summary: '机器人与自动驾驶相关动态依旧能进入热点池，但当天整体热度仍明显集中在大模型更新、Agent 和产品落地上。',
    PublishAt: '2026-04-10 09:15',
    isBookmarked: false,
  },
];

export const TOP5_DATA = [
  { rank: '01', title: 'OpenAI Agent 能力成当天最热模型话题', hotScore: 95, category: '模型', newsId: '1' },
  { rank: '02', title: 'Google AI 产品矩阵再成商业焦点', hotScore: 90, category: '商业', newsId: '2' },
  { rank: '03', title: 'Claude 工作流讨论升温，开发者热度明显上升', hotScore: 88, category: '产品', newsId: '3' },
  { rank: '04', title: 'GLM 生态进展维持国产模型讨论热度', hotScore: 84, category: '模型', newsId: '4' },
  { rank: '05', title: 'AI 手机与消费级入口竞争持续升温', hotScore: 81, category: '产品', newsId: '5' },
];

export const AI_SUMMARY = [
  '当天热点明显集中在 OpenAI、Google、Claude、GLM 等核心模型与产品动态，模型更新仍是流量中心。',
  '第二层热点来自 Agent 工作流、AI 产品入口和消费级落地，说明用户更关注“怎么用起来”。',
  '政策监管、开源部署、机器人等方向仍有讨论度，但在整体热度上弱于大模型主线。',
];
