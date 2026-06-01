/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight,
  Layers,
  Settings, 
  Key, 
  Check, 
  AlertCircle, 
  Info, 
  Sparkles, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Lock, 
  Loader2, 
  RefreshCw,
  RefreshCcw,
  X,
  MessageSquare,
  UploadCloud,
  Download,
  FileCode,
  Sun,
  Moon,
  Brain,
  Globe,
  Flame
} from 'lucide-react';
import { VaultModal } from '../../components/modals/VaultModal';
import { DataManager, AISettings, UserPreferences } from '../../services/storage/DataManager';
import { LocalService } from './services/local/local';
import { InputDialog, ConfirmDialog } from '../../components/modals/CustomDialogs';
import { cn } from '../../lib/utils';
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
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/main');
    }
  };

  const handleConfirmExit = () => {
    setShowExitWarning(false);
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/main');
    }
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
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      <header className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#050505]/80 backdrop-blur-2xl z-[100]">
        <div className="flex items-center gap-6">
          <button onClick={handleBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white active:scale-90 border border-white/5">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">সিস্টেম কন্ট্রোল</h1>
            <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] mt-0.5">Application Core & AI Engine</p>
          </div>
        </div>
        {isDirty && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              বাতিল করুন
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8">
        {/* Provider Selection */}
        <section className="space-y-4">
          <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] px-2">সার্ভার প্রোভাইডার নির্বাচন করুন</h2>
          <div className="grid grid-cols-3 gap-3">
            {['gemini', 'openrouter', 'fireworks'].map(p => (
              <button
                key={p}
                onClick={() => handleSelectProvider(p)}
                className={`flex flex-col items-center justify-center py-4 px-2 rounded-2xl border transition-all gap-1.5 ${
                  draftSettings.selectedProvider === p ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 grayscale opacity-60'
                }`}
              >
                <div className={`p-2 rounded-xl ${draftSettings.selectedProvider === p ? 'bg-white/20' : 'bg-blue-400/10'}`}>
                   {p === 'gemini' ? (
                     <Brain size={18} className={draftSettings.selectedProvider === p ? 'text-white' : 'text-blue-400'} />
                   ) : p === 'openrouter' ? (
                     <Globe size={18} className={draftSettings.selectedProvider === p ? 'text-white' : 'text-blue-400'} />
                   ) : (
                     <Flame size={18} className={draftSettings.selectedProvider === p ? 'text-white' : 'text-blue-400'} />
                   )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-tight">
                  {p === 'gemini' ? 'Gemini AI' : p === 'openrouter' ? 'OpenRouter' : 'Fireworks'}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Paid Mode: API Boxes */}
        <AnimatePresence mode="wait">
          <motion.section
            key="api-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
              <div className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/20 rounded-2xl"><Key className="text-purple-400" size={24} /></div>
                  <div>
                    <h2 className="text-lg font-bold capitalize">{draftSettings.selectedProvider} এপিআই (API)</h2>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">আপনার ব্যক্তিগত কী কনফিগার করুন</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* API Key Input with Reveal Animation */}
                  <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Key size={16} className="text-white/20" />
                      <input 
                        type="text"
                        value={draftSettings.apiKeys[draftSettings.selectedProvider] || ''}
                        onChange={(e) => handleUpdateAPIKey(draftSettings.selectedProvider, e.target.value)}
                        placeholder="API Key লিখুন..."
                        className="flex-1 bg-transparent text-sm font-mono outline-none"
                      />
                    </div>
                    <AnimatePresence>
                      {!isRevealed[draftSettings.selectedProvider] && (
                        <motion.div 
                          initial={false}
                          animate={{ x: 0 }}
                          exit={{ x: "100%" }}
                          transition={{ type: "spring", stiffness: 100, damping: 20 }}
                          onClick={() => setIsRevealed({...isRevealed, [draftSettings.selectedProvider]: true})}
                          className="absolute inset-0 bg-blue-600 flex items-center justify-center gap-2 cursor-pointer z-10"
                        >
                          <Lock size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">কী দেখতে ক্লিক করুন</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <button 
                      onClick={() => setIsRevealed({...isRevealed, [draftSettings.selectedProvider]: !isRevealed[draftSettings.selectedProvider]})}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-full transition-all text-white/40"
                    >
                      {isRevealed[draftSettings.selectedProvider] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  {/* Manual Model Input */}
                  <div className="relative flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl">
                    <Settings size={16} className="text-white/20" />
                    <input 
                      type="text"
                      value={draftSettings.models[draftSettings.selectedProvider] || ''}
                      onChange={(e) => handleUpdateModel(draftSettings.selectedProvider, e.target.value)}
                      placeholder="মডেল নাম (যেমন: gemini-1.5-pro)"
                      className="flex-1 bg-transparent text-sm font-bold outline-none"
                    />
                  </div>
                </div>

                {/* System Prompt Field */}
                <div className="space-y-2 mt-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={16} className="text-blue-400" />
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">এআই সিস্টেম প্রম্পট (System Prompt)</label>
                  </div>
                  <textarea 
                    value={draftSettings.systemPrompt || ''}
                    onChange={(e) => updateDraft({ systemPrompt: e.target.value })}
                    placeholder="এআই-এর চরিত্র নির্ধারণ করুন (যেমন: আপনি একজন দক্ষ সহকারী...)"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm leading-relaxed focus:border-blue-500 outline-none min-h-[100px] resize-none"
                  />
                  <p className="text-[9px] text-white/20 italic">এটি এআই-এর আচরণের ধরন পরিবর্তন করবে।</p>
                </div>
              </div>
            </motion.section>
        </AnimatePresence>

        {/* AI Auto / Automation Toggle Section */}
        <section className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-2xl"><Sparkles className="text-blue-400" size={24} /></div>
            <div>
              <h2 className="text-lg font-bold">AI Auto (অটোমেশন)</h2>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">ব্যাকগ্রাউন্ড এআই অটোমেশন এবং প্রসেসিং</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group gap-4">
              <div>
                <h2 className="text-sm font-bold">AI Auto অটোমেশন চালু করুন</h2>
                <p className="text-[10px] text-white/40">স্বয়ংক্রিয়ভাবে ব্যাকগ্রাউন্ড কাজ সম্পন্ন করতে এটি অন করুন</p>
              </div>
              <button 
                id="ai-auto-toggle"
                onClick={() => {
                  updateDraft({ dataCheckingEnabled: !draftSettings.dataCheckingEnabled });
                }}
                className={`w-12 h-6 rounded-full transition-all flex items-center px-1 self-end sm:self-auto ${draftSettings.dataCheckingEnabled ? "bg-green-500" : "bg-white/10"}`}
              >
                <motion.div 
                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                  animate={{ x: draftSettings.dataCheckingEnabled ? 24 : 0 }}
                />
              </button>
            </div>

            {draftSettings.dataCheckingEnabled && (
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">AI Auto মডেল নির্বাচন করুন (Model-Selection)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['free', 'selected', 'custom'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateDraft({ dataCheckingModel: m })}
                        className={`py-3 px-2 rounded-xl border text-center transition-all ${
                          draftSettings.dataCheckingModel === m 
                            ? 'bg-blue-600 border-blue-400 shadow-md shadow-blue-500/10' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-[10px] font-bold block capitalize">
                          {m === 'free' ? 'Free Model' : m === 'selected' ? 'Selected' : 'Custom'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {draftSettings.dataCheckingModel === 'custom' && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">কাস্টম প্রোভাইডার সিলেক্ট করুন</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['gemini', 'openrouter', 'fireworks'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateDraft({ dataCheckingCustomProvider: p })}
                          className={`py-2 px-1 rounded-lg border text-center transition-all ${
                            draftSettings.dataCheckingCustomProvider === p 
                              ? 'bg-purple-600 border-purple-400' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-[9px] font-bold block capitalize">{p}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/20 rounded-2xl"><Layers className="text-orange-400" size={24} /></div>
            <div>
              <h2 className="text-lg font-bold">স্টোরেজ এবং মিডিয়া</h2>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">মিডিয়া ফাইল এবং ডেটা ম্যানেজমেন্ট</p>
            </div>
          </div>
          <div className="space-y-4">
             <button 
                onClick={() => navigate('/storage-optimizer')}
                className="w-full flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group gap-4"
             >
                <div className="flex items-center gap-3">
                   <div className="text-white/60 group-hover:text-white transition-colors">
                      <RefreshCcw size={20} />
                   </div>
                   <div className="text-left">
                      <h2 className="text-sm font-bold">স্টোরেজ অপ্টিমাইজার</h2>
                      <p className="text-[10px] text-white/40">ডেটা ব্যাকআপ এবং মিডিয়া ক্লিনিং</p>
                   </div>
                </div>
                <ChevronRight size={20} className="text-white/20 group-hover:text-white transition-all" />
             </button>
             
             <button 
                onClick={() => navigate('/recycle-bin')}
                className="w-full flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group gap-4"
             >
                <div className="flex items-center gap-3">
                   <div className="text-white/60 group-hover:text-white transition-colors">
                      <Trash2 size={20} />
                   </div>
                   <div className="text-left">
                      <h2 className="text-sm font-bold">রিসাইকেল বিন</h2>
                      <p className="text-[10px] text-white/40">মুছে ফেলা নোটগুলো পুনরুদ্ধার করুন</p>
                   </div>
                </div>
                <ChevronRight size={20} className="text-white/20 group-hover:text-white transition-all" />
             </button>
          </div>
        </section>

        <section className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/20 rounded-2xl"><Sparkles className="text-green-400" size={24} /></div>
            <div>
              <h2 className="text-lg font-bold">ইউজার ইন্টারফেস পছন্দ</h2>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">আপনার অভিজ্ঞতা কাস্টমাইজ করুন</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group gap-4">
              <div className="flex items-center gap-3">
                <div className="text-white/60 group-hover:text-white transition-colors">
                  <motion.div animate={(draftPreferences?.reducedMotion ?? preferences.reducedMotion) ? {} : { rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                    <Settings size={20} />
                  </motion.div>
                </div>
                <div>
                  <h2 className="text-sm font-bold">Animation Rush</h2>
                  <p className="text-[10px] text-white/40">এনিমেশন ফাস্ট করতে এটি অন করুন</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (!draftPreferences) return;
                  setDraftPreferences({ ...draftPreferences, reducedMotion: !draftPreferences.reducedMotion });
                }}
                className={`w-12 h-6 rounded-full transition-all flex items-center px-1 self-end sm:self-auto ${(draftPreferences?.reducedMotion ?? preferences.reducedMotion) ? "bg-green-500" : "bg-white/10"}`}
              >
                <motion.div 
                  animate={{ x: (draftPreferences?.reducedMotion ?? preferences.reducedMotion) ? 24 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group gap-4">
              <div className="flex items-center gap-3">
                <div className="text-white/60 group-hover:text-white transition-colors">
                   <Lock size={20} />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold">নোটস পাসওয়ার্ড (Notes Password)</h2>
                  <p className="text-[10px] text-white/40">আপনার নোট লক করার ডিফল্ট পাসওয়ার্ড</p>
                  
                  {draftPreferences?.defaultPassword !== undefined ? (
                    <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full">
                      <input 
                        type="text" 
                        value={draftPreferences.defaultPassword} 
                        onChange={(e) => setDraftPreferences({...draftPreferences, defaultPassword: e.target.value})}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono focus:border-blue-500 outline-none max-w-sm"
                        placeholder="পাসওয়ার্ড লিখুন..."
                      />
                      <button 
                        onClick={handleOpenVaultClick}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition-all sm:w-auto w-max"
                      >
                        ভল্ট দেখুন (View)
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        if (draftPreferences) setDraftPreferences({...draftPreferences, defaultPassword: ''});
                      }}
                      className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all"
                    >
                      কনফিগার করুন (Configure)
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group gap-4">
              <div className="flex items-center gap-3">
                <div className="text-white/60 group-hover:text-white transition-colors">
                   <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold">ডেমো ডেটা (Demo Data)</h2>
                  <p className="text-[10px] text-white/40">পরীক্ষার জন্য কিছু নোট যোগ করুন</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  await DataManager.createDemoData();
                  setStatus({ type: 'success', message: 'ডেমো ডেটা যোগ করা হয়েছে। রিফ্রেশ করুন।' });
                }}
                className="px-6 py-2.5 bg-blue-600/20 hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-blue-400 hover:text-white self-end sm:self-auto"
              >
                যোগ করুন
              </button>
            </div>



            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group gap-4">
              <div className="flex items-center gap-3">
                <div className="text-white/60 group-hover:text-white transition-colors">
                   <RefreshCw size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold">প্রাথমিক সেটআপ</h2>
                  <p className="text-[10px] text-white/40">শুরু থেকে সবকিছু সেটআপ করুন</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRestartConfirm(true)}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all self-end sm:self-auto"
              >
                রিস্টার্ট
              </button>
            </div>
          </div>
        </section>

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
