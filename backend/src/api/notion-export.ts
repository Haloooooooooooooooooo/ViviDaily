import { APIResponseError, Client } from '@notionhq/client';
import type { DailyBriefResponse, FrontendNewsItem } from './types';

interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

export interface ExportResult {
  ok: boolean;
  message: string;
  duplicate?: boolean;
}

export class NotionExportError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'NotionExportError';
    this.status = status;
  }
}

const RECENT_EXPORT_SIGNATURES = new Map<string, number>();
const RECENT_TTL_MS = 1000 * 60 * 60;
const REQUIRED_NOTION_SCHEMA = {
  Title: 'title',
  URL: 'url',
  Source: 'select',
  Category: 'select',
  Topics: 'multi_select',
  HotScore: 'number',
  Summary: 'rich_text',
  PublishAt: 'date',
} as const;

type RequiredSchemaKey = keyof typeof REQUIRED_NOTION_SCHEMA;
type NotionDbSchema = Record<string, { type: string }>;

function getNotionConfig(): NotionConfig {
  return {
    apiKey: process.env.NOTION_API_KEY || '',
    databaseId: process.env.NOTION_DATABASE_ID || '',
  };
}

function normalizeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function ensureValidUrl(value: string) {
  if (!value || !value.trim()) {
    throw new NotionExportError('导出失败：URL 不能为空。', 400);
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new NotionExportError('导出失败：URL 必须是 http 或 https。', 400);
    }
  } catch (error) {
    if (error instanceof NotionExportError) {
      throw error;
    }
    throw new NotionExportError('导出失败：URL 格式不合法。', 400);
  }
}

function hasSuspiciousGarbledText(value: string): boolean {
  if (!value) return false;
  if (value.includes('�')) return true;
  if (/\?{2,}/.test(value)) return true;

  const suspiciousFragments = [
    '鍟',
    '妯',
    '浜у',
    '鏀跨',
    '銆',
    '锛',
    '鈥',
    '闆烽',
    '鏈哄櫒',
    '鐖辫',
    '鏂版櫤',
  ];

  return suspiciousFragments.some((fragment) => value.includes(fragment));
}

function ensureTextHealth(item: FrontendNewsItem) {
  const fields: Array<{ name: string; value: string }> = [
    { name: 'Title', value: item.Title },
    { name: 'Source', value: item.Source },
    { name: 'Category', value: item.Category },
    { name: 'Summary', value: item.Summary },
    { name: 'PublishAt', value: item.PublishAt },
    { name: 'Topics', value: item.Topics.join(' ') },
  ];

  for (const field of fields) {
    if (hasSuspiciousGarbledText(field.value)) {
      throw new NotionExportError(
        `导出失败：字段 ${field.name} 存在疑似乱码，请刷新新闻后重试。`,
        400,
      );
    }
  }
}

function buildDuplicateSignature(item: FrontendNewsItem): string {
  const urlPart = item.originalUrl.trim().toLowerCase();
  const titlePart = item.Title.trim().toLowerCase();
  const publishPart = item.PublishAt.trim();
  return `${urlPart}::${titlePart}::${publishPart}`;
}

function hasRecentDuplicate(signature: string): boolean {
  const now = Date.now();
  for (const [key, ts] of RECENT_EXPORT_SIGNATURES.entries()) {
    if (now - ts > RECENT_TTL_MS) {
      RECENT_EXPORT_SIGNATURES.delete(key);
    }
  }
  return RECENT_EXPORT_SIGNATURES.has(signature);
}

function markRecentExport(signature: string): void {
  RECENT_EXPORT_SIGNATURES.set(signature, Date.now());
}

function asTitle(text: string) {
  return {
    title: [{ text: { content: text } }],
  };
}

function asRichText(text: string) {
  return {
    rich_text: [{ text: { content: text } }],
  };
}

function asSelect(text: string) {
  return {
    select: { name: text },
  };
}

function asMultiSelect(items: string[]) {
  return {
    multi_select: items.map((item) => ({ name: item })),
  };
}

function asNumber(value: number) {
  return {
    number: value,
  };
}

function asDate(value: string) {
  return {
    date: { start: normalizeDate(value) },
  };
}

function asUrl(value: string) {
  return {
    url: value,
  };
}

function ensureRequiredConfig(config: NotionConfig) {
  if (!config.apiKey) {
    throw new NotionExportError('缺少 NOTION_API_KEY，请先配置环境变量。', 500);
  }

  if (!config.databaseId) {
    throw new NotionExportError('缺少 NOTION_DATABASE_ID，请先配置环境变量。', 500);
  }
}

