import { useEffect, useRef } from 'react';
import type { Key } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  Cpu,
  LogOut,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Star,
  User,
  X,
} from 'lucide-react';
import { FEED_CATEGORIES } from '../data/mockData';
import { cn } from '../lib/utils';
import type { Category, NewsItem, TopNewsItem, View } from '../types/news';

const TEXT = {
  newsCategory: '新闻分类',
  favorites: '收藏夹',
  login: '登录',
  logout: '退出登录',
  searchPlaceholder: '搜索标题、摘要、来源、分类、主题标签',
  clearSearch: '清空搜索',
  openOriginal: '阅读原文',
  share: '分享',
  exportNotion: '导入 Notion',
  exportedNotion: '已导入 Notion',
  bookmarked: '已收藏',
  bookmark: '收藏',
  top5: '热门榜单 Top 5',
  aiSummary: 'AI 每日摘要',
  favoritesTitle: '收藏内容',
  favoritesCountPrefix: '当前已收藏 ',
  favoritesCountSuffix: ' 条新闻',
  favoritesEmpty: '暂无收藏内容',
  favoritesHint: '点击新闻卡片上的收藏按钮，将感兴趣的内容加入收藏夹。',
  backToFeed: '返回新闻流',
  cancelBookmark: '取消收藏',
  summaryTags: ['# Agent', '# 多模态', '# AI 产品'],
} as const;

export const Sidebar = ({
  activeCategory,
  setCategory,
  setView,
  view,
  onLogout,
  setIsLoginOpen,
  isLoggedIn,
  userInfo,
  favoriteCount,
}: {
  activeCategory: Category;
  setCategory: (c: Category) => void;
  setView: (v: View) => void;
  view: View;
  onLogout: () => void;
  setIsLoginOpen: (o: boolean) => void;
  isLoggedIn: boolean;
  userInfo?: { name: string; email: string };
  favoriteCount: number;
}) => (
  <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-56 bg-[#131313] flex flex-col p-6 z-40">
    <div className="flex items-center gap-3 mb-10">
      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
        <Cpu size={18} className="text-black" />
      </div>
      <div>
        <div className="text-zinc-500 font-bold text-sm">{TEXT.newsCategory}</div>
      </div>
    </div>

    <nav className="flex flex-col gap-2 flex-grow">
      {FEED_CATEGORIES.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            setCategory(item.id);
            setView('feed');
          }}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all group',
            activeCategory === item.id && view === 'feed'
              ? 'bg-zinc-800/50 text-white'
              : 'text-zinc-500 hover:bg-zinc-800/30 hover:text-white'
          )}
        >
          <item.icon
            size={18}
            className={cn(
              activeCategory === item.id && view === 'feed'
                ? 'text-white'
                : 'text-zinc-500 group-hover:text-white'
            )}
          />
          {item.label}
        </button>
      ))}

      <div className="my-4 border-t border-white/5" />

      <button
        onClick={() => setView('favorites')}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all group',
          view === 'favorites'
            ? 'bg-zinc-800/50 text-white'
            : 'text-zinc-500 hover:bg-zinc-800/30 hover:text-white'
        )}
      >
        <Star size={18} className={cn(view === 'favorites' ? 'text-white' : 'text-zinc-500 group-hover:text-white')} />
        {TEXT.favorites}
        <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-white/10 text-[10px] text-zinc-300 inline-flex items-center justify-center">
          {favoriteCount}
        </span>
      </button>
    </nav>

    <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-2">
      {isLoggedIn && userInfo ? (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/5">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <User size={16} className="text-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">{userInfo.name}</span>
            <span className="text-[10px] text-zinc-500">{userInfo.email}</span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsLoginOpen(true)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-all w-full"
        >
          <User size={18} />
          {TEXT.login}
        </button>
      )}
      {isLoggedIn && (
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-zinc-500 hover:text-white transition-all w-full"
        >
          <LogOut size={18} />
          {TEXT.logout}
        </button>
      )}
    </div>
  </aside>
);

