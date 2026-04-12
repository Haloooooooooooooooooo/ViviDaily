export type View = 'landing' | 'loading' | 'feed' | 'favorites';

export type Category = 'all' | 'Hot' | '商业' | '模型' | '产品' | '政策';

export interface NewsItem {
  id: string;
  Title: string;
  Source: string;
  Category: Exclude<Category, 'all'>;
  Topics: string[];
  HotScore: number;
  Summary: string;
  PublishAt: string;
  isBookmarked: boolean;
  isExportedToNotion?: boolean;
  originalUrl?: string;
}

export interface TopNewsItem {
  rank: string;
  title: string;
  hotScore: number;
  category: Exclude<Category, 'all' | 'Hot'> | 'Hot';
  newsId: string;
}

export interface DailyBrief {
  news: NewsItem[];
  top5: TopNewsItem[];
  summary: string[];
}