function ensureStrictSchema(schema: NotionDbSchema) {
  const requiredFields = Object.entries(REQUIRED_NOTION_SCHEMA) as Array<
    [RequiredSchemaKey, (typeof REQUIRED_NOTION_SCHEMA)[RequiredSchemaKey]]
  >;

  for (const [fieldName, expectedType] of requiredFields) {
    const actualType = schema[fieldName]?.type;
    if (!actualType) {
      throw new NotionExportError(`Notion 数据库缺少字段：${fieldName}。`, 400);
    }
    if (actualType !== expectedType) {
      throw new NotionExportError(
        `Notion 字段类型不匹配：${fieldName} 需要 ${expectedType}，当前是 ${actualType}。`,
        400,
      );
    }
  }
}

function buildProperties(item: FrontendNewsItem): Record<string, unknown> {
  return {
    Title: asTitle(item.Title),
    URL: asUrl(item.originalUrl),
    Source: asSelect(item.Source),
    Category: asSelect(item.Category),
    Topics: asMultiSelect(item.Topics),
    HotScore: asNumber(item.HotScore),
    Summary: asRichText(item.Summary),
    PublishAt: asDate(item.PublishAt),
  };
}

async function hasDuplicateEntry(
  notion: Client,
  databaseId: string,
  item: FrontendNewsItem,
): Promise<boolean> {
  const byUrl = await notion.databases.query({
    database_id: databaseId,
    page_size: 1,
    filter: {
      property: 'URL',
      url: { equals: item.originalUrl },
    },
  });
  if (byUrl.results.length > 0) return true;

  const byTitle = await notion.databases.query({
    database_id: databaseId,
    page_size: 1,
    filter: {
      property: 'Title',
      title: { equals: item.Title },
    },
  });
  if (byTitle.results.length > 0) return true;

  return false;
}

function mapNotionError(error: unknown): NotionExportError {
  if (error instanceof NotionExportError) {
    return error;
  }

  if (error instanceof APIResponseError) {
    if (error.status === 401) {
      return new NotionExportError('Notion 鉴权失败，请检查 NOTION_API_KEY。', 401);
    }
    if (error.status === 404) {
      return new NotionExportError('Notion 数据库不存在，或集成未共享到该数据库。', 404);
    }
    if (error.status === 400) {
      return new NotionExportError('Notion 字段映射不匹配，请检查数据库字段配置。', 400);
    }
    if (error.status === 429) {
      return new NotionExportError('Notion 频率受限，请稍后重试。', 429);
    }

    return new NotionExportError(`Notion API 错误（${error.status}）。`, error.status);
  }

  const msg = error instanceof Error ? error.message : '未知错误';
  return new NotionExportError(`导出失败：${msg}`, 500);
}

export async function exportNewsToNotion(item: FrontendNewsItem): Promise<ExportResult> {
  try {
    ensureValidUrl(item.originalUrl);
    ensureTextHealth(item);

    const signature = buildDuplicateSignature(item);
    if (hasRecentDuplicate(signature)) {
      return { ok: true, message: '已导入（重复跳过）', duplicate: true };
    }

    const config = getNotionConfig();
    ensureRequiredConfig(config);

    const notion = new Client({ auth: config.apiKey });
    const db = await notion.databases.retrieve({ database_id: config.databaseId });
    const schema = db.properties as NotionDbSchema;

    ensureStrictSchema(schema);

    const duplicated = await hasDuplicateEntry(notion, config.databaseId, item);
    if (duplicated) {
      markRecentExport(signature);
      return { ok: true, message: '已导入（重复跳过）', duplicate: true };
    }

    await notion.pages.create({
      parent: { database_id: config.databaseId },
      properties: buildProperties(item) as Record<string, never>,
    });

    markRecentExport(signature);
    return { ok: true, message: '已导入 Notion' };
  } catch (error) {
    const mapped = mapNotionError(error);
    return { ok: false, message: mapped.message };
  }
}

export function isValidExportPayload(payload: unknown): payload is { item: FrontendNewsItem } {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as { item?: DailyBriefResponse['news'][number] };
  if (!candidate.item) return false;

  return (
    typeof candidate.item.id === 'string' &&
    typeof candidate.item.Title === 'string' &&
    typeof candidate.item.Source === 'string' &&
    typeof candidate.item.Category === 'string' &&
    Array.isArray(candidate.item.Topics) &&
    typeof candidate.item.HotScore === 'number' &&
    typeof candidate.item.Summary === 'string' &&
    typeof candidate.item.PublishAt === 'string' &&
    typeof candidate.item.originalUrl === 'string'
  );
}
