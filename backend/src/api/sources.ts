import type { SourceConfig } from './types';

export const API_RSS_SOURCES: SourceConfig[] = [
  { name: '量子位', url: 'https://www.qbitai.com/feed', priority: 1.0, authorityLevel: 'headMedia' },
  { name: '机器之心', url: 'https://www.jiqizhixin.com/rss', priority: 0.98, authorityLevel: 'headMedia' },
  { name: '新智元', url: 'https://www.aixinzhi.com/rss', priority: 0.96, authorityLevel: 'headMedia' },
  { name: 'InfoQ', url: 'https://www.infoq.cn/feed', priority: 0.95, authorityLevel: 'headMedia' },
  { name: 'RadarAI', url: 'https://radarai.top/feed.xml', priority: 0.92, authorityLevel: 'headMedia' },
  { name: '雷锋网AI', url: 'https://www.leiphone.com/feed/categoryRss/name/aijuejinzhi', priority: 0.95, authorityLevel: 'headMedia' },
  // 36Kr AI-focused feed via RSSHub search route (avoid generic 36Kr all-news feed)
  { name: '36Kr AI', url: 'https://rsshub.app/36kr/search/articles/人工智能', priority: 0.94, authorityLevel: 'headMedia' },

  { name: 'IT之家', url: 'https://www.ithome.com/rss', priority: 0.9, authorityLevel: 'generalMedia' },
  { name: '极客公园', url: 'https://www.geekpark.net/rss', priority: 0.9, authorityLevel: 'generalMedia' },
  { name: '爱范儿', url: 'https://www.ifanr.com/feed', priority: 0.88, authorityLevel: 'generalMedia' },
  { name: 'cnBeta', url: 'http://www.cnbeta.com/backend.php', priority: 0.84, authorityLevel: 'generalMedia' },
];
