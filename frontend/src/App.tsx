import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';
import { LandingHero, LoadingScreen, LoginModal } from './components/entry';
import { FavoritesView, NewsCard, RightSidebar, Sidebar, TopNav } from './components/feed';
import { fetchDailyBrief, sortNewsByHotScore } from './lib/dailyBrief';
import {
  exportNewsToNotion,
  getNotionOAuthStatus,
  setNotionOAuthDatabase,
  startNotionOAuth,
  type NotionOAuthStatusResponse,
} from './lib/notion';
import { buildSearchCorpus, findNewsItemById, getNewsUrl, normalizeSearchText } from './lib/news';
import { cn } from './lib/utils';
import { apiLogin, apiRegister, apiLogout, getStoredAuth, storeAuth, clearAuth } from './lib/supabase';
import type { Category, NewsItem, View } from './types/news';

const NOTION_GUIDE_ACK_KEY = 'vividaily_notion_guide_ack_v1';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | undefined>();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('Hot');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedNewsId, setHighlightedNewsId] = useState<string | null>(null);
  const [top5TargetId, setTop5TargetId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchErrorMessage, setFetchErrorMessage] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string[]>([]);
  const [actionFeedback, setActionFeedback] = useState<
    { id: string; message: string; tone?: 'success' | 'error' | 'info' } | null
  >(null);
  const [isNotionGuideOpen, setIsNotionGuideOpen] = useState(false);
  const [notionStatus, setNotionStatus] = useState<NotionOAuthStatusResponse | null>(null);
  const [notionDatabaseId, setNotionDatabaseId] = useState('');
  const [notionGuideLoading, setNotionGuideLoading] = useState(false);
  const [pendingExportId, setPendingExportId] = useState<string | null>(null);
  const [notionGuideAcknowledged, setNotionGuideAcknowledged] = useState(false);

  // 初始化时恢复登录状态
  useEffect(() => {
    const stored = getStoredAuth();
    if (stored.user && stored.accessToken) {
      setIsLoggedIn(true);
      setUserInfo({ name: stored.user.email.split('@')[0], email: stored.user.email });
      setAccessToken(stored.accessToken);
    }
    if (typeof window !== 'undefined' && window.localStorage.getItem(NOTION_GUIDE_ACK_KEY) === '1') {
      setNotionGuideAcknowledged(true);
    }
  }, []);

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

    const timeout = actionFeedback.id === 'auth' ? 4200 : 2200;
    const timer = setTimeout(() => setActionFeedback(null), timeout);
    return () => clearTimeout(timer);
  }, [actionFeedback]);

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const oauth = params.get('notion_oauth');
      if (!oauth) return;

      if (oauth === 'success') {
        setActionFeedback({ id: 'auth', message: 'Notion 授权成功，请设置数据库 ID 后导出', tone: 'success' });

        // OAuth 回跳后恢复到 Feed，再打开 Notion 引导弹窗，避免落回 Landing。
        try {
          const brief = await fetchDailyBrief();
          setNewsData(brief.news);
          setAiSummary(brief.summary);
          setFetchErrorMessage(null);
        } catch {
          setFetchErrorMessage('抓取失败，请稍后重试');
        }
        setView('feed');
        setIsNotionGuideOpen(true);
      } else if (oauth === 'failed') {
        setActionFeedback({ id: 'auth', message: 'Notion 授权失败，请重试', tone: 'error' });
      } else if (oauth === 'invalid_state' || oauth === 'invalid_callback') {
        setActionFeedback({ id: 'auth', message: 'Notion 授权状态无效，请重新发起授权', tone: 'error' });
      }

      const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
      window.history.replaceState({}, '', cleanUrl);
    };

    run();
  }, []);

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

  useEffect(() => {
    if (!isNotionGuideOpen || !accessToken) return;

    const run = async () => {
      setNotionGuideLoading(true);
      try {
        const status = await getNotionOAuthStatus(accessToken);
        setNotionStatus(status);
        setNotionDatabaseId(status.databaseId || '');
      } catch {
        setActionFeedback({ id: 'auth', message: '读取 Notion 状态失败', tone: 'error' });
      } finally {
        setNotionGuideLoading(false);
      }
    };

    run();
  }, [isNotionGuideOpen, accessToken]);

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
    setFetchErrorMessage(null);
    setActiveCategory('Hot');
    setSearchQuery('');
    setHighlightedNewsId(null);

    try {
      const brief = await fetchDailyBrief();
      setNewsData(brief.news);
      setAiSummary(brief.summary);
      setView('feed');
      setFetchErrorMessage(null);
    } catch (error) {
      setNewsData([]);
      setAiSummary([]);
      setView('feed');
      setFetchErrorMessage(error instanceof Error ? error.message : '抓取失败，请稍后重试');
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

    // 首次导入前先提示用户建好数据库和字段
    if (!notionGuideAcknowledged) {
      setPendingExportId(id);
      setIsNotionGuideOpen(true);
      setActionFeedback({
        id: 'auth',
        message: '首次导入前，请先按教程配置 Notion 数据库和字段',
        tone: 'info',
      });
      return;
    }

    setActionFeedback({ id, message: '导出中...' });

    try {
      const result = await exportNewsToNotion(item, accessToken || undefined);
      if (!result.ok) {
        if (result.message.includes('连接 Notion') || result.message.includes('设置 Notion Database ID')) {
          setPendingExportId(id);
          setIsNotionGuideOpen(true);
        }
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

  const handleConnectNotion = async () => {
    if (!accessToken) {
      setActionFeedback({ id: 'auth', message: '请先登录', tone: 'error' });
      setIsLoginOpen(true);
      return;
    }

    setNotionGuideLoading(true);
    try {
      const result = await startNotionOAuth(accessToken);
      if (!result.ok || !result.authUrl) {
        setActionFeedback({ id: 'auth', message: result.error || '无法发起 Notion 授权', tone: 'error' });
        return;
      }
      window.location.href = result.authUrl;
    } catch {
      setActionFeedback({ id: 'auth', message: '发起 Notion 授权失败', tone: 'error' });
    } finally {
      setNotionGuideLoading(false);
    }
  };

  const handleSaveNotionDatabase = async () => {
    if (!accessToken) {
      setActionFeedback({ id: 'auth', message: '请先登录', tone: 'error' });
      setIsLoginOpen(true);
      return;
    }

    const value = notionDatabaseId.trim();
    if (!value) {
      setActionFeedback({ id: 'auth', message: '请输入 Notion Database ID', tone: 'error' });
      return;
    }

    setNotionGuideLoading(true);
    try {
      const result = await setNotionOAuthDatabase(accessToken, value);
      if (!result.ok) {
        setActionFeedback({ id: 'auth', message: result.error || '保存数据库 ID 失败', tone: 'error' });
        return;
      }

      setActionFeedback({ id: 'auth', message: 'Notion 数据库已绑定', tone: 'success' });
      setNotionStatus((prev) => ({ ...(prev || {}), connected: true, databaseId: value, mode: 'user_oauth' }));
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(NOTION_GUIDE_ACK_KEY, '1');
      }
      setNotionGuideAcknowledged(true);

      if (pendingExportId) {
        const target = pendingExportId;
        setPendingExportId(null);
        setIsNotionGuideOpen(false);
        await handleExportNotion(target);
        return;
      }

      setIsNotionGuideOpen(false);
    } catch {
      setActionFeedback({ id: 'auth', message: '保存数据库 ID 失败', tone: 'error' });
    } finally {
      setNotionGuideLoading(false);
    }
  };

  const handleLogout = async () => {
    if (accessToken) {
      try {
        await apiLogout(accessToken);
      } catch (error) {
        console.error('[logout] API call failed', error);
      }
    }
    clearAuth();
    setIsLoggedIn(false);
    setUserInfo(undefined);
    setAccessToken(null);
    setPendingExportId(null);
    setIsNotionGuideOpen(false);
    setActionFeedback({ id: 'auth', message: '已退出登录，可继续切换账号登录', tone: 'info' });
    setIsLoginOpen(true);
  };

  const handleAuthSubmit = async ({
    email,
    password,
    mode,
  }: {
    email: string;
    password: string;
    mode: 'login' | 'register';
  }) => {
    try {
      const result = mode === 'login'
        ? await apiLogin(email, password)
        : await apiRegister(email, password);

      if (!result.ok) {
        setActionFeedback({
          id: 'auth',
          message: result.error || (mode === 'login' ? '登录失败' : '注册失败'),
          tone: 'error',
        });
        return;
      }

      if (result.user && result.session) {
        setIsLoggedIn(true);
        setUserInfo({ name: email.split('@')[0], email });
        setAccessToken(result.session.access_token);
        storeAuth({ user: result.user, accessToken: result.session.access_token });
        setIsLoginOpen(false);
        setActionFeedback({
          id: 'auth',
          message: mode === 'login' ? '已登录' : '注册成功，已登录',
          tone: 'success',
        });
      } else if (mode === 'register' && !result.session) {
        // 需要邮箱验证
        setIsLoginOpen(false);
        setActionFeedback({
          id: 'auth',
          message: '注册成功，请查收验证邮件后登录',
          tone: 'success',
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '网络错误';
      setActionFeedback({ id: 'auth', message: msg, tone: 'error' });
    }
  };

  if (view === 'landing') {
    return (
      <>
        <LandingHero onStart={handleGetStarted} />
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onSubmit={handleAuthSubmit}
          serverMessage={actionFeedback?.id === 'auth' ? actionFeedback.message : null}
          serverMessageTone={actionFeedback?.id === 'auth' ? actionFeedback.tone || 'info' : 'info'}
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
                    <p className="text-zinc-500">{fetchErrorMessage ? '抓取失败' : '未找到相关内容'}</p>
                    {fetchErrorMessage && (
                      <p className="text-red-400 text-sm mt-2">{fetchErrorMessage}</p>
                    )}
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
        serverMessage={actionFeedback?.id === 'auth' ? actionFeedback.message : null}
        serverMessageTone={actionFeedback?.id === 'auth' ? actionFeedback.tone || 'info' : 'info'}
      />

      {actionFeedback?.id === 'auth' && !isLoginOpen && (
        <div
          className={cn(
            'fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg',
            actionFeedback.tone === 'error'
              ? 'bg-red-100 text-red-700'
              : actionFeedback.tone === 'success'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-white text-black',
          )}
        >
          {actionFeedback.message}
        </div>
      )}

      <AnimatePresence>
        {isNotionGuideOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#121212] p-6"
            >
              <h3 className="text-xl font-bold text-white mb-2">首次导入教程（小白版）</h3>
              <p className="text-sm text-zinc-400 mb-5">
                不需要会代码，按下面 3 步做完即可导入到你自己的 Notion。只用配置一次，后续可直接一键导入。
              </p>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs text-zinc-400 mb-2">第 1 步：点击“连接 Notion”并授权</p>
                  <p className="text-[11px] text-zinc-500 mb-3">
                    会跳转到 Notion 官方授权页。选择你要导入的工作区，然后点“允许”即可。
                  </p>
                  <button
                    type="button"
                    disabled={notionGuideLoading}
                    onClick={handleConnectNotion}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {notionGuideLoading ? '处理中...' : '连接 Notion'}
                  </button>
                  {notionStatus?.connected && (
                    <p className="text-xs text-emerald-400 mt-2">
                      授权成功：{notionStatus.workspaceName || 'Notion Workspace'}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs text-zinc-400 mb-2">第 2 步：填写 Notion Database ID</p>
                  <p className="text-[11px] text-zinc-500 mb-2">
                    打开你的 Notion 数据库页面，复制 URL 中最后一串长 ID（去掉前后的斜杠和问号参数）。
                  </p>
                  <p className="text-[11px] text-zinc-500 mb-2">
                    也可以直接粘贴完整数据库 URL，系统会自动识别并提取 Database ID。
                  </p>
                  <input
                    type="text"
                    value={notionDatabaseId}
                    onChange={(e) => setNotionDatabaseId(e.target.value)}
                    placeholder="请输入 Notion Database ID"
                    className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                  />
                  <p className="text-[11px] text-zinc-500 mt-2">
                    示例：`https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...` 里的 `xxxxxxxx...`。
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-2">
                    请先在数据库里建好这些字段：Title(标题)、URL(URL)、Source(单选)、Category(单选)、Topics(多选)、HotScore(数字)、Summary(文本)、PublishAt(日期)。
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveNotionDatabase}
                    disabled={notionGuideLoading}
                    className="mt-3 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {notionGuideLoading ? '保存中...' : '保存并继续'}
                  </button>
                </div>

                <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
                  <p className="text-xs text-amber-300 mb-2">第 3 步：常见问题排查</p>
                  <p className="text-[11px] text-zinc-400">
                    1) 如果看到“客户端 ID 缺失”，说明系统管理员还没配置 Notion OAuth。
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    2) 如果提示“字段不匹配”，请确认数据库包含 Title、URL、Source、Category、Topics、HotScore、Summary、PublishAt。
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    3) 如果提示“未连接 Notion”，重新点一次“连接 Notion”再保存数据库 ID。
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsNotionGuideOpen(false)}
                  className="text-sm text-zinc-400 hover:text-white"
                >
                  稍后再说
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