export const TopNav = ({
  searchQuery,
  setSearchQuery,
  onFocusSearch,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onFocusSearch: () => void;
}) => (
  <nav className="fixed top-0 w-full z-50 glass-nav flex justify-between items-center px-12 h-16">
    <div className="text-2xl font-headline font-bold tracking-tighter text-white">ViviDaily</div>

    <div className="flex items-center gap-6">
      <div className="relative w-64">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
        <input
          type="text"
          placeholder={TEXT.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={onFocusSearch}
          className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-12 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-all"
        />
        {searchQuery.trim() && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            aria-label={TEXT.clearSearch}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  </nav>
);

export const NewsCard = ({
  item,
  onOpenOriginal,
  onToggleBookmark,
  onShare,
  onExportNotion,
  isHighlighted,
  feedbackMessage,
}: {
  key?: Key;
  item: NewsItem;
  onOpenOriginal: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onShare: (id: string) => void;
  onExportNotion: (id: string) => void;
  isHighlighted?: boolean;
  feedbackMessage?: string | null;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  return (
    <article
      ref={cardRef}
      className={cn(
        'group relative bg-[#0e0e0e] border p-4 rounded-xl transition-all overflow-hidden',
        isHighlighted ? 'border-white/40' : 'border-white/5 hover:border-white/10'
      )}
    >
      {isHighlighted && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            animation: 'metallicFlow 1.5s ease-in-out',
          }}
        />
      )}

      <h2 className="text-lg font-headline font-bold text-white mb-2 group-hover:text-white transition-colors leading-tight">
        {item.Title}
      </h2>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="bg-zinc-800/50 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
          {item.Source}
        </span>
        <span className="bg-blue-900/20 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider">
          {item.Category}
        </span>
        {item.Topics.slice(0, 2).map((topic) => (
          <span
            key={topic}
            className="bg-white/5 text-zinc-300 text-[9px] px-1.5 py-0.5 rounded font-medium tracking-wider"
          >
            {topic}
          </span>
        ))}
        <span className="text-zinc-500 text-[9px]">{item.PublishAt}</span>
        {feedbackMessage && (
          <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-black">
            {feedbackMessage}
          </span>
        )}
        <span className="ml-auto text-[9px] text-amber-300 font-bold">Hot {item.HotScore}</span>
      </div>

      <p className="text-zinc-400 text-xs leading-relaxed mb-4 line-clamp-2">{item.Summary}</p>

      <div className="flex items-center gap-4 pt-2 border-t border-white/5">
        <button
          onClick={() => onOpenOriginal(item.id)}
          className="flex items-center gap-1 text-[10px] font-bold text-zinc-200 hover:text-white transition-colors"
        >
          {TEXT.openOriginal} <ArrowUpRight size={12} />
        </button>
        <button
          onClick={() => onShare(item.id)}
          className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <Share2 size={12} /> {TEXT.share}
        </button>
        <button
          onClick={() => onExportNotion(item.id)}
          disabled={item.isExportedToNotion}
          className={cn(
            'flex items-center gap-1 text-[10px] font-medium transition-colors',
            item.isExportedToNotion
              ? 'text-zinc-600 cursor-not-allowed'
              : 'text-zinc-500 hover:text-zinc-200'
          )}
        >
          <RefreshCw size={12} />
          {item.isExportedToNotion ? TEXT.exportedNotion : TEXT.exportNotion}
        </button>
        <button
          onClick={() => onToggleBookmark(item.id)}
          className={cn(
            'flex items-center gap-1 text-[10px] font-medium transition-colors',
            item.isBookmarked
              ? 'text-yellow-400 hover:text-yellow-300'
              : 'text-zinc-500 hover:text-zinc-200'
          )}
        >
          <Bookmark size={12} fill={item.isBookmarked ? 'currentColor' : 'none'} />
          {item.isBookmarked ? TEXT.bookmarked : TEXT.bookmark}
        </button>
      </div>
    </article>
  );
};

