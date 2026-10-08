/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
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
  Flame,
  Plus,
  Trash2,
  Sparkles,
  Rocket,
  Zap
} from 'lucide-react';
import { DataManager, AISettings } from '../../services/storage/DataManager';
import { cn } from '../../utils/cn';

const AIConfigurationPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [draftSettings, setDraftSettings] = useState<AISettings | null>(null);
  const [prevSettings, setPrevSettings] = useState<AISettings | null>(null);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isRevealed, setIsRevealed] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; showUndo?: boolean } | null>(null);
  
  const isDirty = settings && draftSettings && JSON.stringify(settings) !== JSON.stringify(draftSettings);
  
  useEffect(() => {
    DataManager.getAISettings().then(s => {
      setSettings(s);
      setDraftSettings(JSON.parse(JSON.stringify(s)));
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
    navigate('/settings');
  };

  const handleConfirmExit = () => {
    setShowExitWarning(false);
    navigate('/settings');
  };

  const handleCancelEdit = () => {
    if (!settings) return;
    setDraftSettings(JSON.parse(JSON.stringify(settings)));
    setStatus({ type: 'info', message: 'পরিবর্তন বাতিল করা হয়েছে।' });
  };

  const handleUndo = async () => {
    if (!prevSettings) return;
    setIsSaving(true);
    try {
      await DataManager.saveAISettings(prevSettings);
      setSettings(prevSettings);
      setDraftSettings(JSON.parse(JSON.stringify(prevSettings)));
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
    if (status?.type === 'error') setStatus(null);
  };

  const handleManualSave = async () => {
    if (!draftSettings || !settings) return;
    
    // Clean up restricted fields before saving to ensure strict AI-only configuration
    const cleanedSettings: AISettings = {
      ...draftSettings,
      dataCheckingEnabled: false,
      retrySettings: { enabled: false, errorCodes: '' },
      selectedAppID: 'standard',
      customAppIDs: []
    };

    setIsSaving(true);
    setStatus({ type: 'info', message: 'সেটিংস সেভ হচ্ছে...' });
    try {
      setPrevSettings(JSON.parse(JSON.stringify(settings)));
      await DataManager.saveAISettings(cleanedSettings);
      const savedCopy = JSON.parse(JSON.stringify(cleanedSettings));
      setSettings(savedCopy);
      setDraftSettings(savedCopy);
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

  const handleUpdateAPIKey = (provider: string, key: string) => {
    if (!draftSettings) return;
    updateDraft({
      apiKeys: { ...draftSettings.apiKeys, [provider]: key }
    });
  };

  const handleSelectProvider = (p: string) => {
    if (!draftSettings) return;
    updateDraft({ selectedProvider: p as any, enabledProviders: [p] });
  };

  if (!draftSettings) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-blue-500/30">
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />
      
      <header className="px-6 py-8 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#050505]/60 backdrop-blur-3xl z-[100]">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleBack} 
            className="group p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white active:scale-90 border border-white/5 flex items-center justify-center"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
              এআই <span className="text-blue-500">কনফিগারেশন</span>
            </h1>
            <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em]">Neural Processing Hub</p>
          </div>
        </div>
        
        {!isDirty && (
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['gemini', 'openrouter', 'fireworks', 'together'].map(p => (
              <button
                key={p}
                onClick={() => handleSelectProvider(p as any)}
                className={`group relative flex flex-col items-center justify-center p-5 rounded-[2rem] border transition-all gap-3 overflow-hidden ${
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
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner ${
                  draftSettings.selectedProvider === p ? 'bg-blue-500/20 text-white' : 'bg-white/5 text-white/20'
                }`}>
                   {p === 'gemini' ? (
                     <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-gemini-icon.png" className="w-6 h-6 object-contain" alt="gemini" />
                   ) : p === 'openrouter' ? (
                     <Sparkles size={20} className="text-purple-400" />
                   ) : p === 'fireworks' ? (
                     <Rocket size={20} className="text-orange-400" />
                   ) : (
                     <Zap size={20} className="text-yellow-400" />
                   )}
                </div>
                <div className="text-center">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest block transition-colors",
                    draftSettings.selectedProvider === p ? "text-blue-400" : "text-white/20"
                  )}>
                    {p === 'gemini' ? 'Gemini' : p === 'openrouter' ? 'OpenRouter' : p === 'fireworks' ? 'Fireworks' : 'Together'}
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

                <div className="space-y-6">
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

                  {/* Multi-Model Configuration */}
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-white/20 uppercase tracking-widest px-2">Configured Models</label>
                     <div className="space-y-2">
                        {(draftSettings.providerModels[draftSettings.selectedProvider] || []).map((model, mIdx) => (
                          <div key={mIdx} className="flex items-center gap-2 group/model">
                             <div className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white/80">
                                {model}
                             </div>
                             <button 
                                onClick={() => {
                                  const provider = draftSettings.selectedProvider;
                                  const newList = (draftSettings.providerModels[provider] || []).filter((_, i) => i !== mIdx);
                                  updateDraft({ providerModels: { ...draftSettings.providerModels, [provider]: newList } });
                                }}
                                className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all opacity-0 group-hover/model:opacity-100 active:scale-90"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                           <input 
                             type="text"
                             id="new-model-input"
                             placeholder="Add model name..."
                             className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 const val = (e.target as HTMLInputElement).value.trim();
                                 if (val) {
                                    const provider = draftSettings.selectedProvider;
                                    const newList = [...(draftSettings.providerModels[provider] || []), val];
                                    updateDraft({ providerModels: { ...draftSettings.providerModels, [provider]: newList } });
                                    (e.target as HTMLInputElement).value = '';
                                 }
                               }
                             }}
                           />
                           <button 
                             onClick={() => {
                               const input = document.getElementById('new-model-input') as HTMLInputElement;
                               const val = input.value.trim();
                               if (val) {
                                  const provider = draftSettings.selectedProvider;
                                  const newList = [...(draftSettings.providerModels[provider] || []), val];
                                  updateDraft({ providerModels: { ...draftSettings.providerModels, [provider]: newList } });
                                  input.value = '';
                               }
                             }}
                             className="px-4 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all active:scale-90"
                           >
                             <Plus size={18} />
                           </button>
                        </div>
                     </div>
                  </div>
                </div>

                {/* Managed System Prompt Display (Setting theke editable na, amora automatic provide kori) */}
                <div className="space-y-3 p-6 bg-white/[0.02] rounded-[2rem] border border-white/5 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><MessageSquare size={16} /></div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Global Instruction Set (System Prompt)</label>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      Built-in & Optimized
                    </span>
                  </div>
                  <div className="p-4 bg-black/40 border border-white/5 rounded-2xl text-xs text-white/60 leading-relaxed font-mono">
                    <p className="font-semibold text-white/80 mb-1">✓ স্বয়ংক্রিয় সিস্টেম প্রম্পট সক্রিয়:</p>
                    <p>নোট তৈরি/আপডেট কমান্ড, বাংলা ও ইংরেজি ভাষা সমর্থন, রিচ ব্লক সিনট্যাক্স (হেডিং, কালার, কলআউট, টাস্কলিস্ট, টেবিল) এবং অ্যাটাচড নোটস রিকগনিশন ইঞ্জিন স্বয়ংক্রিয়ভাবে সক্রিয় রয়েছে। ম্যানুয়াল কনফিগারেশনের প্রয়োজন নেই।</p>
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[10px] text-white/40 font-medium">সিস্টেম প্রম্পট অ্যাপের কোর ইঞ্জিন দ্বারা নিয়ন্ত্রিত ও অপ্টিমাইজড।</p>
                  </div>
                </div>
            </div>
          </motion.section>
        </AnimatePresence>

        <footer className="pt-12 text-center space-y-10 pb-40 border-t border-white/5">
          <div className="flex gap-3 h-16 max-w-lg mx-auto">
            <button
              onClick={handleManualSave}
              disabled={isSaving || !isDirty}
              className={`flex-[3] font-black uppercase tracking-[0.2em] text-[11px] rounded-3xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                isDirty 
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20" 
                  : "bg-white/5 text-white/20 cursor-default"
              }`}
            >
              {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} strokeWidth={3} />}
              <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সেভ করুন'}</span>
            </button>
            <button 
              onClick={handleBack}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 border border-white/5 rounded-3xl flex items-center justify-center active:scale-90 transition-all"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          <p className="text-xs text-white/20 px-12 leading-relaxed font-medium">
            আপনার সব ডেটা এবং কীগুলো ব্রাউজারের ইনডেক্স-ডিবিতে (IndexedDB) লোকালভাবে থাকে। রেডওয়ান অ্যাসিস্ট্যান্ট কখনোই আপনার ক্রেডিটেন্সিয়ার বাইরের কোনো সার্ভারে পাঠায় না।
          </p>
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
    </div>
  );
};

export default AIConfigurationPage;
