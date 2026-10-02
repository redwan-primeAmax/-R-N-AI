/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Upload, ChevronLeft, Loader2, 
  CheckCircle2, AlertCircle, Package,
  HardDrive, Cloud, RefreshCw, LogOut, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager } from '../../services/storage/DataManager';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';
import { GoogleDriveService, DriveUserInfo } from '../../services/googleDriveService';

export default function AppCloudArchive() {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'success' | 'error'>('idle');
  const [mode, setMode] = useState<'drive' | 'local'>('drive');
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<any | null>(null);
  
  // Google Drive state
  const [driveUser, setDriveUser] = useState<DriveUserInfo | null>(null);
  const [isDriveConnecting, setIsDriveConnecting] = useState(false);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [pendingDriveRestoreData, setPendingDriveRestoreData] = useState<string | null>(null);
  const [showDriveRestoreModal, setShowDriveRestoreModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const user = GoogleDriveService.getConnectedUser();
    setDriveUser(user);
  }, []);

  // Connect Google Drive
  const handleConnectDrive = async () => {
    setIsDriveConnecting(true);
    setError(null);
    try {
      const result = await GoogleDriveService.connectAndSync();
      setDriveUser(result.user);

      if (result.existingBackupFound && result.backupData) {
        setPendingDriveRestoreData(result.backupData);
        setShowDriveRestoreModal(true);
      } else {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (err: any) {
      console.error('Google Drive connection failed:', err);
      setError(err.message || 'গুগল ড্রাইভ কানেক্ট করতে ব্যর্থ হয়েছে।');
      setStatus('error');
    } finally {
      setIsDriveConnecting(false);
    }
  };

  // Sync to Drive manually
  const handleSyncToDrive = async () => {
    setIsDriveSyncing(true);
    setError(null);
    try {
      await GoogleDriveService.syncToDrive();
      const user = GoogleDriveService.getConnectedUser();
      setDriveUser(user);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      console.error('Drive sync failed:', err);
      setError(err.message || 'ড্রাইভ সিঙ্ক করতে সমস্যা হয়েছে।');
      setStatus('error');
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Restore from Drive manually
  const handleRestoreFromDrive = async () => {
    setIsDriveSyncing(true);
    setError(null);
    try {
      await GoogleDriveService.restoreFromDrive();
      setStatus('success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Drive restore failed:', err);
      setError(err.message || 'ড্রাইভ থেকে রিস্টোর করতে সমস্যা হয়েছে।');
      setStatus('error');
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Confirm pending Drive restore
  const handleConfirmDriveRestore = async () => {
    if (!pendingDriveRestoreData) return;
    try {
      setIsDriveSyncing(true);
      await DataManager.importAllData(pendingDriveRestoreData);
      setShowDriveRestoreModal(false);
      setPendingDriveRestoreData(null);
      setStatus('success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Pending restore failed:', err);
      setError('পুরানো ডেটা রিস্টোর করতে সমস্যা হয়েছে।');
      setStatus('error');
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Disconnect Drive
  const handleDisconnectDrive = async () => {
    await GoogleDriveService.disconnect();
    setDriveUser(null);
    setStatus('idle');
  };

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
          <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em]">Google Drive Cloud Backup & Sync</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Mode Selector */}
        <div className="flex bg-white/5 p-2 rounded-[24px] border border-white/5">
          <button 
            onClick={() => setMode('drive')}
            className={`flex-1 py-3.5 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              mode === 'drive' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-white/40 hover:text-white'
            }`}
          >
            <Cloud size={16} /> গুগল ড্রাইভ ক্লাউড
          </button>
          <button 
            onClick={() => setMode('local')}
            className={`flex-1 py-3.5 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              mode === 'local' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-white/40 hover:text-white'
            }`}
          >
            <HardDrive size={16} /> লোকাল ব্যাকআপ
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
                className="space-y-6"
              >
                {!driveUser ? (
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-400 mx-auto border border-blue-500/20">
                      <Cloud size={38} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold mb-2">গুগল ড্রাইভে সিঙ্ক করুন</h2>
                      <p className="text-xs text-white/50 leading-relaxed max-w-md mx-auto">
                        আপনার অ্যাকাউন্ট কানেক্ট করলে পুরানো ব্যাকআপ ফাইল স্বয়ংক্রিয়ভাবে রিস্টোর হবে এবং পরবর্তীতে নতুন সব নোট ও সেটিংস ক্লাউড ড্রাইভে সিঙ্ক থাকবে।
                      </p>
                    </div>

                    <button
                      onClick={handleConnectDrive}
                      disabled={isDriveConnecting}
                      className="w-full py-4.5 bg-white text-black hover:bg-gray-100 font-extrabold rounded-3xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      {isDriveConnecting ? (
                        <Loader2 className="animate-spin text-black" size={20} />
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      )}
                      <span>Google Drive কানেক্ট করুন</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Connected User Card */}
                    <div className="p-5 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {driveUser.photoURL ? (
                          <img src={driveUser.photoURL} alt="User Avatar" className="w-12 h-12 rounded-2xl border border-white/10" />
                        ) : (
                          <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center font-bold">
                            {driveUser.displayName?.[0] || 'G'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white">{driveUser.displayName || 'Google User'}</h3>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] font-black uppercase rounded-full">
                              <ShieldCheck size={10} /> Connected
                            </span>
                          </div>
                          <p className="text-xs text-white/40 truncate max-w-[180px] sm:max-w-xs">{driveUser.email}</p>
                          {driveUser.lastSyncedAt && (
                            <p className="text-[10px] text-white/30 mt-1 font-mono">
                              সর্বশেষ সিঙ্ক: {new Date(driveUser.lastSyncedAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={handleDisconnectDrive}
                        className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all"
                        title="Disconnect Drive"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button 
                        onClick={handleSyncToDrive}
                        disabled={isDriveSyncing}
                        className="p-5 bg-blue-600 hover:bg-blue-500 rounded-3xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {isDriveSyncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                        এখনই ড্রাইভে সিঙ্ক করুন
                      </button>

                      <button 
                        onClick={handleRestoreFromDrive}
                        disabled={isDriveSyncing}
                        className="p-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-white/80"
                      >
                        {isDriveSyncing ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                        ড্রাইভ থেকে রিস্টোর
                      </button>
                    </div>
                  </div>
                )}
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
                  <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center text-purple-400 mx-auto">
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
                      className="py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
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
                      <div className="py-4 bg-white/5 border border-white/10 group-hover:border-purple-500/50 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-white/80">
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
              <CheckCircle2 size={18} /> সিঙ্ক / ব্যাকআপ কাজ সফলভাবে সম্পন্ন হয়েছে!
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

      {/* Confirm Google Drive Existing Backup Restore Modal */}
      <ConfirmDialog
        isOpen={showDriveRestoreModal}
        onClose={() => {
          setShowDriveRestoreModal(false);
          setPendingDriveRestoreData(null);
        }}
        onConfirm={handleConfirmDriveRestore}
        title="গুগল ড্রাইভ ব্যাকআপ পাওয়া গেছে!"
        message="আপনার গুগল ড্রাইভে পূর্বের একটি ব্যাকআপ ফাইল পাওয়া গেছে। আপনি কি ড্রাইভে থাকা আগের ডেটা দিয়ে আপনার অ্যাপটি রিস্টোর করতে চান?"
        variant="primary"
        confirmText="হ্যাঁ, ড্রাইভের ডেটা রিস্টোর করুন"
        cancelText="না, বর্তমান ডেটা রাখব"
      />
    </div>
  );
}
