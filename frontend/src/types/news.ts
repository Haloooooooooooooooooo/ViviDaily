export type View = 'landing' | 'loading' | 'feed' | 'favorites';

export type Category = 'all' | 'Hot' | '商业' | '模型' | '产品' | '政策';

export interface NewsItem {
  id: string;
  Title: string;
  Source: string;
  Category: string;
  Topics: string[];
  HotScore: number;
  Summary: string;
  PublishAt: string;
  isBookmarked: boolean;
  isExportedToNotion?: boolean;
  originalUrl?: string;
}
