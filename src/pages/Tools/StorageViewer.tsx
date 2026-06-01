import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, HardDrive, Trash2, FileText, 
  History, Camera, AlertCircle, CheckCircle2,
  RefreshCw, Loader2, Info, Zap, Box, Database, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import localforage from 'localforage';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';
import LoadingScreen from '../../components/LoadingScreen';
import { DataManager } from '../../services/storage/DataManager';
import { db } from '../../services/storage/DexieDB';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StorageItem {
  id: string;
  name: string;
  size: number;
  type: 'note' | 'media' | 'log' | 'task' | 'setting' | 'other' | 'cache';
  category: string;
  isDeletable: boolean;
}

export default function StorageViewer() {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<StorageItem | null>(null);
  const [totalUsed, setTotalUsed] = useState(0);
  const [totalQuota, setTotalQuota] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const navigate = useNavigate();

  const loadStorageDetails = useCallback(async () => {
    setLoading(true);
    try {
      const details: StorageItem[] = [];
      const usage = await DataManager.getStorageUsage();
      setTotalUsed(usage.used);
      setTotalQuota(usage.quota);

      // 1. Grouped Notes Content (High-Speed Memory-Safe Aggregation)
      const notesCount = await db.notes.count();
      if (notesCount > 0) {
        // Fetch only first 100 notes as a representative sample for size estimation
        const samples = await db.notes.limit(100).toArray();
        const totalSampleSize = samples.reduce((acc, note) => {
          return acc + (note.title?.length || 0) * 2 + (note.content?.length || 0) * 2 + 250;
        }, 0);
        const avgSize = samples.length > 0 ? totalSampleSize / samples.length : 1000;
        const totalNotesSize = Math.round(avgSize * notesCount);

        details.push({
          id: 'all-notes-group',
          name: `সমস্ত নোট ও কন্টেন্ট (${notesCount.toLocaleString()} টি নোট)`,
          size: totalNotesSize,
          type: 'note',
          category: 'নোট ও কন্টেন্ট',
          isDeletable: false, // Protected to prevent accidental loss of all notebook data
        });
      }

      // 2. Media
      const media = await db.media.toArray();
      for (const m of media) {
        details.push({
          id: `media-${m.id}`,
          name: `মিডিয়া ফাইল (${m.id.substring(6, 14)})`,
          size: m.blob.size,
          type: 'media',
          category: 'ছবি ও মিডিয়া',
          isDeletable: true
        });
      }

      // 3. AI History & Cache
      const chats = await db.chat_history.toArray();
      if (chats.length > 0) {
        const size = chats.reduce((acc, c) => acc + new Blob([JSON.stringify(c)]).size, 0);
        details.push({
          id: 'ai-chats',
          name: 'এআই চ্যাট হিস্ট্রি',
          size,
          type: 'cache',
          category: 'সিস্টেম ও ক্যাশ',
          isDeletable: false
        });
      }

      // 4. Removed Action History Log - User requested permanent removal

      // 5. Config
      const config = await db.key_value_pairs.toArray();
      const configSize = config.reduce((acc, c) => acc + new Blob([JSON.stringify(c)]).size, 0);
      details.push({
        id: 'system-config',
        name: 'সিস্টেম কনফিগারেশন',
        size: configSize,
        type: 'setting',
        category: 'কোর সিস্টেম',
        isDeletable: false
      });

      // 6. Legacy Cache (if any)
      const lfKeys = await localforage.keys();
      if (lfKeys.length > 0) {
        let lfSize = 0;
        for (const k of lfKeys) {
          const item = await localforage.getItem(k);
          if (item) lfSize += new Blob([JSON.stringify(item)]).size;
        }
        if (lfSize > 0) {
          details.push({
            id: 'legacy-cache',
            name: 'পুরানো ব্রাউজার ক্যাশ',
            size: lfSize,
            type: 'cache',
            category: 'সিস্টেম ও ক্যাশ',
            isDeletable: false
          });
        }
      }

      setItems(details.sort((a, b) => b.size - a.size));
    } catch (e) {
      console.error('Failed to load storage details:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStorageDetails();
  }, [loadStorageDetails]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    const item = itemToDelete;
    setDeletingId(item.id);
    setItemToDelete(null);
    try {
      if (item.type === 'note') {
        const id = item.id.replace('note-', '');
        await DataManager.deleteNotePermanent(id);
      } else if (item.id.startsWith('media-')) {
        const id = item.id.replace('media-', '');
        await DataManager.deleteMedia(id);
      }
      
      await loadStorageDetails();
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleQuickOptimize = async () => {
    setIsOptimizing(true);
    try {
      await DataManager.cleanLegacyCache();
      await DataManager.cleanUnusedMedia();
      await loadStorageDetails();
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const categories = Array.from(new Set(items.map(i => i.category)));
  const filteredItems = selectedCategory ? items.filter(i => i.category === selectedCategory) : items;
  const categorySizes = categories.map(cat => ({
    name: cat,
    size: items.filter(i => i.category === cat).reduce((acc, curr) => acc + curr.size, 0)
  })).sort((a, b) => b.size - a.size);

  const usagePercent = Math.min(100, (totalUsed / (totalQuota || 1)) * 100);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-32">
      {loading && <LoadingScreen />}
      <header className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => {
            navigate('/main');
          }}
          className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-all active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight uppercase">সঞ্চয়স্থান বিস্তারিত</h1>
          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">Detailed Storage & Data Analysis</p>
        </div>
      </header>

      {/* Main Stats Card */}
      <div className="p-8 bg-[#151516] border border-white/5 rounded-[40px] relative overflow-hidden mb-8">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">সর্বমোট ব্যবহৃত ডাটা</h3>
              <div className="text-4xl font-black tracking-tighter text-blue-400">{formatSize(totalUsed)}</div>
            </div>
            <div className="text-right">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">ব্রাউজার কোটা</h3>
              <div className="text-lg font-bold text-white/20">{formatSize(totalQuota)}</div>
            </div>
          </div>

          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${usagePercent}%` }}
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                usagePercent > 90 ? "bg-red-500" : "bg-gradient-to-r from-blue-500 to-purple-500"
              )}
            />
          </div>
          
          <div className="flex justify-between items-center mt-3">
            <span className="text-[10px] font-bold text-white/10 italic">ভরা হয়েছে {usagePercent.toFixed(1)}%</span>
            <span className="text-[10px] font-bold text-white/20">সার্ভার লিমিট অনুযায়ী</span>
          </div>

          {/* Advanced Optimizer button hidden per user request */}
        </div>
        <Database className="absolute -right-8 -bottom-8 text-white/[0.02]" size={200} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Category Breakdown */}
        <div className="lg:col-span-1 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-4">ক্যাটাগরি ব্রেকডাউন</h3>
          <div className="space-y-3">
            {categorySizes.map((cat, idx) => (
              <button 
                key={idx}
                onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-2xl transition-all",
                  selectedCategory === cat.name ? "bg-white/10" : "hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    idx === 0 ? "bg-blue-400" : idx === 1 ? "bg-purple-400" : "bg-emerald-400"
                  )} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{cat.name}</span>
                </div>
                <span className="font-mono text-[10px] font-bold text-white/40">{formatSize(cat.size)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
              {selectedCategory ? `${selectedCategory} এর ডাটা` : 'সব আইটেম সমূহ'}
            </h2>
            <button 
              onClick={loadStorageDetails}
              className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 size={32} className="animate-spin text-blue-500/50" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/10 italic">ডাটা প্রসেস হচ্ছে...</p>
                </div>
              ) : filteredItems.length > 0 ? filteredItems.map((item) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1 }}
                  className="group flex items-center justify-between p-4 bg-[#151516] border border-white/[0.03] rounded-[24px] hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border",
                      item.type === 'note' ? "bg-blue-500/5 border-blue-500/10 text-blue-400" :
                      item.type === 'media' ? "bg-purple-500/10 border-purple-500/20 text-purple-400" :
                      item.type === 'log' || item.type === 'cache' ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" :
                      "bg-white/5 border-white/10 text-white/20"
                    )}>
                      {item.type === 'note' ? <FileText size={18} /> :
                       item.type === 'media' ? <Camera size={18} /> :
                       item.type === 'log' ? <History size={18} /> :
                       item.type === 'cache' ? <Zap size={18} /> :
                       <HardDrive size={18} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[13px] text-white/80 truncate">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{item.category}</span>
                         {item.isDeletable && <div className="w-1 h-1 bg-white/5 rounded-full" />}
                         {item.isDeletable && <span className="text-[8px] font-bold text-blue-500/50 uppercase">ইউজার ডাটা</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="font-mono text-[11px] font-bold text-white/40">{formatSize(item.size)}</div>
                    {item.isDeletable ? (
                      <button 
                        onClick={() => setItemToDelete(item)}
                        disabled={deletingId === item.id}
                        className="p-3 hover:bg-red-500/10 rounded-xl text-white/10 hover:text-red-500 transition-all group/del"
                      >
                        {deletingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    ) : (
                      <div className="p-3 opacity-0 cursor-default">
                        <Trash2 size={16} />
                      </div>
                    )}
                  </div>
                </motion.div>
              )) : (
                <div className="py-20 text-center space-y-4 bg-white/[0.01] rounded-[32px] border border-dashed border-white/5">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                    <Info size={24} className="text-white/10" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">কোন আইটেম পাওয়া যায়নি</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="p-6 bg-orange-500/5 border border-orange-500/10 rounded-3xl flex gap-4">
        <AlertCircle className="text-orange-400 shrink-0" size={20} />
        <p className="text-[11px] text-orange-200/40 leading-relaxed font-medium">
          <strong className="text-orange-400 block mb-1 uppercase tracking-widest text-[9px]">লক্ষ্য করুন</strong>
          এখানে দেখানো ডাটাগুলো আপনার এই ডিভাইসে অফলাইনে সংরক্ষিত আছে। ব্রাউজার ক্যাশ ক্লিয়ার করলে ডাটাবেস ছাড়া ক্যাশ ফাইলগুলো মুছে যেতে পারে। নোটগুলো ব্যাকআপ রাখতে ক্লাউড আর্কাইভ ব্যবহার করুন।
        </p>
      </div>

      <ConfirmDialog
        isOpen={itemToDelete !== null}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="স্থায়ীভাবে মুছুন"
        message={`আপনি কি নিশ্চিতভাবে "${itemToDelete?.name}" চিরতরে মুছে ফেলতে চান? এটি আর কোনোভাবেই পুনরুদ্ধার সম্ভব হবে না।`}
        variant="danger"
        confirmText="হ্যাঁ, মুছুন"
        cancelText="বাতিল"
      />
    </div>
  );
}
