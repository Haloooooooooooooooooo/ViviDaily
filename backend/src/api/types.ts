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

export interface DailyBriefSourceDebug {
  source: string;
  fetchedCount: number;
  yesterdayCount: number;
  strictRankedCount: number;
  supplementCount: number;
  looseSupplementCount: number;
  lastChanceCount: number;
  selectedCount: number;
  finalCount: number;
}

export interface DailyBriefDebugResponse extends DailyBriefResponse {
  debug: {
    perSource: DailyBriefSourceDebug[];
    rawTotal: number;
    yesterdayTotal: number;
    candidatePoolTotal: number;
    primaryTotal: number;
    finalTotal: number;
  };
}

export type AuthorityLevel = 'official' | 'headMedia' | 'generalMedia';

export interface SourceConfig {
  name: string;
  url: string;
  priority: number;
  authorityLevel: AuthorityLevel;
  enabled?: boolean;
}

export const AUTHORITY_WEIGHTS: Record<AuthorityLevel, number> = {
  official: 1.5,
  headMedia: 1.2,
  generalMedia: 0.9,
};
