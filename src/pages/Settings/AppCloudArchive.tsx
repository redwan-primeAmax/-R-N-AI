/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Upload, ChevronLeft, Loader2, 
  CheckCircle2, AlertCircle, Package,
  HardDrive, Cloud, Clock, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager } from '../../services/storage/DataManager';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';

export default function AppCloudArchive() {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'success' | 'error'>('idle');
  const [mode, setMode] = useState<'drive' | 'local'>('local');
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<any | null>(null);

  const navigate = useNavigate();

  // Local Export
  const handleLocalExport = async () => {
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

  // Local Import Selection
  const handleLocalImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Confirm Local Restore
  const confirmLocalRestore = async () => {
    if (!importData) return;
    try {
      await DataManager.importAllData(importData.encrypted);
      setStatus('success');
      setImportData(null);
      setTimeout(() => navigate('/main'), 1500);
    } catch (err) {
      console.error('Restore failed:', err);
      setError('রিস্টোর করতে সমস্যা হয়েছে।');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-40">
      <header className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/settings')}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-white/60"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight">অ্যাপ ক্লাউড আর্কাইভ</h1>
          <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em]">Cloud Backup & Storage</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Mode Selector */}
        <div className="flex bg-white/5 p-2 rounded-[24px] border border-white/5">
          <button 
            onClick={() => setMode('local')}
            className={`flex-1 py-3.5 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              mode === 'local' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-white/40 hover:text-white'
            }`}
          >
            <HardDrive size={16} /> লোকাল ব্যাকআপ
          </button>
          <button 
            onClick={() => setMode('drive')}
            className={`flex-1 py-3.5 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 relative ${
              mode === 'drive' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-white/40 hover:text-white'
            }`}
          >
            <Cloud size={16} /> গুগল ড্রাইভ
            <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[9px] font-black rounded-md tracking-normal">
              SOON
            </span>
          </button>
        </div>

        <motion.div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8">
          <AnimatePresence mode="wait">
            {mode === 'drive' ? (
              <motion.div 
                key="drive-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-400 mx-auto border border-amber-500/20 relative">
                  <Cloud size={38} />
                  <div className="absolute -top-1 -right-1 p-1 bg-amber-500 text-black rounded-full shadow-lg">
                    <Clock size={14} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-black uppercase tracking-widest">
                    <Sparkles size={14} /> শীঘ্রই আসছে (Coming Soon)
                  </div>
                  <h2 className="text-xl font-bold">গুগল ড্রাইভ ক্লাউড সিঙ্ক</h2>
                  <p className="text-xs text-white/50 leading-relaxed max-w-md mx-auto">
                    গুগল ড্রাইভের সাথে সরাসরি ক্লাউড অটো-সিঙ্ক ফিচারটি নিয়ে কাজ চলছে। এটি পরবর্তী আপডেটেই চলে আসবে!
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setMode('local')}
                    className="px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all active:scale-95 border border-white/10"
                  >
                    লোকাল ব্যাকআপ ব্যবহার করুন
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="local-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="space-y-6 text-center">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-400 mx-auto border border-blue-500/20">
                    <HardDrive size={32} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-2">অফলাইন লোকাল ব্যাকআপ</h2>
                    <p className="text-xs text-white/40 leading-relaxed max-w-sm mx-auto">
                      আপনার নোটস ও ডাটাবেজ ব্যাকআপ ফাইল ম্যানুয়ালি ডাউনলোড বা রিস্টোর করতে নিচের অপশন ব্যবহার করুন।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={handleLocalExport}
                      disabled={status === 'preparing'}
                      className="py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                    >
                      {status === 'preparing' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                      ডাউনলোড ফাইল
                    </button>

                    <div className="relative group">
                      <input 
                        type="file" 
                        accept=".redwan"
                        onChange={handleLocalImport}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        disabled={status === 'preparing'}
                      />
                      <div className="py-4 bg-white/5 border border-white/10 group-hover:border-blue-500/50 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-white/80">
                        {status === 'preparing' ? <Loader2 className="animate-spin" size={16} /> : <Package size={16} />}
                        ফাইল রিস্টোর
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-400 font-bold justify-center text-xs"
            >
              <CheckCircle2 size={18} /> ব্যাকআপ কাজ সফলভাবে সম্পন্ন হয়েছে!
            </motion.div>
          )}

          {status === 'error' && error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 font-bold justify-center text-xs"
            >
              <AlertCircle size={18} /> {error}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Confirm Local Import Modal */}
      <ConfirmDialog
        isOpen={importData !== null}
        onClose={() => { setImportData(null); setStatus('idle'); }}
        onConfirm={confirmLocalRestore}
        title="লোকাল ব্যাকআপ রিস্টোর"
        message="সাবধান: এটি আপনার বর্তমান সব ডেটা প্রতিস্থাপন করবে। আপনি কি নিশ্চিত?"
        variant="danger"
        confirmText="হ্যাঁ, রিস্টোর করুন"
        cancelText="বাতিল"
      />
    </div>
  );
}
