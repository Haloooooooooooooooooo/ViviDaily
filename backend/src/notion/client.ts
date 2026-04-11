// Notion 数据库写入模块

import { Client } from '@notionhq/client';
import { NewsItem } from '../types';

interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

// 转换日期格式为ISO 8601
function toISODate(dateStr: string): string {
  // 如果已经是ISO格式，直接返回
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return dateStr;
  }

  // 尝试解析各种日期格式
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // 解析失败
  }

  // 默认返回当前时间
  return new Date().toISOString();
}

// 创建Notion客户端
export function createNotionClient(config: NotionConfig): Client {
  return new Client({ auth: config.apiKey });
}

// 写入单条新闻到Notion
export async function writeToNotion(
  notion: Client,
  databaseId: string,
  item: NewsItem
): Promise<boolean> {
  try {
    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        // 标题字段 (注意字段名有空格)
        "Title ": {
          title: [
            {
              text: { content: item.title },
            },
          ],
        },
        // 来源字段 (注意字段名有空格)
        "Source ": {
          select: { name: item.source },
        },
        // URL字段
        URL: {
          url: item.url,
        },
        // 发布时间
        PublishAt: {
          date: { start: toISODate(item.publishedAt) },
        },
        // 摘要
        Summary: {
          rich_text: [
            {
              text: { content: item.summary },
            },
          ],
        },
        // 影响力 (rich_text类型)
        Impact: {
          rich_text: [
            {
              text: { content: item.impact },
            },
          ],
        },
        // 目标受众 (rich_text类型)
        Audience: {
          rich_text: [
            {
              text: { content: item.audience.join(', ') },
            },
          ],
        },
      },
    });

    console.log(`[Notion] 写入成功: ${item.title.slice(0, 30)}...`);
    return true;
  } catch (error) {
    console.error(`[Notion] 写入失败: ${item.title}`, error);
    return false;
  }
}

// 批量写入到Notion
export async function writeAllToNotion(
  items: NewsItem[],
  config: NotionConfig
): Promise<number> {
  console.log(`[Notion] 开始写入 ${items.length} 条新闻...`);

  const notion = createNotionClient(config);
  let successCount = 0;

  for (const item of items) {
    const success = await writeToNotion(notion, config.databaseId, item);
    if (success) successCount++;

    // Notion API有速率限制
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`[Notion] 完成，成功 ${successCount}/${items.length} 条`);
  return successCount;
}

// 创建Notion配置
export function createNotionConfig(): NotionConfig {
  return {
    apiKey: process.env.NOTION_API_KEY || '',
    databaseId: process.env.NOTION_DATABASE_ID || '',
  };
}

// 验证数据库字段是否存在（辅助调试）
export async function verifyDatabaseSchema(
  notion: Client,
  databaseId: string
): Promise<void> {
  const database = await notion.databases.retrieve({ database_id: databaseId });

  console.log('[Notion] 数据库字段:');
  for (const [name, prop] of Object.entries(database.properties)) {
    console.log(`  - ${name}: ${prop.type}`);
  }
}