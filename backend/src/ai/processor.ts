// DeepSeek AI 处理模块
// 兼容OpenAI API格式

import { RawNewsItem, NewsItem, ImpactLevel, AudienceType } from '../types';

interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

// AI处理Prompt模板
const PROCESS_PROMPT = `你是一个AI新闻分析助手。请分析以下新闻标题和内容，返回以下信息：

1. **摘要** (Summary): 用简洁的中文(50-100字)概括新闻核心内容
2. **影响力** (Impact): 判断为"高"、"中"、"低"
   - 高: 重大技术突破、重要产品发布、行业重大事件
   - 中: 有价值的进展、值得关注的消息
   - 低: 普通资讯、边缘新闻
3. **目标受众** (Audience): 从以下选项中选择适用的(可多选):
   - 开发者: 技术实现、代码、工具相关
   - 产品经理: 产品策略、用户体验、市场相关
   - 研究者: 学术研究、论文、算法突破相关
   - 投资者: 商业价值、融资、市场机会相关
   - 创业者: 创业机会、商业模式相关
   - 普通爱好者: 普通资讯、科普内容

请以JSON格式返回，格式如下：
{"summary": "...", "impact": "高/中/低", "audience": ["开发者", ...]}

新闻标题: {{title}}
新闻内容: {{content}}
来源: {{source}}`;

// 调用DeepSeek API
async function callAI(prompt: string, config: AIConfig): Promise<string> {
  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // 低温度保证稳定输出
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API错误: ${response.status}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content || '';
}

// 解析AI返回的JSON
function parseAIResponse(response: string): {
  summary: string;
  impact: ImpactLevel;
  audience: AudienceType[];
} {
  try {
    // 尝试直接解析JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || '无法生成摘要',
        impact: (parsed.impact as ImpactLevel) || '中',
        audience: Array.isArray(parsed.audience) ? parsed.audience : ['普通爱好者'],
      };
    }
  } catch {
    // JSON解析失败，返回默认值
  }

  return {
    summary: 'AI分析失败，请手动填写摘要',
    impact: '中',
    audience: ['普通爱好者'],
  };
}

// 处理单条新闻
export async function processNewsItem(
  rawItem: RawNewsItem,
  config: AIConfig
): Promise<NewsItem> {
  const prompt = PROCESS_PROMPT
    .replace('{{title}}', rawItem.title)
    .replace('{{content}}', rawItem.content || rawItem.title)
    .replace('{{source}}', rawItem.source);

  try {
    const aiResponse = await callAI(prompt, config);
    const parsed = parseAIResponse(aiResponse);

    return {
      ...rawItem,
      summary: parsed.summary,
      impact: parsed.impact,
      audience: parsed.audience,
    };
  } catch (error) {
    console.error(`[AI处理] 处理失败: ${rawItem.title}`, error);
    return {
      ...rawItem,
      summary: 'AI处理失败',
      impact: '中',
      audience: ['普通爱好者'],
    };
  }
}

// 批量处理新闻（带进度显示）
export async function processAllNews(
  rawItems: RawNewsItem[],
  config: AIConfig
): Promise<NewsItem[]> {
  console.log(`[AI处理] 开始处理 ${rawItems.length} 条新闻...`);

  const results: NewsItem[] = [];

  // 逐条处理，避免并发过多导致API限流
  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    console.log(`[AI处理] 处理第 ${i + 1}/${rawItems.length} 条: ${item.title.slice(0, 30)}...`);

    const processed = await processNewsItem(item, config);
    results.push(processed);

    // 简单的速率控制：每条处理后等待一小段时间
    if (i < rawItems.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[AI处理] 完成，共处理 ${results.length} 条`);
  return results;
}

// 创建AI配置
export function createAIConfig(): AIConfig {
  return {
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com',
    model: process.env.AI_MODEL || 'deepseek-chat',
  };
}