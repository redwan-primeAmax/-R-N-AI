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
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [customIDs, setCustomIDs] = useState<{id: string, name: string}[]>([]);
  const [isRevealed, setIsRevealed] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; showUndo?: boolean } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  useEffect(() => {
    DataManager.getAISettings().then(s => {
      setSettings(s);
      setDraftSettings(JSON.parse(JSON.stringify(s)));
      if (s.customAppIDs) setCustomIDs(s.customAppIDs);
    });
    DataManager.getUserPreferences().then(setPreferences);
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
      if (!confirm('You have unsaved changes. Are you sure you want to leave? (আপনার কিছু পরিবর্তন সেভ করা হয়নি। আপনি কি নিশ্চিতভাবে চলে যেতে চান?)')) {
        return;
      }
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleCancelEdit = () => {
    if (!settings) return;
    if (isDirty && !confirm('Discard changes and revert to original settings? (পরিবর্তনগুলো বাতিল করে আগের অবস্থায় ফিরে যেতে চান?)')) {
      return;
    }
    setDraftSettings(JSON.parse(JSON.stringify(settings)));
    setCustomIDs(settings.customAppIDs || []);
    setIsDirty(false);
    setStatus({ type: 'info', message: 'Changes discarded. (পরিবর্তন বাতিল করা হয়েছে।)' });
  };

  const handleUndo = async () => {
    if (!prevSettings) return;
    setIsSaving(true);
    try {
      await DataManager.saveAISettings(prevSettings);
      setSettings(prevSettings);
      setDraftSettings(JSON.parse(JSON.stringify(prevSettings)));
      setCustomIDs(prevSettings.customAppIDs || []);
      setIsDirty(false);
      setStatus({ type: 'success', message: 'Settings reverted to previous state. (আগের অবস্থায় ফিরে যাওয়া হয়েছে।)' });
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Failed to undo: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraft = (newSettings: Partial<AISettings>) => {
    if (!draftSettings) return;
    const updated = { ...draftSettings, ...newSettings };
    setDraftSettings(updated);
    setIsDirty(true);
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
    if (!draftSettings || !settings) return;
    
    const error = validateSettings();
    if (error) {
      setStatus({ type: 'error', message: error });
      return;
    }

    setIsSaving(true);
    setStatus({ type: 'info', message: 'Saving settings...' });
    try {
      setPrevSettings(JSON.parse(JSON.stringify(settings)));
      await DataManager.saveAISettings(draftSettings);
      setSettings(JSON.parse(JSON.stringify(draftSettings)));
      setIsDirty(false);
      setStatus({ 
        type: 'success', 
        message: 'All settings saved successfully! (সব সেটিংস সঠিকভাবে সেভ হয়েছে।)',
        showUndo: true
      });
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Failed to save settings: ' + (err.message || 'Unknown error') });
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
          <h1 className="text-xl font-bold font-display">Redwan Assistant Settings</h1>
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
          <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] px-2">Select Provider</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['picoapps', 'gemini', 'openrouter'].map(p => (
              <button
                key={p}
                onClick={() => handleSelectProvider(p)}
                className={`flex sm:flex-col items-center justify-center p-5 rounded-3xl border transition-all gap-3 ${
                  draftSettings.selectedProvider === p ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 grayscale opacity-60'
                }`}
              >
                <div className={`p-2 rounded-xl ${draftSettings.selectedProvider === p ? 'bg-white/20' : 'bg-blue-400/10'}`}>
                  <Sparkles size={20} className={draftSettings.selectedProvider === p ? 'text-white' : 'text-blue-400'} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{p === 'picoapps' ? 'Free (সার্ভার)' : p}</span>
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
                    <h2 className="text-lg font-bold">App ID Configuration</h2>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Required for WSS calls</p>
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

                <div className="space-y-4">
                  {/* API Key Input with Reveal Animation */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase ml-4">API Key</label>
                    <div className="relative group overflow-hidden rounded-2xl">
                      <input 
                        type="text"
                        value={draftSettings.apiKeys[draftSettings.selectedProvider] || ''}
                        onChange={(e) => handleUpdateAPIKey(draftSettings.selectedProvider, e.target.value)}
                        placeholder="Paste your key here..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-mono outline-none focus:border-purple-500/50 transition-all"
                      />
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
                            <Lock size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">Tap to Reveal API</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <button 
                        onClick={() => setIsRevealed({...isRevealed, [draftSettings.selectedProvider]: false})}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full transition-all text-white/40"
                      >
                        {isRevealed[draftSettings.selectedProvider] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Manual Model Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase ml-4">Manual Model Name</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={draftSettings.models[draftSettings.selectedProvider] || ''}
                        onChange={(e) => handleUpdateModel(draftSettings.selectedProvider, e.target.value)}
                        placeholder="e.g. gemini-1.5-pro-latest"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold outline-none border-dashed focus:border-blue-500/50 transition-all"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/20">
                        <Settings size={18} />
                      </div>
                    </div>
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
                  <motion.div animate={preferences.reducedMotion ? {} : { rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                    <Settings size={20} />
                  </motion.div>
                </div>
                <div>
                  <h3 className="text-sm font-bold">Reduced Motion</h3>
                  <p className="text-[10px] text-white/40">Disable animations for a faster feel</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  const newPrefs = { ...preferences, reducedMotion: !preferences.reducedMotion };
                  setPreferences(newPrefs);
                  DataManager.saveUserPreferences(newPrefs);
                }}
                className={`w-12 h-6 rounded-full transition-all flex items-center px-1 self-end sm:self-auto ${preferences.reducedMotion ? "bg-green-500" : "bg-white/10"}`}
                aria-label={preferences.reducedMotion ? "Disable Reduced Motion" : "Enable Reduced Motion"}
                title="Toggle reduced motion for UI animations"
              >
                <motion.div 
                  animate={{ x: preferences.reducedMotion ? 24 : 0 }}
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
                  <h3 className="text-sm font-bold">App Theme</h3>
                  <p className="text-[10px] text-white/40">Switch between dark and light modes</p>
                </div>
              </div>
              <div className="flex bg-black/40 p-1 rounded-xl self-end sm:self-auto">
                {['dark', 'light', 'system'].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      const newPrefs = { ...preferences, theme: t as 'dark' | 'light' | 'system' };
                      setPreferences(newPrefs);
                      DataManager.saveUserPreferences(newPrefs);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      preferences.theme === t ? "bg-blue-600 text-white" : "text-white/40 hover:text-white"
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
                  <h3 className="text-sm font-bold">Cloud Storage</h3>
                  <p className="text-[10px] text-white/40">Sync to Google Drive</p>
                </div>
              </div>
              {!googleConnected ? (
                <button 
                  onClick={handleConnectDrive}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all self-end sm:self-auto"
                >
                  Connect
                </button>
              ) : (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button 
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                    title="Sync Now"
                  >
                    <RefreshCw size={18} className={isSyncing ? "animate-spin text-blue-400" : "text-white/40"} />
                  </button>
                  <button 
                    onClick={handleRestoreFromDrive}
                    disabled={isSyncing}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                    title="Restore Data"
                  >
                    <Download size={18} className={isSyncing ? "animate-pulse text-green-400" : "text-white/40"} />
                  </button>
                  <button 
                    onClick={handleDisconnectDrive}
                    className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                    title="Disconnect"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group gap-4">
              <div className="flex items-center gap-3">
                <div className="text-white/60 group-hover:text-white transition-colors">
                   <ChevronLeft size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Restart Setup</h3>
                  <p className="text-[10px] text-white/40">Re-trigger the initial profile setup</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                   if (confirm('Re-trigger setup? (এটি প্রাথমিক সেটআপ পুনরায় শুরু করবে)')) {
                      await DataManager.saveUserName(''); // Clear name
                      window.location.reload();
                   }
                }}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all self-end sm:self-auto"
                aria-label="Restart Setup"
              >
                Restart
              </button>
            </div>
          </div>
        </section>

        <footer className="pt-8 text-center space-y-8 pb-32">
          <button
            onClick={handleManualSave}
            disabled={isSaving || !draftSettings}
            className={`w-full py-5 font-bold rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
              isDirty 
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20" 
                : "bg-white/5 text-white/20 cursor-default"
            }`}
            aria-label="Save Settings"
            id="save-settings-button"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
            <span>{isSaving ? 'Saving...' : 'Save Settings (সেভ করুন)'}</span>
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
                    Undo
                  </button>
                )}
                <button onClick={() => setStatus(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AISettingsPage;
