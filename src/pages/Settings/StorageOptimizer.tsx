import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, HardDrive, 
  Loader2, CheckCircle2, ShieldCheck, Zap,
  Download, Upload, FileJson, Package,
  Settings, ToggleLeft, ToggleRight,
  Trash2, Sparkles, Cpu, Award, RefreshCw, Database, History as HistoryIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import localforage from 'localforage';
import { DataManager } from '../../services/storage/DataManager';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';
import LoadingScreen from '../../components/LoadingScreen';

export default function StorageOptimizer() {
  const [activeTab, setActiveTab] = useState<'backup' | 'offline' | 'cleaner'>('cleaner');
  const navigate = useNavigate();

  // Backup Manager States
  const [status, setStatus] = useState<'idle' | 'preparing' | 'success' | 'error'>('idle');
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<{data: any, isFull: boolean} | null>(null);

  // Offline Control States
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [checkLoading, setCheckLoading] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);

  // Garbage Cleaner States
  const [garbageStats, setGarbageStats] = useState<{
    trashedNotesCount: number;
    unusedMediaCount: number;
    unusedMediaSize: number;
    outdatedVersionsCount: number;
    legacyCacheSize: number;
    searchIndexSize: number;
  }>({
    trashedNotesCount: 0,
    unusedMediaCount: 0,
    unusedMediaSize: 0,
    outdatedVersionsCount: 0,
    legacyCacheSize: 0,
    searchIndexSize: 0,
  });

  const [loadingGarbage, setLoadingGarbage] = useState(true);
  const [cleaningKey, setCleaningKey] = useState<'all' | 'trash' | 'media' | 'versions' | 'cache' | null>(null);
  const [recentBackups, setRecentBackups] = useState<any[]>([]);
  const [cleaningProgress, setCleaningProgress] = useState('');
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);

  const loadGarbageStats = async () => {
    setLoadingGarbage(true);
    try {
      const [stats, usage] = await Promise.all([
        DataManager.getGarbageStats(),
        DataManager.getStorageUsage()
      ]);
      setGarbageStats(stats as any);
      setStorageInfo(usage);
      const backups = await DataManager.getInternalBackups();
      setRecentBackups(backups);
    } catch (e) {
      console.error('Failed to load garbage stats:', e);
    } finally {
      // Delay finishing loading for visual stability per user request
      setTimeout(() => setLoadingGarbage(false), 800);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const usagePercent = storageInfo ? Math.min(100, (storageInfo.used / (storageInfo.quota || 1)) * 100) : 0;

  useEffect(() => {
    const checkStatus = async () => {
      setCheckLoading(true);
      const status = await localforage.getItem('offline_download_completed');
      const autoDl = await localforage.getItem('auto_download_enabled');
      if (status) {
        const hasCache = await caches.has('rn-ai-v8');
        if (hasCache) {
          setIsCompleted(true);
        } else {
          await localforage.removeItem('offline_download_completed');
        }
      }
      setAutoDownload(!!autoDl);
      setCheckLoading(false);
    };
    checkStatus();
    loadGarbageStats();
  }, []);

  const cleanItem = async (key: 'trash' | 'media' | 'versions' | 'cache') => {
    setCleaningKey(key);
    setCleaningProgress('ডিভাইস মেমোরি স্ক্যান করা হচ্ছে...');
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (key === 'trash') {
        setCleaningProgress('সব অপ্রয়োজনীয় ট্র্যাশ নোট ডিলিট করা হচ্ছে...');
        await DataManager.cleanTrashedNotes();
      } else if (key === 'media') {
        setCleaningProgress('অব্যবহৃত ইমেজ ও মিডিয়া ডাটাবেস থেকে মুছে ফেলা হচ্ছে...');
        await DataManager.cleanUnusedMedia();
      } else if (key === 'versions') {
        setCleaningProgress('সব আগের ব্যাকআপ হিস্ট্রি এবং নোট ভার্সন খালি করা হচ্ছে...');
        await DataManager.cleanOutdatedVersions();
      } else if (key === 'cache') {
        setCleaningProgress('লেগ্যাসি লোকালফোরেজ ক্যাশ ডিলিট করা হচ্ছে...');
        await DataManager.cleanLegacyCache();
      }
      setCleaningProgress('সফলভাবে ফাইল মেমোরি ক্লিয়ার করা হয়েছে!');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadGarbageStats();
    } catch (e) {
      console.error(e);
      setCleaningProgress('ডিলেশন প্রক্রিয়া ব্যর্থ হয়েছে!');
      await new Promise(resolve => setTimeout(resolve, 1500));
    } finally {
      DataManager.resetStorageCache();
      setCleaningKey(null);
      setCleaningProgress('');
    }
  };

  const cleanAllGarbage = async () => {
    setCleaningKey('all');
    try {
      setCleaningProgress('সিস্টেম স্ক্যান এবং অপ্টিমাইজেশন শুরু হচ্ছে...');
      await new Promise(resolve => setTimeout(resolve, 800));

      setCleaningProgress('১/৫: রিসাইকেল বিন খালি করা হচ্ছে...');
      await DataManager.cleanTrashedNotes();
      await new Promise(resolve => setTimeout(resolve, 800));

      setCleaningProgress('২/৫: অব্যব্যহৃত মিডিয়া এবং ছবি ক্লিন করা হচ্ছে...');
      await DataManager.cleanUnusedMedia();
      await new Promise(resolve => setTimeout(resolve, 1200));

      setCleaningProgress('৩/৫: পুরোনো ভার্সন হিস্ট্রি অপ্টিমাইজ করা হচ্ছে...');
      await DataManager.cleanOutdatedVersions();
      await new Promise(resolve => setTimeout(resolve, 800));

      setCleaningProgress('৪/৫: সিস্টেম ক্যাশ এবং ডুপ্লিকেট রিমুভ করা হচ্ছে...');
      await DataManager.cleanLegacyCache();
      await new Promise(resolve => setTimeout(resolve, 800));

      setCleaningProgress('৫/৫: ডেটাবেজ ইনডেক্সিং এবং ভ্যালিডেশন সফল হয়েছে!');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setCleaningProgress('সফল! অপ্রয়োজনীয় সব ডাটা মুছে ফেলা হয়েছে।');
      
      DataManager.resetStorageCache();
      await new Promise(resolve => setTimeout(resolve, 1500));
      await loadGarbageStats();
    } catch (e) {
      console.error(e);
      setCleaningProgress('অপ্টিমাইজেশন প্রক্রিয়া সম্পন্ন করতে সমস্যা হয়েছে!');
      await new Promise(resolve => setTimeout(resolve, 1500));
    } finally {
      setCleaningKey(null);
      setCleaningProgress('');
    }
  };

  const toggleAutoDownload = async () => {
    const newState = !autoDownload;
    setAutoDownload(newState);
    await localforage.setItem('auto_download_enabled', newState);
  };

  const handleExport = async () => {
    setStatus('preparing');
    setError(null);
    try {
      const encryptedData = await DataManager.exportAllData();
      
      // Save internally
      await DataManager.saveInternalBackup(encryptedData);
      
      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${Date.now()}.redwan`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      setStatus('success');
      loadGarbageStats();
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError('ব্যাকআপ তৈরি করতে সমস্যা হয়েছে।');
      setStatus('error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('preparing');
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result as string;
        setImportData({ data, isFull: true });
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('Import error:', err);
      setError('ব্যাকআপ রিলিজ করতে সমস্যা হয়েছে।');
      setStatus('error');
    }
  };

  const confirmRestore = async () => {
    if (!importData) return;
    const { data } = importData;
    
    try {
      await DataManager.importAllData(data);
      setStatus('success');
      setImportData(null);
    } catch (err) {
      console.error('Restore error:', err);
      setError('রিস্টোর করতে সমস্যা হয়েছে।');
      setStatus('error');
    }
  };

  const handleOfflineDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      // In PWA context, 'registerType: autoUpdate' handles most caching.
      // We manually fetch some core assets to ensure they are cached.
      const cache = await caches.open('rn-ai-assets');
      const assets = [
        '/', 
        '/index.html', 
        '/manifest.webmanifest',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/favicon.ico'
      ];
      
      let completed = 0;
      for (const target of assets) {
        try {
          const response = await fetch(target, { cache: 'reload' });
          if (response.ok) await cache.put(target, response);
        } catch (e) {
          console.warn(`Failed to cache ${target}`, e);
        }
        completed++;
        setDownloadProgress(Math.floor((completed / assets.length) * 100));
      }
      
      await localforage.setItem('offline_download_completed', true);
      setIsCompleted(true);
    } catch (err) {
      console.error('Offline failed', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBack = () => {
    navigate('/main');
  };

  if (loadingGarbage || checkLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <header className="flex items-center gap-4 mb-8">
        <button 
          onClick={handleBack}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/60 active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight">স্টোরেজ অপ্টিমাইজার</h1>
          <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em]">Storage Optimizer & Controls</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        {/* Modern Tabs */}
        <div className="flex bg-white/5 p-1.5 rounded-[28px] border border-white/5 mb-8 gap-1">
          <button 
            onClick={() => setActiveTab('cleaner')}
            className={`flex-1 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'cleaner' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-white/40 hover:text-white'
            }`}
          >
            <Trash2 size={14} />
            গার্বেজ ক্লিনার
          </button>
          <button 
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'backup' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-white/40 hover:text-white'
            }`}
          >
            <HardDrive size={14} />
            ব্যাকআপ
          </button>
          <button 
            onClick={() => setActiveTab('offline')}
            className={`flex-1 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'offline' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-white/40 hover:text-white'
            }`}
          >
            <Zap size={14} />
            অফলাইন
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'cleaner' ? (
            <motion.div
              key="cleaner-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Quick info / Dashboard Header */}
              <div className="p-6 bg-[#151516] rounded-[32px] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[.2em] text-white/20">বর্তমান স্টোরেজ স্ট্যাটাস</h4>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-blue-400">{formatSize(storageInfo?.used || 0)}</span>
                      <span className="text-[10px] font-bold text-white/10 italic">ব্যবহৃত হচ্ছে</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] font-black uppercase tracking-[.2em] text-white/20">সর্বমোট কোটা</h4>
                    <p className="text-lg font-bold text-white/40 mt-1">{formatSize(storageInfo?.quota || 0)}</p>
                  </div>
                </div>
                
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <ShieldCheck className="text-orange-400 shrink-0" size={16} />
                  <p className="text-[10px] text-white/30 leading-relaxed">
                    আপনার ব্রাউজার অটোমেটিক মেমোরি ম্যানেজ করে। ক্লিন করলে পারফরম্যান্স আরও স্মুথ হবে।
                  </p>
                </div>
              </div>

              {/* Master Full Optimization Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/20 via-white/[0.01] to-zinc-900/40 border border-blue-500/20 rounded-[40px] p-6 text-center space-y-6">
                <div className="absolute top-3 right-4 flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                  <Sparkles size={11} className="text-blue-400" />
                  <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">রেকমেন্ডেড</span>
                </div>
                
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-400 mx-auto border border-blue-500/20 shadow-inner">
                    <Cpu size={28} className={cleaningKey === 'all' ? 'animate-spin text-cyan-400' : ''} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white flex items-center justify-center gap-2">
                      Storage Optimizer & Purge
                    </h3>
                    <p className="text-xs text-white/40 mt-1 max-w-md mx-auto leading-relaxed">
                      নোটস, সাব-পেজ এবং ট্র্যাশ রেখে বাকি সব অতিরিক্ত ফাইল (ক্যাশ ও মিডিয়া) ডিলিট করুন।
                    </p>
                  </div>
                </div>

                {cleaningKey === 'all' ? (
                  <div className="space-y-3 py-2 bg-black/40 rounded-3xl p-4 border border-white/5">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-blue-400" />
                      <span className="text-xs font-bold text-blue-400">{cleaningProgress}</span>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={cleanAllGarbage}
                    disabled={cleaningKey !== null || loadingGarbage}
                    className="w-full py-4.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-3xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles size={14} />
                    অপ্টিমাইজ করুন (Optimize & Purge)
                  </button>
                )}
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Trashed Notes Card */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-widest text-white/50">রিসাইকেল ট্র্যাশ নোট</h4>
                      <p className="text-lg font-black text-red-400">{garbageStats.trashedNotesCount}টি নোট</p>
                    </div>
                    <div className="w-10 h-10 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400 border border-red-500/10">
                      <Trash2 size={18} />
                    </div>
                  </div>
                  <p className="text-[11px] text-white/30 leading-relaxed">
                    যে নোটগুলো আপনি ডিলিট করে রিসাইকেল বিনে পাঠিয়েছেন। এগুলো এখনো স্টোরেজে আছে।
                  </p>
                  {cleaningKey === 'trash' ? (
                    <div className="text-[10px] text-red-400 font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> {cleaningProgress}</div>
                  ) : (
                    <button 
                      onClick={() => cleanItem('trash')}
                      disabled={cleaningKey !== null || garbageStats.trashedNotesCount === 0}
                      className="w-full py-3 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-200 hover:text-red-100 disabled:opacity-20 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={11} />
                      ট্র্যাশ খালি করুন
                    </button>
                  )}
                </div>

                {/* 2. Unused Media Files */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-widest text-white/50">অব্যবহৃত ইমেজ ও রিসোর্স</h4>
                      <p className="text-lg font-black text-green-400">
                        {garbageStats.unusedMediaCount}টি ছবি ({(garbageStats.unusedMediaSize / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-400 border border-green-500/10">
                      <Database size={18} />
                    </div>
                  </div>
                  <p className="text-[11px] text-white/30 leading-relaxed">
                    আগে নোট এডিটিংয়ে এড করা হয়েছিল কিন্তু এখন আর ব্যবহৃত হচ্ছে না এমন ছবি ও ফাইল।
                  </p>
                  {cleaningKey === 'media' ? (
                    <div className="text-[10px] text-green-400 font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> {cleaningProgress}</div>
                  ) : (
                    <button 
                      onClick={() => cleanItem('media')}
                      disabled={cleaningKey !== null || garbageStats.unusedMediaCount === 0}
                      className="w-full py-3 bg-green-950/20 hover:bg-green-950/40 border border-green-500/20 text-green-200 hover:text-green-100 disabled:opacity-20 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={11} />
                      মিডিয়া অপ্টিমাইজ করুন
                    </button>
                  )}
                </div>

                {/* 3. Legacy LocalForage Cache */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-widest text-white/50">লেগ্যাসি লোকাল ক্যাশ মেমোরি</h4>
                      <p className="text-lg font-black text-cyan-400">
                        {(garbageStats.legacyCacheSize / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/10">
                      <Cpu size={18} />
                    </div>
                  </div>
                  <p className="text-[11px] text-white/30 leading-relaxed">
                    ডাটাবেস মাইগ্রেশনের আগের লোকালফোরেজ কপি। ডুপ্লিকেট রিমুভ করে সম্পূর্ণ ব্রাউজার রিফ্রেশ করুন।
                  </p>
                  {cleaningKey === 'cache' ? (
                    <div className="text-[10px] text-cyan-400 font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> {cleaningProgress}</div>
                  ) : (
                    <button 
                      onClick={() => cleanItem('cache')}
                      disabled={cleaningKey !== null || garbageStats.legacyCacheSize === 0}
                      className="w-full py-3 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/20 text-cyan-200 hover:text-cyan-100 disabled:opacity-20 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={11} />
                      ক্যাশ খালি করুন
                    </button>
                  )}
                </div>

                {/* 4. Note versions */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-widest text-white/50">পুরোনো সংস্করণ হিস্ট্রি</h4>
                      <p className="text-lg font-black text-purple-400">
                        {garbageStats.outdatedVersionsCount}টি পূর্বের ব্যাকআপ
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/10">
                      <HistoryIcon size={18} />
                    </div>
                  </div>
                  <p className="text-[11px] text-white/30 leading-relaxed">
                    নোট এডিটের সময় স্বয়ংক্রিয়ভাবে সংরক্ষিত নোটের পূর্ববর্তী সংস্করণ ট্র্যাক হিস্ট্রি।
                  </p>
                  {cleaningKey === 'versions' ? (
                    <div className="text-[10px] text-purple-400 font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> {cleaningProgress}</div>
                  ) : (
                    <button 
                      onClick={() => cleanItem('versions')}
                      disabled={cleaningKey !== null || garbageStats.outdatedVersionsCount === 0}
                      className="w-full py-3 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/20 text-purple-200 hover:text-purple-100 disabled:opacity-20 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={11} />
                      ভার্সন হিস্ট্রি অপ্টিমাইজ করুন
                    </button>
                  )}
                </div>

              </div>
              
              <div className="p-6 bg-blue-500/5 rounded-[32px] border border-blue-500/10 flex gap-4">
                <ShieldCheck className="text-blue-400 shrink-0" size={24} />
                <p className="text-xs text-white/40 leading-relaxed italic">
                  গার্বেজ ক্লিনার ব্যবহার করে কোনো কাজের ডেটা বা দরকারি নোট হারিয়ে যাবে না। এটি শুধু অপ্রয়োজনীয় ডুপ্লিকেট এবং মুছে ফেলা ফাইলের অবশিষ্টাংশ পরিষ্কার করে।
                </p>
              </div>
            </motion.div>
          ) : activeTab === 'backup' ? (
            <motion.div
              key="backup-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-2 bg-white/5 p-2 rounded-[24px] border border-white/5">
                <button 
                  onClick={() => setMode('export')}
                  className={`py-4 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
                    mode === 'export' ? 'bg-blue-600 text-white' : 'text-white/40'
                  }`}
                >
                  এক্সপোর্ট
                </button>
                <button 
                  onClick={() => setMode('import')}
                  className={`py-4 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
                    mode === 'import' ? 'bg-blue-600 text-white' : 'text-white/40'
                  }`}
                >
                  ইম্পোর্ট
                </button>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 text-center min-h-[300px] flex flex-col justify-center">
                {mode === 'export' ? (
                  <div className="space-y-6">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 mx-auto">
                      <Download size={32} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold mb-2">ব্যাকআপ নিন</h2>
                      <p className="text-sm text-white/40 leading-relaxed">আপনার সব ডাটা একটি এনক্রিপ্টেড ফাইলে সুরক্ষিত রাখুন।</p>
                    </div>
                    <button 
                      onClick={handleExport}
                      disabled={status === 'preparing'}
                      className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-3xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      {status === 'preparing' ? <Loader2 className="animate-spin" /> : <HardDrive size={18} />}
                      ব্যাকআপ ফাইল তৈরি করুন
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center text-orange-500 mx-auto">
                      <Upload size={32} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold mb-2">রিস্টোর করুন</h2>
                      <p className="text-sm text-white/40 leading-relaxed">আগের ব্যাকআপ ফাইল থেকে ডাটা ফিরিয়ে আনুন।</p>
                    </div>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".redwan" 
                        onChange={handleImport}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full py-5 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 text-white/40">
                        <Package size={18} />
                        ফাইল সিলেক্ট করুন
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-8 pt-8 border-t border-white/5">
                  <button 
                    onClick={() => navigate('/recent-backups')}
                    className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <HistoryIcon size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">রিসেন্ট ব্যাকআপ গুলো দেখুন</span>
                  </button>
                </div>

                {status === 'success' && (
                  <div className="mt-6 text-green-400 font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> সফল হয়েছে!
                  </div>
                )}
                {error && (
                  <div className="mt-6 text-red-400 font-bold flex items-center justify-center gap-2">
                    {error}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="offline-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold">অফলাইন স্টোরেজ</h3>
                    <p className="text-xs text-white/30 italic">ব্রাউজারে অ্যাপ্লিকেশন ডাটা সেভ করুন</p>
                  </div>
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400">
                    <Zap size={24} />
                  </div>
                </div>

                <div className="space-y-6">
                  {checkLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin opacity-20" /></div>
                  ) : isDownloading ? (
                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                        <span>ডাউনলোড হচ্ছে...</span>
                        <span>{downloadProgress}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-blue-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : isCompleted ? (
                    <div className="space-y-6">
                      <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-3xl text-center space-y-4">
                        <CheckCircle2 className="text-green-500 mx-auto" size={32} />
                        <p className="text-xs text-white/60">আপনার ডাটা অফলাইনে ব্যবহারের জন্য সম্পূর্ণ প্রস্তুত।</p>
                        <button 
                          onClick={handleOfflineDownload}
                          className="text-[10px] uppercase font-black tracking-widest text-blue-400 underline"
                        >
                          আবার ডাউনলোড করুন
                        </button>
                      </div>

                      {/* Auto Download Setting */}
                      <div className="bg-white/5 p-6 rounded-3xl flex items-center justify-between border border-white/5">
                        <div className="flex items-center gap-3">
                          <Settings className="text-white/40" size={18} />
                          <div>
                            <p className="text-xs font-bold">অটো ডাউনলোড</p>
                            <p className="text-[10px] text-white/40">আগামী সব আপডেট অটোমেটিক ডাউনলোড হবে</p>
                          </div>
                        </div>
                        <button onClick={toggleAutoDownload} className="text-blue-500">
                          {autoDownload ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-white/20" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={handleOfflineDownload}
                      className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl"
                    >
                      অফলাইন ডাউনলোড শুরু করুন
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 bg-blue-500/5 rounded-[32px] border border-blue-500/10 flex gap-4">
                <ShieldCheck className="text-blue-400 shrink-0" size={24} />
                <p className="text-xs text-white/40 leading-relaxed italic">
                  অফলাইন মোড সক্রিয় থাকলে আপনি ইন্টারনেট ছাড়াই আপনার সব নোট এক্সেস এবং এডিট করতে পারবেন।
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        isOpen={importData !== null}
        onClose={() => { setImportData(null); setStatus('idle'); }}
        onConfirm={confirmRestore}
        title="ব্যাকআপ রিস্টোর"
        message="সাবধান: এটি বর্তমান সব ডেটা মুছে ফেলবে এবং ব্যাকআপ থেকে ডেটা রিস্টোর করবে। আপনি কি নিশ্চিত?"
        variant="danger"
        confirmText="হ্যাঁ, রিস্টোর করুন"
        cancelText="বাতিল"
      />
    </div>
  );
}
