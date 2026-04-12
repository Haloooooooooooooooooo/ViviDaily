import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';
import { LandingHero, LoadingScreen, LoginModal } from './components/entry';
import { FavoritesView, NewsCard, RightSidebar, Sidebar, TopNav } from './components/feed';
import { fetchDailyBrief, sortNewsByHotScore } from './lib/dailyBrief';
import { exportNewsToNotion } from './lib/notion';
import { buildSearchCorpus, findNewsItemById, getNewsUrl, normalizeSearchText } from './lib/news';
import { cn } from './lib/utils';
import type { Category, NewsItem, View } from './types/news';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | undefined>();
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('Hot');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedNewsId, setHighlightedNewsId] = useState<string | null>(null);
  const [top5TargetId, setTop5TargetId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [aiSummary, setAiSummary] = useState<string[]>([]);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    if (highlightedNewsId) {
      const timer = setTimeout(() => setHighlightedNewsId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedNewsId]);

  useEffect(() => {
    if (!actionFeedback) return;

    const timer = setTimeout(() => setActionFeedback(null), 2200);
    return () => clearTimeout(timer);
  }, [actionFeedback]);

  useEffect(() => {
    if (!top5TargetId || view !== 'feed' || isFetching) return;

    const targetItem = findNewsItemById(newsData, top5TargetId);
    if (!targetItem) {
      setTop5TargetId(null);
      return;
    }

    const matchesCategory =
      activeCategory === 'Hot' || activeCategory === 'all' || targetItem.Category === activeCategory;
    const matchesSearch =
      searchQuery.trim().length === 0 || buildSearchCorpus(targetItem).includes(normalizeSearchText(searchQuery));

    if (matchesCategory && matchesSearch) {
      const timer = setTimeout(() => {
        setHighlightedNewsId(top5TargetId);
        setTop5TargetId(null);
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [top5TargetId, view, isFetching, newsData, activeCategory, searchQuery]);

  const top5Data = useMemo(() => {
    return sortNewsByHotScore(newsData)
      .slice(0, 5)
      .map((item, index) => ({
        rank: `${index + 1}`.padStart(2, '0'),
        title: item.Title,
        hotScore: item.HotScore,
        category: item.Category,
        newsId: item.id,
      }));
  }, [newsData]);

  const handleGetStarted = async () => {
    setView('loading');
    setIsFetching(true);
    setActiveCategory('Hot');
    setSearchQuery('');
    setHighlightedNewsId(null);

    try {
      const brief = await fetchDailyBrief();
      setNewsData(brief.news);
      setAiSummary(brief.summary);
      setView('feed');
    } finally {
      setIsFetching(false);
    }
  };

  const handleHighlightNews = (newsId: string) => {
    setView('feed');
    setActiveCategory('Hot');
    setSearchQuery('');
    setTop5TargetId(newsId);
  };

  const filteredNews = useMemo(() => {
    let result = newsData;
    const normalizedQuery = normalizeSearchText(searchQuery);
    const queryTokens = normalizedQuery ? normalizedQuery.split(' ') : [];

    if (activeCategory !== 'Hot' && activeCategory !== 'all') {
      result = result.filter((item) => item.Category === activeCategory);
    }

    if (queryTokens.length > 0) {
      result = result.filter((item) =>
        queryTokens.every((token) => buildSearchCorpus(item).includes(token))
      );
    }

    return result;
  }, [newsData, activeCategory, searchQuery]);

  const handleFocusSearch = () => {
    if (view !== 'feed') {
      setView('feed');
    }
  };

  const bookmarkedItems = useMemo(() => {
    return newsData.filter((item) => item.isBookmarked);
  }, [newsData]);

  const handleToggleBookmark = (id: string) => {
    // 登录门禁：未登录时弹出登录窗，不执行收藏
    if (!isLoggedIn) {
      setIsLoginOpen(true);
      return;
    }

    const targetItem = findNewsItemById(newsData, id);
    setNewsData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item))
    );

    if (targetItem) {
      setActionFeedback({ id, message: targetItem.isBookmarked ? '已取消收藏' : '已加入收藏' });
    }
  };

  const handleOpenOriginal = (id: string) => {
    const item = findNewsItemById(newsData, id);
    if (!item) return;

    window.open(getNewsUrl(item), '_blank', 'noopener,noreferrer');
    setActionFeedback({ id, message: '已打开原文' });
  };

  const handleShare = async (id: string) => {
    const item = findNewsItemById(newsData, id);
    if (!item) return;

    try {
      await navigator.clipboard.writeText(getNewsUrl(item));
      setActionFeedback({ id, message: '已复制分享链接' });
    } catch {
      setActionFeedback({ id, message: '复制失败，请稍后重试' });
    }
  };

  const handleExportNotion = async (id: string) => {
    // 登录门禁：未登录时弹出登录窗，不执行导出
    if (!isLoggedIn) {
      setIsLoginOpen(true);
      return;
    }

    const item = findNewsItemById(newsData, id);
    if (!item || item.isExportedToNotion) return;

    setActionFeedback({ id, message: '导出中...' });

    try {
      const result = await exportNewsToNotion(item);
      if (!result.ok) {
        setActionFeedback({ id, message: result.message || '导出失败' });
        return;
      }

      setNewsData((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, isExportedToNotion: true } : entry))
      );
      setActionFeedback({ id, message: '已导入 Notion' });
    } catch {
      setActionFeedback({ id, message: '导出失败' });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserInfo(undefined);
    setView('landing');
  };

  const handleAuthSubmit = ({
    email,
    mode,
  }: {
    email: string;
    password: string;
    mode: 'login' | 'register';
  }) => {
    const nameFromEmail = email.split('@')[0] || 'ViviDaily User';
    const displayName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

    setIsLoggedIn(true);
    setUserInfo({
      name: displayName,
      email,
    });
    setIsLoginOpen(false);
    setActionFeedback({
      id: 'auth',
      message: mode === 'login' ? '已登录' : '账户已创建并登录',
    });
  };

  if (view === 'landing') {
    return (
      <>
        <LandingHero onStart={handleGetStarted} />
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onSubmit={handleAuthSubmit}
        />
      </>
    );
  }

  if (view === 'loading') {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-black text-[#e2e2e2]">
      <TopNav
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onFocusSearch={handleFocusSearch}
      />
      <Sidebar
        activeCategory={activeCategory}
        setCategory={setActiveCategory}
        view={view}
        setView={setView}
        onLogout={handleLogout}
        setIsLoginOpen={setIsLoginOpen}
        isLoggedIn={isLoggedIn}
        userInfo={userInfo}
        favoriteCount={bookmarkedItems.length}
      />

      <main
        className={cn(
          'pt-16 transition-all duration-500',
          view === 'feed' ? 'ml-56 mr-96' : 'ml-56'
        )}
      >
        <AnimatePresence mode="wait">
          {view === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative"
            >
              <header className="fixed top-16 left-56 right-96 h-20 bg-black/80 backdrop-blur-md z-30 flex items-center justify-between px-8 border-b border-white/5">
                <div>
                  <h1 className="text-3xl font-headline font-extrabold tracking-tighter text-white">
                    {activeCategory === 'Hot' ? '昨日 AI 简报' : `${activeCategory}动态`}
                  </h1>
                  {!isFetching && (
                    <p className="text-xs text-zinc-500 mt-1">
                      {activeCategory === 'Hot'
                        ? `显示昨天全部热点新闻，共 ${filteredNews.length} 条`
                        : `当前分类：${activeCategory}，共 ${filteredNews.length} 条`}
                    </p>
                  )}
                </div>
                {searchQuery && !isFetching && (
                  <span className="text-sm text-zinc-500">搜索结果：{filteredNews.length} 条</span>
                )}
              </header>
              <div className="flex flex-col gap-4 px-8 pt-24 pb-10">
                {isFetching ? (
                  <div className="flex flex-col items-center justify-center py-40">
                    <div className="relative w-20 h-20 mb-8">
                      <svg className="animate-spin w-full h-full" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                        <path
                          d="M12 2a10 10 0 0 1 10 10"
                          stroke="rgba(255,255,255,0.6)"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <p className="text-xl font-headline font-bold text-white mb-2">正在获取昨天热点</p>
                    <p className="text-sm text-zinc-500">请稍候...</p>
                  </div>
                ) : filteredNews.length === 0 ? (
                  <div className="text-center py-20">
                    <Search size={48} className="mx-auto text-zinc-700 mb-4" />
                    <p className="text-zinc-500">未找到相关内容</p>
                    {searchQuery.trim() && (
                      <p className="text-zinc-600 text-sm mt-2">
                        已按标题、摘要、来源、分类和主题标签搜索 “{searchQuery.trim()}”
                      </p>
                    )}
                  </div>
                ) : (
                  filteredNews.map((item) => (
                    <NewsCard
                      key={item.id}
                      item={item}
                      onOpenOriginal={handleOpenOriginal}
                      onToggleBookmark={handleToggleBookmark}
                      onShare={handleShare}
                      onExportNotion={handleExportNotion}
                      isHighlighted={highlightedNewsId === item.id}
                      feedbackMessage={actionFeedback?.id === item.id ? actionFeedback.message : null}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'favorites' && (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FavoritesView
                items={bookmarkedItems}
                onOpenOriginal={handleOpenOriginal}
                onToggleBookmark={handleToggleBookmark}
                onShare={handleShare}
                onExportNotion={handleExportNotion}
                feedbackItemId={actionFeedback?.id}
                feedbackMessage={actionFeedback?.message ?? null}
                onBackToFeed={() => setView('feed')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {view === 'feed' && (
        <RightSidebar
          top5={top5Data}
          aiSummary={aiSummary}
          onHighlightNews={handleHighlightNews}
          isFetching={isFetching}
          activeNewsId={highlightedNewsId ?? top5TargetId}
        />
      )}

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSubmit={handleAuthSubmit}
      />

      <style>{`
        @keyframes metallicFlow {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
