export type FrontendCategory = 'Hot' | '商业' | '模型' | '产品' | '政策';

export interface FrontendNewsItem {
  id: string;
  Title: string;
  Source: string;
  Category: Exclude<FrontendCategory, 'Hot'>;
  Topics: string[];
  HotScore: number;
  Summary: string;
  PublishAt: string;
  originalUrl: string;
}

export interface DailyBriefResponse {
  news: FrontendNewsItem[];
  top5: Array<{
    rank: string;
    title: string;
    hotScore: number;
    category: FrontendCategory;
    newsId: string;
  }>;
  summary: string[];
  date: string;
  total: number;
}

export interface SourceConfig {
  name: string;
  url: string;
  priority: number;
  enabled?: boolean;
}