export const RightSidebar = ({
  top5,
  aiSummary,
  onHighlightNews,
  isFetching,
  activeNewsId,
}: {
  top5: TopNewsItem[];
  aiSummary: string[];
  onHighlightNews: (newsId: string) => void;
  isFetching?: boolean;
  activeNewsId?: string | null;
}) => (
  <aside className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-96 bg-black border-l border-white/5 p-6 overflow-y-auto news-feed-scroll">
    <div className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-headline font-bold text-white">{TEXT.top5}</h3>
        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Yesterday</span>
      </div>

      {isFetching ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-6 h-6 bg-zinc-800 rounded" />
              <div className="flex-grow border-b border-white/5 pb-3">
                <div className="h-3 bg-zinc-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-zinc-800 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {top5.map((item, index) => {
            const colors = ['text-white', 'text-blue-500', 'text-purple-500', 'text-emerald-500', 'text-amber-500'];
            return (
              <div
                key={item.rank}
                className={cn(
                  'flex items-start gap-3 group cursor-pointer rounded-xl px-2 py-2 transition-colors',
                  activeNewsId === item.newsId ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                )}
                onClick={() => onHighlightNews(item.newsId)}
              >
                <span className={cn('text-xl font-black italic w-6 transition-transform group-hover:scale-110', colors[index])}>
                  {item.rank}
                </span>
                <div className="flex-grow border-b border-white/5 pb-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-white/80 transition-colors">
                      {item.title}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/20 text-blue-400 font-bold tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-[9px] text-amber-300 font-bold">Hot {item.hotScore}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-white" />
        <h3 className="text-xs font-bold text-white uppercase tracking-widest">{TEXT.aiSummary}</h3>
      </div>
      {isFetching ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-zinc-800 rounded w-full" />
          <div className="h-3 bg-zinc-800 rounded w-4/5" />
          <div className="h-3 bg-zinc-800 rounded w-3/4" />
        </div>
      ) : (
        <>
          <ul className="space-y-2 mb-6">
            {aiSummary.map((item, index) => (
              <li key={index} className="text-xs text-zinc-400 leading-relaxed flex gap-2">
                <span className="text-zinc-500">•</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {TEXT.summaryTags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-white/5 text-zinc-500 text-[10px] rounded-full hover:bg-white/10 hover:text-zinc-300 transition-colors cursor-default"
              >
                {tag}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  </aside>
);

export const FavoritesView = ({
  items,
  onOpenOriginal,
  onToggleBookmark,
  onShare,
  onExportNotion,
  feedbackItemId,
  feedbackMessage,
  onBackToFeed,
}: {
  items: NewsItem[];
  onOpenOriginal: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onShare: (id: string) => void;
  onExportNotion: (id: string) => void;
  feedbackItemId?: string | null;
  feedbackMessage?: string | null;
  onBackToFeed: () => void;
}) => (
  <div className="max-w-6xl mx-auto">
    <header className="fixed top-16 left-56 right-0 h-20 bg-black/80 backdrop-blur-md z-30 flex items-center px-8 border-b border-white/5">
      <div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold mb-1">Favorites</div>
        <h2 className="text-2xl font-headline font-extrabold tracking-tighter text-white">{TEXT.favoritesTitle}</h2>
        <p className="text-xs text-zinc-500 mt-1">
          {TEXT.favoritesCountPrefix}
          {items.length}
          {TEXT.favoritesCountSuffix}
        </p>
      </div>
    </header>

    <div className="px-8 pt-24 pb-10">
      {items.length === 0 ? (
        <div className="text-center py-20">
          <Star size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500 mb-2">{TEXT.favoritesEmpty}</p>
          <p className="text-zinc-600 text-sm">{TEXT.favoritesHint}</p>
          <button
            onClick={onBackToFeed}
            className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
          >
            {TEXT.backToFeed}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col bg-[#0e0e0e] border border-white/5 p-5 rounded-xl hover:border-white/10 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
                <Bookmark size={16} fill="white" className="text-white" />
              </div>

              <h3 className="text-lg font-headline font-bold leading-tight mb-4 text-white group-hover:text-white/80 transition-colors">
                {item.Title}
              </h3>

              <div className="flex items-center gap-3 mb-3">
                <span className="bg-zinc-800/50 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  {item.Source}
                </span>
                <span className="bg-blue-900/20 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider">
                  {item.Category}
                </span>
                <span className="text-[9px] text-amber-300 font-bold">Hot {item.HotScore}</span>
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-zinc-500 text-[9px]">{item.PublishAt}</span>
                {feedbackItemId === item.id && feedbackMessage && (
                  <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-black">
                    {feedbackMessage}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {item.Topics.slice(0, 3).map((topic) => (
                  <span
                    key={topic}
                    className="bg-white/5 text-zinc-300 text-[9px] px-1.5 py-0.5 rounded font-medium tracking-wider"
                  >
                    {topic}
                  </span>
                ))}
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed mb-6 line-clamp-2">{item.Summary}</p>

              <div className="mt-auto pt-4 border-t border-white/5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => onOpenOriginal(item.id)}
                  className="py-2 text-[9px] font-bold uppercase tracking-widest bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  {TEXT.openOriginal}
                </button>
                <button
                  onClick={() => onShare(item.id)}
                  className="py-2 text-[9px] font-bold uppercase tracking-widest border border-white/10 text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  {TEXT.share}
                </button>
                <button
                  onClick={() => !item.isExportedToNotion && onExportNotion(item.id)}
                  disabled={item.isExportedToNotion}
                  className={cn(
                    'py-2 text-[9px] font-bold uppercase tracking-widest border rounded-lg transition-colors',
                    item.isExportedToNotion
                      ? 'border-white/5 text-zinc-600 cursor-not-allowed'
                      : 'border-white/10 text-white hover:bg-white/5'
                  )}
                >
                  {item.isExportedToNotion ? TEXT.exportedNotion : TEXT.exportNotion}
                </button>
                <button
                  onClick={() => onToggleBookmark(item.id)}
                  className="py-2 text-[9px] font-bold uppercase tracking-widest border border-white/10 text-zinc-500 rounded-lg hover:bg-white/5 hover:text-red-400 transition-colors"
                >
                  {TEXT.cancelBookmark}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
