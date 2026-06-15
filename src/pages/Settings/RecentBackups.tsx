import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Trash2, Download, 
  Clock, Database, ShieldCheck, 
  CheckCircle2, Loader2, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager } from '../../services/storage/DataManager';

export default function RecentBackups() {
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  const navigate = useNavigate();

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const b = await DataManager.getInternalBackups();
      setBackups(b);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(id);
    try {
      await DataManager.deleteInternalBackup(id);
      await loadBackups();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownload = (backup: any) => {
    const blob = new Blob([backup.data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${backup.timestamp}.redwan`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    setStatus('success');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-40">
      <header className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => navigate(-1)}
          className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-all active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight uppercase">রিসেন্ট ব্যাকআপ</h1>
          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">Previous Data Backups</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="p-6 bg-blue-500/5 rounded-[32px] border border-blue-500/10 flex gap-4">
          <ShieldCheck className="text-blue-400 shrink-0" size={24} />
          <div>
            <h4 className="text-sm font-bold text-white/80">সুরক্ষিত লোকাল ব্যাকআপ</h4>
            <p className="text-[11px] text-white/40 leading-relaxed mt-1">
              আপনার শেষ ১০টি সফল ব্যাকআপ এখানে সংরক্ষিত থাকে। ব্রাউজার ক্যাশ ক্লিয়ার করলে এগুলো মুছে যেতে পারে, তাই নিয়মিত ফাইলটি ডাউনলোড করে রাখা ভালো।
            </p>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
              <RefreshCw className="animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">লোড হচ্ছে...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-20 space-y-4 bg-white/[0.02] rounded-[40px] border border-dashed border-white/5">
              <Database className="mx-auto text-white/10" size={48} />
              <p className="text-sm font-bold text-white/20">কোনো ব্যাকআপ রেকর্ড নেই</p>
            </div>
          ) : (
            backups.map((backup) => (
              <motion.div 
                key={backup.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative p-6 bg-[#151516] border border-white/5 rounded-[32px] hover:border-white/10 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400">
                      <Database size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white/90">ডাটা ব্যাকআপ - {formatSize(backup.size)}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={12} className="text-white/20" />
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                          {new Date(backup.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDownload(backup)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-blue-400 transition-all"
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(backup.id, e)}
                      disabled={isDeleting === backup.id}
                      className="p-3 bg-white/5 hover:bg-red-500/10 rounded-2xl text-white/20 hover:text-red-500 transition-all"
                    >
                      {isDeleting === backup.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        <AnimatePresence>
          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-green-500 text-white rounded-full font-bold flex items-center gap-2 shadow-2xl z-50"
            >
              <CheckCircle2 size={18} /> ডাউনলোড শুরু হয়েছে
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
