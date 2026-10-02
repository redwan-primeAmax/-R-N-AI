/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Settings, 
  Key, 
  Check, 
  AlertCircle, 
  Info, 
  Eye, 
  EyeOff, 
  Loader2, 
  RefreshCw,
  X,
  MessageSquare,
  Globe,
  Flame
} from 'lucide-react';
import { VaultModal } from '../../components/modals/VaultModal';
import { DataManager, AISettings, UserPreferences } from '../../services/storage/DataManager';
import { LocalService } from '../../services/ai/local/local';
import { InputDialog, ConfirmDialog } from '../../components/modals/CustomDialogs';
import { cn } from '../../utils/cn';
import appIDList from '../../constants/appIDList.json';
import localforage from 'localforage';

const AIConfigurationPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [draftSettings, setDraftSettings] = useState<AISettings | null>(null);
  const [prevSettings, setPrevSettings] = useState<AISettings | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({ reducedMotion: false, theme: 'dark' });
  const [draftPreferences, setDraftPreferences] = useState<UserPreferences | null>(null);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showVaultAuthPrompt, setShowVaultAuthPrompt] = useState(false);
  const [customIDs, setCustomIDs] = useState<{id: string, name: string}[]>([]);
  const [isRevealed, setIsRevealed] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modelStatus, setModelStatus] = useState<'empty' | 'loaded' | 'error'>('empty');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; showUndo?: boolean } | null>(null);
  const [showCustomIDPrompt, setShowCustomIDPrompt] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  
  useEffect(() => {
    // Check if model exists in storage
    localforage.getItem('local_model_binary').then(data => {
      if (data) setModelStatus('loaded');
    });
  }, []);
  
  const isSettingsDirty = settings && draftSettings && JSON.stringify(settings) !== JSON.stringify(draftSettings);
  const isPrefsDirty = preferences && draftPreferences && JSON.stringify(preferences) !== JSON.stringify(draftPreferences);
  const isDirty = !!(isSettingsDirty || isPrefsDirty);
  
  useEffect(() => {
    DataManager.getAISettings().then(s => {
      setSettings(s);
      setDraftSettings(JSON.parse(JSON.stringify(s)));
      if (s.customAppIDs) setCustomIDs(s.customAppIDs);
    });
    DataManager.getUserPreferences().then(prefs => {
      setPreferences(prefs);
      setDraftPreferences(JSON.parse(JSON.stringify(prefs)));
    });
  }, []);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleBack = () => {
    if (isDirty) {
      setShowExitWarning(true);
      return;
    }
    navigate('/main');
  };

  const handleConfirmExit = () => {
    setShowExitWarning(false);
    navigate('/main');
  };

  const handleCancelEdit = () => {
    if (!settings || !preferences) return;
    setDraftSettings(JSON.parse(JSON.stringify(settings)));
    setDraftPreferences(JSON.parse(JSON.stringify(preferences)));
    setCustomIDs(settings.customAppIDs || []);
    setStatus({ type: 'info', message: 'পরিবর্তন বাতিল করা হয়েছে।' });
  };

  const handleUndo = async () => {
    if (!prevSettings) return;
    setIsSaving(true);
    try {
      await DataManager.saveAISettings(prevSettings);
      setSettings(prevSettings);
      setDraftSettings(JSON.parse(JSON.stringify(prevSettings)));
      setCustomIDs(prevSettings.customAppIDs || []);
      setStatus({ type: 'success', message: 'আগের অবস্থায় ফিরে যাওয়া হয়েছে।' });
    } catch (err: any) {
      setStatus({ type: 'error', message: 'ত্রুটি: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraft = (newSettings: Partial<AISettings>) => {
    if (!draftSettings) return;
    const updated = { ...draftSettings, ...newSettings };
    setDraftSettings(updated);
    
    // Clear error status when making changes
    if (status?.type === 'error') {
      setStatus(null);
    }
  };

  const validateSettings = (): string | null => {
    if (!draftSettings) return 'No settings loaded';
    return null;
  };

  const handleManualSave = async () => {
    if (!draftSettings || !settings || !draftPreferences) return;
    
    const error = validateSettings();
    if (error) {
      setStatus({ type: 'error', message: error });
      return;
    }

    setIsSaving(true);
    setStatus({ type: 'info', message: 'সেটিংস সেভ হচ্ছে...' });
    try {
      setPrevSettings(JSON.parse(JSON.stringify(settings)));
      
      // Save both settings and preferences
      await Promise.all([
        DataManager.saveAISettings(draftSettings),
        DataManager.saveUserPreferences(draftPreferences)
      ]);
      
      setSettings(JSON.parse(JSON.stringify(draftSettings)));
      setPreferences(JSON.parse(JSON.stringify(draftPreferences)));
      
      setStatus({ 
        type: 'success', 
        message: 'সেটিংস সফলভাবে সেভ হয়েছে।',
        showUndo: true
      });
    } catch (err: any) {
      setStatus({ type: 'error', message: 'সেভ করতে ব্যর্থ হয়েছে: ' + (err.message || 'অজানা ত্রুটি') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAppID = (id: string) => {
    updateDraft({ selectedAppID: id });
  };

  const handleAddCustomID = (id: string) => {
    if (!id || !draftSettings) return;
    const name = `Custom: ${id.slice(0, 8)}...`;
    const newList = [...customIDs, { id, name }];
    setCustomIDs(newList);
    updateDraft({ customAppIDs: newList, selectedAppID: id });
  };

  const handleDeleteCustomID = (id: string) => {
    if (!draftSettings) return;
    const newList = customIDs.filter(c => c.id !== id);
    setCustomIDs(newList);
    updateDraft({ 
      customAppIDs: newList, 
      selectedAppID: draftSettings.selectedAppID === id ? 'threat-all' : draftSettings.selectedAppID 
    });
  };

  const handleUpdateAPIKey = (provider: string, key: string) => {
    if (!draftSettings) return;
    updateDraft({
      apiKeys: { ...draftSettings.apiKeys, [provider]: key }
    });
  };

  const handleUpdateModel = (provider: string, model: string) => {
    if (!draftSettings) return;
    updateDraft({
      models: { ...draftSettings.models, [provider]: model },
      selectedModels: { ...draftSettings.selectedModels, [provider]: model }
    });
  };

  const handleSelectProvider = (p: string) => {
    if (!draftSettings) return;
    updateDraft({ selectedProvider: p as any, enabledProviders: [p] });
  };

  const handleOpenVaultClick = () => {
    const pwd = draftPreferences?.defaultPassword?.trim();
    if (!pwd) {
      setStatus({ type: 'error', message: 'ভল্ট দেখার আগে দয়া করে একটি পাসওয়ার্ড কনফিগার করুন।' });
      return;
    }
    setShowVaultAuthPrompt(true);
  };

  const handleConfirmVaultAuth = (pwdInput: string) => {
    const actualPwd = draftPreferences?.defaultPassword?.trim();
    if (pwdInput === actualPwd) {
      setShowVaultAuthPrompt(false);
      setShowVaultModal(true);
    } else {
      setStatus({ type: 'error', message: 'ভল্ট পাসওয়ার্ড মিলছে না! আবার চেষ্টা করুন।' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setStatus({ type: 'error', message: 'দয়া করে একটি .zip ফাইল আপলোড করুন।' });
      return;
    }

    setIsUploading(true);
    try {
      const localService = new LocalService();
      await localService.loadModelFromZip(file);
      setModelStatus('loaded');
      setStatus({ type: 'success', message: 'লোকাল মডেল সফলভাবে লোড হয়েছে!' });
    } catch (err: any) {
      setModelStatus('error');
      setStatus({ type: 'error', message: 'মডেল লোড করতে ব্যর্থ: ' + err.message });
    } finally {
      setIsUploading(false);
    }
  };

  if (!draftSettings) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-blue-500/30">
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />
      
      <header className="px-6 py-8 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#050505]/60 backdrop-blur-3xl z-[100]">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/settings')} 
            className="group p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white active:scale-90 border border-white/5 flex items-center justify-center"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
              AI <span className="text-blue-500">ইঞ্জিন</span> সেটিংস
            </h1>
            <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em]">Neural Processing Hub</p>
          </div>
        </div>
        
        {isDirty ? (
          <div className="flex items-center gap-3">
             <button 
               onClick={handleCancelEdit}
               className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95"
             >
               বাতিল
             </button>
             <button 
               onClick={handleManualSave}
               disabled={isSaving}
               className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"
             >
               {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
               সেভ করুন
             </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-none">Synched</span>
          </div>
        )}
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-3xl mx-auto w-full space-y-12 pb-48">
        {/* Provider Selection */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Select Intelligence Core</h2>
            <div className="h-px flex-1 bg-white/5 mx-4" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['gemini', 'openrouter', 'fireworks'].map(p => (
              <button
                key={p}
                onClick={() => handleSelectProvider(p)}
                className={`group relative flex flex-col items-center justify-center p-6 rounded-[2rem] border transition-all gap-4 overflow-hidden ${
                  draftSettings.selectedProvider === p 
                    ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.1)] ring-1 ring-blue-500/20' 
                    : 'bg-white/[0.02] border-white/5 grayscale opacity-60 hover:opacity-100 hover:grayscale-0 hover:bg-white/[0.05]'
                }`}
              >
                {draftSettings.selectedProvider === p && (
                  <motion.div 
                    layoutId="active-provider-glow"
                    className="absolute inset-0 bg-blue-500/5 blur-xl pointer-events-none"
                  />
                )}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner ${
                  draftSettings.selectedProvider === p ? 'bg-blue-500/20 text-white' : 'bg-white/5 text-white/20'
                }`}>
                   {p === 'gemini' ? (
                     <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-gemini-icon.png" className="w-6 h-6 object-contain" alt="gemini" />
                   ) : p === 'openrouter' ? (
                     <Globe size={24} />
                   ) : (
                     <Flame size={24} />
                   )}
                </div>
                <div className="text-center">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest block transition-colors",
                    draftSettings.selectedProvider === p ? "text-blue-400" : "text-white/20"
                  )}>
                    {p === 'gemini' ? 'Google Gemini' : p === 'openrouter' ? 'OpenRouter' : 'Fireworks AI'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* intelligence Configuration Box */}
        <AnimatePresence mode="wait">
          <motion.section
            key={draftSettings.selectedProvider}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="group"
          >
            <div className="p-8 md:p-12 bg-white/[0.03] border border-white/5 rounded-[3rem] space-y-10 relative overflow-hidden">
               {/* Decorative Gradient */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-blue-500/10 rounded-[1.25rem] flex items-center justify-center border border-blue-500/20 text-blue-400">
                    <Key size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight capitalize">{draftSettings.selectedProvider} Configuration</h2>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Credential & Model Core</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* API Key Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest px-2">Access Secret Key</label>
                    <div className="relative group/input overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/5 transition-all focus-within:border-blue-500/50 focus-within:bg-blue-500/5 pr-12">
                      <div className="flex items-center gap-3 px-5 py-4">
                        <Key size={16} className="text-white/20 group-focus-within/input:text-blue-400 transition-colors" />
                        <input 
                          type={isRevealed[draftSettings.selectedProvider] ? 'text' : 'password'}
                          value={draftSettings.apiKeys[draftSettings.selectedProvider] || ''}
                          onChange={(e) => handleUpdateAPIKey(draftSettings.selectedProvider, e.target.value)}
                          placeholder="আপনার এপিআই কী দিন..."
                          className="flex-1 bg-transparent text-sm font-mono outline-none placeholder:text-white/10"
                        />
                      </div>
                      <button 
                        onClick={() => setIsRevealed({...isRevealed, [draftSettings.selectedProvider]: !isRevealed[draftSettings.selectedProvider]})}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/20 hover:text-white"
                      >
                        {isRevealed[draftSettings.selectedProvider] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Model Selector */}
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-white/20 uppercase tracking-widest px-2">Deployment Model</label>
                     <div className="relative group/input overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/5 transition-all focus-within:border-blue-500/50 focus-within:bg-blue-500/5">
                        <div className="flex items-center gap-3 px-5 py-4">
                          <Settings size={16} className="text-white/20 group-focus-within/input:text-blue-400 transition-colors" />
                          <input 
                            type="text"
                            value={draftSettings.models[draftSettings.selectedProvider] || ''}
                            onChange={(e) => handleUpdateModel(draftSettings.selectedProvider, e.target.value)}
                            placeholder="যেমন: gemini-1.5-flash"
                            className="flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-white/10"
                          />
                        </div>
                     </div>
                  </div>
                </div>

                {/* System Prompt Field */}
                <div className="space-y-3 p-6 bg-white/[0.02] rounded-[2rem] border border-white/5 group-hover:border-blue-500/20 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><MessageSquare size={16} /></div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Global Instruction Set (System Prompt)</label>
                    </div>
                    <Info size={14} className="text-white/10 hover:text-white transition-colors cursor-help" />
                  </div>
                  <textarea 
                    value={draftSettings.systemPrompt || ''}
                    onChange={(e) => updateDraft({ systemPrompt: e.target.value })}
                    placeholder="নোট অ্যাসিস্ট্যান্ট এর বিহেভিয়ার সেট করুন..."
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm leading-relaxed focus:border-blue-500/50 focus:bg-blue-500/5 outline-none min-h-[120px] resize-none transition-all placeholder:text-white/5"
                  />
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full" />
                    <p className="text-[10px] text-white/20 font-medium italic">এটি প্রতিটি এআই জেনারেশনের জন্য গাইডহোল্ড হিসেবে কাজ করবে।</p>
                  </div>
                </div>
            </div>
          </motion.section>
        </AnimatePresence>

        <footer className="pt-8 text-center space-y-8 pb-32">
          <button
            onClick={handleManualSave}
            disabled={isSaving || !isDirty}
            className={`w-full py-5 font-bold rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
              isDirty 
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20" 
                : "bg-white/5 text-white/20 cursor-default"
            }`}
            aria-label="সেটিংস সংরক্ষণ"
            id="save-settings-button"
          >
            {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} />}
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
          </button>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">v2.8 Stable Built</span>
            </div>
            <p className="text-xs text-white/20 px-12 leading-relaxed">
              আপনার সব ডেটা এবং কীগুলো ব্রাউজারের ইনডেক্স-ডিবিতে (IndexedDB) লোকালভাবে থাকে। রেডওয়ান অ্যাসিস্ট্যান্ট কখনোই আপনার ক্রেডিটেন্সিয়ার বাইরের কোনো সার্ভারে পাঠায় না।
            </p>
          </div>
        </footer>

        {/* Status Toast with Undo */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className={`
                fixed bottom-8 left-6 right-6 z-[120] p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center gap-3 shadow-2xl backdrop-blur-xl
                ${status.type === 'success' ? "bg-green-500 text-white" :
                  status.type === 'error' ? "bg-red-500 text-white" :
                  "bg-blue-500 text-white"}
              `}
            >
              <div className="flex items-center gap-2 flex-grow">
                {status.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
                <p className="text-sm font-bold">{status.message}</p>
              </div>
              <div className="flex items-center gap-2 justify-end">
                {status.showUndo && prevSettings && (
                  <button 
                    onClick={handleUndo}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    আগে ফিরুন
                  </button>
                )}
                <button onClick={() => setStatus(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exit Warning Modal */}
        <AnimatePresence>
          {showExitWarning && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExitWarning(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] p-8 z-[201] shadow-2xl">
                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-center mb-2">সেভ করা হয়নি!</h3>
                <p className="text-sm text-white/40 text-center mb-8 leading-relaxed">আপনার কিছু পরিবর্তন সংরক্ষণ করা হয়নি। আপনি কি নিশ্চিতভাবে বের হতে চান?</p>
                <div className="flex flex-col gap-3">
                  <button onClick={handleConfirmExit} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95">হ্যাঁ, বের হয়ে যান</button>
                  <button onClick={() => setShowExitWarning(false)} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/80 font-bold rounded-2xl transition-all active:scale-95">ফিরে যান</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
      <VaultModal 
        isOpen={showVaultModal} 
        onClose={() => setShowVaultModal(false)}
      />

      <InputDialog 
        isOpen={showVaultAuthPrompt}
        onClose={() => setShowVaultAuthPrompt(false)}
        onConfirm={handleConfirmVaultAuth}
        title="ভল্ট পাসওয়ার্ড"
        placeholder="ভল্ট অ্যাক্সেস করতে ডিফল্ট পাসওয়ার্ডটি লিখুন..."
        type="password"
        confirmText="অ্যাক্সেস করুন"
      />

      <InputDialog 
        isOpen={showCustomIDPrompt} 
        onClose={() => setShowCustomIDPrompt(false)} 
        onConfirm={handleAddCustomID} 
        title="Custom App ID" 
        placeholder="আপনার পার্সোনাল অ্যাপ আইডি দিন..." 
      />

      <ConfirmDialog 
        isOpen={showRestartConfirm}
        onClose={() => setShowRestartConfirm(false)}
        onConfirm={async () => {
          await DataManager.saveUserName('');
          window.location.reload();
        }}
        title="রিস্টার্ট কনফার্মেশন"
        message="প্রাথমিক সেটআপ পুনরায় শুরু করতে চান? এটি আপনার নাম মুছে ফেলবে (নোটগুলো থাকবে)।"
        confirmText="হ্যাঁ, রিস্টার্ট"
        cancelText="না"
      />
    </div>
  );
};

export default AIConfigurationPage;
