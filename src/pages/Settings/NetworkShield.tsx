import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, HardDrive, DownloadCloud, 
  Loader2, CheckCircle2, ShieldCheck, Zap,
  Bell, BellOff, Timer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import localforage from 'localforage';

export default function NetworkShield() {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIframe, setIsIframe] = useState(false);
  const [checkLoading, setCheckLoading] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(Notification.permission);
  const [isScheduling, setIsScheduling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    const checkStatus = async () => {
      setCheckLoading(true);
      const status = await localforage.getItem('offline_download_completed');
      if (status) {
        // Double check cache existence
        const hasCache = await caches.has('rn-ai-v8');
        if (hasCache) {
          setIsCompleted(true);
        } else {
          await localforage.removeItem('offline_download_completed');
        }
      }
      setCheckLoading(false);
    };
    checkStatus();

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      console.log('Install prompt captured');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleOfflineDownload = async () => {
    setIsDownloading(true);
    setIsCompleted(false);
    setDownloadProgress(0);
    
    try {
      const cache = await caches.open('rn-ai-v8');
      const routesToFetch = [
        '/',
        '/main',
        '/settings',
        '/workspaces',
        '/recycle-bin',
        '/inbox',
        '/search',
        '/offline',
        '/backup',
        '/template',
        '/external-ai-import'
      ];

      const vitalAssets = [
        '/index.html',
        '/manifest.webmanifest',
        '/sw.js',
        '/src/main.tsx',
        '/src/App.tsx',
        '/src/index.css'
      ];

      // Safe Deep Priming: Try to trigger dynamic imports to ensure chunks hit the SW
      const primeDynamicImports = async () => {
        try {
          if (!navigator.onLine) return;

          // These are the main entry points for chunks
          const loaders = [
            () => import('../Home/HomePage'),
            () => import('../Editor/EditorPage'),
            () => import('../Workspace/WorkspacePage'),
            () => import('../Trash/RecycleBin'),
            () => import('../Search/SearchPage'),
            () => import('../Templates/BrowseTemplates'),
            () => import('../AI/AIContentArchitect'),
            () => import('../AI/AIConfiguration'),
            () => import('../Tools/ToolsDashboard')
          ];
          
          for (const load of loaders) {
            try {
              await load();
            } catch (e) {
              console.warn('Priming failed for a module', e);
            }
          }
        } catch (e) {
          console.error('Deep priming error', e);
        }
      };

      // Run priming first to get module chunks into fetch cycle
      await primeDynamicImports();

      const allToCache = [...vitalAssets, ...routesToFetch];
      let completed = 0;

      for (const target of allToCache) {
        try {
          const response = await fetch(target, { cache: 'no-cache' });
          if (response.ok) {
            await cache.put(target, response);
          }
        } catch (e) {
          console.warn(`Failed to preload ${target}:`, e);
        }
        completed++;
        setDownloadProgress(Math.floor((completed / allToCache.length) * 100));
      }

      await localforage.setItem('offline_download_completed', true);
      setIsDownloading(false);
      setIsCompleted(true);
    } catch (err) {
      console.error('Offline download failed:', err);
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <header className="flex items-center gap-4 mb-12">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-white/60"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight">নেটওয়ার্ক শিল্ড</h1>
          <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em]">Network Shield & Performance</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Offline Options Card */}
        <div className="grid grid-cols-1 gap-4">
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/backup')}
            className="p-8 bg-blue-600 rounded-[40px] flex items-center justify-between group overflow-hidden relative"
          >
            <div className="relative z-10 text-left">
              <h2 className="text-xl font-black uppercase tracking-tight mb-1">ব্যাকআপ</h2>
              <p className="text-white/60 text-xs font-bold leading-tight max-w-[180px]">আপনার ডেটা এক্সপোর্ট বা ইম্পোর্ট করুন</p>
            </div>
            <div className="relative z-10 w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center">
              <HardDrive size={32} />
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          </motion.button>

          <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[40px] space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">অফলাইন ডাউনলোড</h3>
                <p className="text-xs text-white/30 italic">ব্রাউজার ক্যাশে অ্যাপটি সেভ করুন</p>
              </div>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400">
                <Zap size={24} />
              </div>
            </div>

            <div className="space-y-4">
              {checkLoading ? (
                <div className="w-full py-5 flex items-center justify-center gap-3 text-white/40">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest">স্ট্যাটাস চেক করা হচ্ছে...</span>
                </div>
              ) : isDownloading ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                    <span>অফলাইন ক্যাশে ডাউনলোড হচ্ছে...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${downloadProgress}%` }}
                      className="h-full bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    />
                  </div>
                </div>
              ) : isCompleted ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-green-400 text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 size={16} />
                      অফলাইন ডাটা সেভ করা আছে
                    </div>
                    <p className="text-[9px] text-white/30 text-center">আপনি এখন ইন্টারনেট ছাড়াই অ্যাপটি ব্যবহার করতে পারবেন।</p>
                  </div>
                  <button 
                    onClick={handleOfflineDownload}
                    className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[32px] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <DownloadCloud size={18} />
                    আবার ডাউনলোড করুন (Retry)
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleOfflineDownload}
                  className="w-full py-5 bg-white text-black hover:bg-white/90 rounded-[32px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                >
                  <DownloadCloud size={20} />
                  অফলাইন ডাউনলোড শুরু করুন
                </button>
              )}

              {installPrompt && (
                <button 
                  onClick={handleInstall}
                  className="w-full py-5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-[32px] font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-blue-500/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  <Zap size={18} />
                  হোম স্ক্রিনে অ্যাপ সেটআপ করুন
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
              <ShieldCheck size={20} className="text-blue-400 shrink-0" />
              <div className="space-y-2">
                <p className="text-[10px] text-white/40 leading-tight">
                  একবার সফলভাবে ডাউনলোড হয়ে গেলে, আপনি ইন্টারনেট ছাড়াই অ্যাপটি ব্যবহার করতে পারবেন। 
                </p>
                {isIframe && (
                  <button 
                    onClick={handleOpenNewTab}
                    className="text-[10px] text-blue-400 font-bold underline decoration-blue-400/30 underline-offset-4"
                  >
                    সরাসরি ব্রাউজারে ওপেন করুন (নতুন ট্যাব)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
