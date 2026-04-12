import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { ChevronRight, User, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export const VideoBackground = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: false,
        startLevel: -1,
        debug: false,
      });
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => console.error('Video play failed:', err));
      });

      return () => {
        hls.destroy();
      };
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch((err) => console.error('Video play failed:', err));
      });
    }
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <video ref={videoRef} muted loop playsInline className="w-full h-full object-cover opacity-100" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
    </div>
  );
};

export const LoginModal = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { email: string; password: string; mode: 'login' | 'register' }) => Promise<void> | void;
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setMode('login');
      setEmail('');
      setPassword('');
      setValidationError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const title = mode === 'login' ? '登录 ViviDaily' : '创建 ViviDaily 账户';
  const subtitle =
    mode === 'login'
      ? '欢迎回来，继续查看昨天最值得关注的 AI 热点。'
      : '创建一个账户，保存你的每日 AI 热点阅读节奏。';

  const handleSubmit = async (submitMode: 'login' | 'register') => {
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) {
      setValidationError('请输入邮箱地址');
      return;
    }
    if (!normalizedPassword) {
      setValidationError('请输入密码');
      return;
    }
    if (normalizedPassword.length < 6) {
      setValidationError('密码至少需要 6 个字符');
      return;
    }

    setValidationError(null);
    setIsLoading(true);
    try {
      await onSubmit({ email: normalizedEmail, password: normalizedPassword, mode: submitMode });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#131313] border border-white/10 rounded-3xl p-8 shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>

            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6">
                <User className="text-black" size={24} />
              </div>
              <h2 className="text-3xl font-headline font-bold text-white mb-2">{title}</h2>
              <p className="text-zinc-500 text-sm text-center">{subtitle}</p>
            </div>

            <div className="space-y-6">
              {validationError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  {validationError}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-2">邮箱地址 / Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="name@vividaily.ai"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500">密码 / Password</label>
                  <button
                    type="button"
                    className="text-[10px] text-zinc-600 hover:text-white transition-colors"
                    onClick={() => {
                      setPassword('12345678');
                      setValidationError(null);
                    }}
                  >
                    使用演示密码
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSubmit(mode)}
                disabled={isLoading}
                className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '处理中...' : mode === 'login' ? '登录' : '创建账户'}
              </button>

              <p className="text-center text-xs text-zinc-500">
                {mode === 'login' ? '还没有账号？' : '已经有账号？'}{' '}
                <button
                  type="button"
                  className="text-white hover:underline"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                >
                  {mode === 'login' ? '切换到注册' : '切换到登录'}
                </button>
              </p>
            </div>

            <div className="mt-12 text-center">
              <p className="text-[10px] uppercase tracking-widest text-zinc-700">
                漏 2026 VIVIDAILY
                <br />
                隐私政策与服务条款
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const LandingHero = ({ onStart }: { onStart: () => void }) => (
  <div className="relative min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden">
    <VideoBackground />

    <nav className="absolute top-0 w-full flex justify-between items-center px-12 h-16 z-50 glass-nav">
      <div className="text-2xl font-headline font-bold tracking-tighter text-white">ViviDaily</div>
      <div className="hidden lg:flex items-center gap-10">
        {['最新热点', '模型解析', '商业动态', '政策前沿'].map((item) => (
          <button key={item} className="text-zinc-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-1.5 group">
            {item}
            <ChevronRight size={12} className="rotate-90 opacity-40 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
      <button onClick={onStart} className="metallic-button">
        Get Started
      </button>
    </nav>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative z-10 text-center px-4 max-w-4xl"
    >
      <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-zinc-400 mb-8">
        <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
        AI 热点聚合
      </div>

      <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tighter text-white mb-8 leading-tight">
        ViviDaily: 洞察 AI 世界的
        <br />
        <span className="metallic-text">每日热点窗口</span>
      </h1>

      <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto mb-10 leading-relaxed">
        为你筛选昨天最值得关注的 AI 新闻，聚合热点、模型、商业、产品与政策动态，帮助你更快掌握真正重要的变化。
      </p>

      <button onClick={onStart} className="silver-metallic-button">
        Get Started
      </button>
    </motion.div>
  </div>
);

export const LoadingScreen = () => (
  <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
    <div className="w-full max-w-2xl text-center">
      <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-zinc-400 mb-8">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        ViviDaily Daily Fetch
      </div>

      <div className="relative w-20 h-20 mx-auto mb-8">
        <svg className="animate-spin w-full h-full" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tighter mb-4">正在抓取昨天的 AI 热点</h2>
      <p className="text-zinc-400 max-w-xl mx-auto leading-relaxed mb-10">
        系统正在聚合已启用的信息源，过滤低信号内容，整理摘要、标签与 HotScore，完成后将自动进入新闻流页面。
      </p>

      <div className="grid gap-3 text-left max-w-lg mx-auto">
        {[
          '拉取 RSS 信息源',
          '过滤非 AI 与低信号内容',
          '生成摘要、标签与 HotScore',
          '整理热门榜单与 AI 摘要',
        ].map((step) => (
          <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
