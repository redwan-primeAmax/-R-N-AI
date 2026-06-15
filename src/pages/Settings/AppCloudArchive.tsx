import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Upload, ChevronLeft, Loader2, 
  FileJson, CheckCircle2, AlertCircle, Package,
  HardDrive
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager } from '../../services/storage/DataManager';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';
import JSZip from 'jszip';

export default function AppCloudArchive() {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'success' | 'error'>('idle');
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<any | null>(null);
  const navigate = useNavigate();

  const handleExport = async () => {
    setStatus('preparing');
    setError(null);
    try {
      const encryptedData = await DataManager.exportAllData();
      
      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RN-AI-Backup-${Date.now()}.redwan`;
      a.click();
      URL.revokeObjectURL(url);
      
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('Export failed:', err);
      setError('ব্যাকআপ ফাইল তৈরি করতে সমস্যা হয়েছে।');
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
        setImportData({ encrypted: data });
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('Import failed:', err);
      setError('ব্যাকআপ ফাইলটি সঠিক নয় অথবা নষ্ট হয়ে গেছে।');
      setStatus('error');
    }
  };

  const confirmRestore = async () => {
    if (!importData) return;
    try {
      await DataManager.importAllData(importData.encrypted);
      setStatus('success');
      setImportData(null);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Restore failed:', err);
      setError('রিস্টোর করতে সমস্যা হয়েছে।');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-40">
      <header className="flex items-center gap-4 mb-12">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-white/60"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight">অ্যাপ ক্লাউড আর্কাইভ</h1>
          <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em]">Cloud Archive & Backups</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Toggle Mode */}
        <div className="flex bg-white/5 p-2 rounded-[24px] border border-white/5">
          <button 
            onClick={() => setMode('export')}
            className={`flex-1 py-4 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${
              mode === 'export' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-white/40 hover:text-white'
            }`}
          >
            ডাউনলোড ব্যাকআপ
          </button>
          <button 
            onClick={() => setMode('import')}
            className={`flex-1 py-4 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${
              mode === 'import' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-white/40 hover:text-white'
            }`}
          >
            রিস্টোর ব্যাকআপ
          </button>
        </div>

        <motion.div 
          className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 text-center"
        >
          <AnimatePresence mode="wait">
            {mode === 'export' ? (
              <motion.div 
                key="export"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 mx-auto">
                  <Download size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-2">আপনার ডেটা সুরক্ষিত রাখুন</h2>
                  <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
                    আপনার সব নোট, ওয়ার্কস্পেস এবং সেটিংস একটি রেডওয়ান (.redwan) ফাইলে ডাউনলোড করুন।
                  </p>
                </div>
                <button 
                  disabled={status === 'preparing'}
                  onClick={handleExport}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-3xl font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-600/10 flex items-center justify-center gap-3"
                >
                  {status === 'preparing' ? <Loader2 className="animate-spin" /> : <HardDrive size={18} />}
                  ব্যাকআপ ফাইল তৈরি করুন
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="import"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center text-orange-500 mx-auto">
                  <Upload size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-2">ব্যাকআপ রিস্টোর করুন</h2>
                  <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
                    আপনার আগের ডাউনলোড করা ব্যাকআপ (.redwan) ফাইলটি এখানে আপলোড করুন।
                  </p>
                </div>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".redwan"
                    onChange={handleImport}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    disabled={status === 'preparing'}
                  />
                  <div className="w-full py-5 bg-white/5 border-2 border-dashed border-white/10 group-hover:border-blue-500/50 rounded-3xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-white/40 group-hover:text-white">
                    {status === 'preparing' ? <Loader2 className="animate-spin" /> : <Package size={18} />}
                    ফাইল সিলেক্ট করুন
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-500 font-bold justify-center"
            >
              <CheckCircle2 size={20} /> সফল হয়েছে!
            </motion.div>
          )}

          {status === 'error' && error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 font-bold justify-center text-xs"
            >
              <AlertCircle size={20} /> {error}
            </motion.div>
          )}
        </motion.div>

        <div className="p-6 bg-yellow-500/5 rounded-[32px] border border-yellow-500/10">
          <h4 className="font-bold text-yellow-500 text-sm mb-2 flex items-center gap-2">
            <AlertCircle size={16} /> মনে রাখবেন
          </h4>
          <ul className="text-[11px] text-white/40 space-y-2 list-disc pl-4 italic">
            <li>ব্যাকআপ ফাইলটি সুরক্ষিত জায়গায় রাখুন।</li>
            <li>রিস্টোর করার আগে আপনার বর্তমান ডেটার ব্যাকআপ নিয়ে নিন।</li>
            <li>এক্সটার্নাল সেটিংস বা সিক্রেট কি ব্যাকআপে রাখা হয় না।</li>
          </ul>
        </div>
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
