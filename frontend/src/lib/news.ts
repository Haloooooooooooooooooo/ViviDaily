import type { NewsItem } from '../types/news';

export const normalizeSearchText = (value: string) =>
  value.toLowerCase().replace(/\s+/g, ' ').trim();

export const buildSearchCorpus = (item: NewsItem) =>
  normalizeSearchText([
    item.Title,
    item.Summary,
    item.Source,
    item.Category,
    ...item.Topics,
  ].join(' '));

export const findNewsItemById = (items: NewsItem[], id: string) =>
  items.find((item) => item.id === id);

export const getNewsUrl = (item: NewsItem) => item.originalUrl || `https://vividaily.ai/news/${item.id}`;
