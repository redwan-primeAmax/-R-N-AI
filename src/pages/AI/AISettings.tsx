/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
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
  X,
  Palette,
  Cloud,
  RefreshCw,
  LogOut,
  Download
} from 'lucide-react';
import { DataManager, AISettings, UserPreferences } from '../../utils/DataManager';
import appIDList from '../../constants/appIDList.json';

const AISettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [draftSettings, setDraftSettings] = useState<AISettings | null>(null);
  const [prevSettings, setPrevSettings] = useState<AISettings | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({ reducedMotion: false, theme: 'dark' });
  const [draftPreferences, setDraftPreferences] = useState<UserPreferences | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [storageType, setStorageType] = useState<'local' | 'cloud'>('local');
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [customIDs, setCustomIDs] = useState<{id: string, name: string}[]>([]);
  const [isRevealed, setIsRevealed] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; showUndo?: boolean } | null>(null);
  
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
      setStorageType(prefs.storageType || 'local');
    });
    DataManager.getGoogleTokens().then(tokens => setGoogleConnected(!!tokens));
  }, []);

  // Listen for Google Auth Success
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const tokens = event.data.tokens;
        tokens.issued_at = Date.now();
        await DataManager.saveGoogleTokens(tokens);
        setGoogleConnected(true);
        setStatus({ type: 'success', message: 'Google Drive connected and initial sync started!' });
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const handleConnectDrive = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (err) {
      console.error("Failed to get Google Auth URL", err);
      setStatus({ type: 'error', message: 'Failed to start Google connection.' });
    }
  };

  const handleDisconnectDrive = async () => {
    if (confirm('Disconnect Google Drive? Your data will remain on your device but will no longer sync to the cloud.')) {
      await DataManager.disconnectGoogleDrive();
      setGoogleConnected(false);
      setStatus({ type: 'info', message: 'Google Drive disconnected.' });
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setStatus({ type: 'info', message: 'Syncing to Google Drive...' });
    try {
      await DataManager.syncToDrive();
      setStatus({ type: 'success', message: 'Sync complete!' });
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Sync failed: ' + err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (confirm('Warning: Restore will overwrite all local data with the backup from Google Drive. Continue?')) {
      setIsSyncing(true);
      try {
        await DataManager.restoreFromDrive();
        setStatus({ type: 'success', message: 'Data restored successfully! (ডেটা রিস্টোর করা হয়েছে।)' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        setStatus({ type: 'error', message: 'Restore failed: ' + err.message });
      } finally {
        setIsSyncing(false);
      }
    }
  };

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
    navigate(-1);
  };

  const handleConfirmExit = () => {
    setShowExitWarning(false);
    navigate(-1);
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
  };

  const validateSettings = (): string | null => {
    if (!draftSettings) return 'No settings loaded';
    
    if (draftSettings.selectedProvider !== 'picoapps') {
      const key = draftSettings.apiKeys[draftSettings.selectedProvider];
      if (!key || key.trim() === '') {
        return `API Key is required for ${draftSettings.selectedProvider.toUpperCase()}. (এর জন্য এপিআই কী প্রয়োজন।)`;
      }
      
      const model = draftSettings.models[draftSettings.selectedProvider];
      if (!model || model.trim() === '') {
        return `Model name is required for ${draftSettings.selectedProvider.toUpperCase()}. (এর জন্য মডেল নাম প্রয়োজন।)`;
      }
    }
    
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

  const handleAddCustomID = () => {
    const id = prompt('Enter your personal App ID:');
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
      models: { ...draftSettings.models, [provider]: model }
    });
  };

  const handleSelectProvider = (p: string) => {
    if (!draftSettings) return;
    updateDraft({ selectedProvider: p as any, enabledProviders: [p] });
  };

  if (!draftSettings) return null;

  const isFree = draftSettings.selectedProvider === 'picoapps';

  return (
    <div className="min-h-screen bg-[#191919] text-white flex flex-col">
      <header className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#191919]/90 backdrop-blur-xl z-[100]">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-all text-white active:scale-95">
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-xl font-bold font-display">Settings Panel (সেটিংস প্যানেল)</h1>
        </div>
        {isDirty && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8">
        {/* Provider Selection */}
        <section className="space-y-4">
          <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] px-2">সার্ভার প্রোভাইডার নির্বাচন করুন</h2>
          <div className="grid grid-cols-3 gap-2">
            {['picoapps', 'gemini', 'openrouter'].map(p => (
              <button
                key={p}
                onClick={() => handleSelectProvider(p)}
                className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all gap-1.5 ${
                  draftSettings.selectedProvider === p ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 grayscale opacity-60'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${draftSettings.selectedProvider === p ? 'bg-white/20' : 'bg-blue-400/10'}`}>
                  <Sparkles size={16} className={draftSettings.selectedProvider === p ? 'text-white' : 'text-blue-400'} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-tight">{p === 'picoapps' ? 'ফ্রি সার্ভার' : p}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Free Mode: App ID Section */}
        <AnimatePresence mode="wait">
          {isFree && (
            <motion.section
              key="appid-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-2xl"><Key className="text-blue-400" size={24} /></div>
                  <div>
                    <h2 className="text-lg font-bold">অ্যাপ আইডি কনফিগারেশন</h2>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">রিয়েল-টাইম কলের জন্য প্রয়োজন</p>
                  </div>
                </div>
                <button onClick={handleAddCustomID} className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-500/20">
                  <Plus size={24} />
                </button>
              </div>
              <div className="grid gap-2">
                {[...appIDList, ...customIDs].map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleSelectAppID(app.id)}
                    className={`p-5 rounded-2xl border transition-all flex items-center justify-between group ${
                      (draftSettings.selectedAppID || 'threat-all') === app.id ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-sm font-black">{app.name}</span>
                      <span className="text-[10px] text-white/40 font-mono uppercase">{app.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {(draftSettings.selectedAppID || 'threat-all') === app.id && <Check size={18} className="text-blue-400" />}
                      {customIDs.some(c => c.id === app.id) && (
                        <div onClick={(e) => { e.stopPropagation(); handleDeleteCustomID(app.id); }} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={16} />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.section>
          )}

          {/* Paid Mode: API Boxes */}
          {!isFree && (
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
                    <h2 className="text-lg font-bold capitalize">{draftSettings.selectedProvider} API</h2>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Configure your private key</p>
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
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/20 rounded-2xl"><Sparkles className="text-green-400" size={24} /></div>
            <div>
              <h2 className="text-lg font-bold">UI Preferences</h2>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Customize your experience</p>
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
                  <h2 className="text-sm font-bold">এনিমেশন হ্রাস করুন</h2>
                  <p className="text-[10px] text-white/40">দ্রুত গতির জন্য এনিমেশন বন্ধ করুন</p>
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
                  <Palette size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold">অ্যাপ থিম</h2>
                  <p className="text-[10px] text-white/40">আলো এবং অন্ধকার মোড পরিবর্তন করুন</p>
                </div>
              </div>
              <div className="flex bg-black/40 p-1 rounded-xl self-end sm:self-auto">
                {['dark', 'light', 'system'].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      if (!draftPreferences) return;
                      setDraftPreferences({ ...draftPreferences, theme: t as 'dark' | 'light' | 'system' });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      (draftPreferences?.theme ?? preferences.theme) === t ? "bg-blue-600 text-white" : "text-white/40 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group gap-4">
              <div className="flex items-center gap-3">
                <div className="text-white/60 group-hover:text-white transition-colors">
                   <Cloud size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold">ক্লাউড স্টোরেজ</h2>
                  <p className="text-[10px] text-white/40">{googleConnected ? 'গুগল ড্রাইভের সাথে সংযুক্ত' : 'তথ্য সংরক্ষণের মাধ্যম সংযোগ করুন'}</p>
                </div>
              </div>
              {!googleConnected ? (
                <button 
                  onClick={handleConnectDrive}
                  className="px-6 py-2.5 bg-[#002B5B] hover:bg-[#003A7A] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all self-end sm:self-auto shadow-lg shadow-black/20 active:scale-95 border border-blue-400/20"
                >
                  {storageType === 'local' ? 'ক্লাউডে স্থানান্তর' : 'সংযোগ করুন'}
                </button>
              ) : (
                <div className="flex items-center gap-2 self-end sm:self-auto text-green-500 bg-green-500/10 px-4 py-2 rounded-xl text-[10px] font-black">
                  <Check size={14} />
                  সংযুক্ত
                </div>
              )}
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
                onClick={async () => {
                   if (confirm('প্রাথমিক সেটআপ পুনরায় শুরু করতে চান?')) {
                      await DataManager.saveUserName('');
                      window.location.reload();
                   }
                }}
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
              All data and keys stay local in your browser's IndexedDB. Redwan Assistant never transmits your credentials to external servers.
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
    </div>
  );
};

export default AISettingsPage;
