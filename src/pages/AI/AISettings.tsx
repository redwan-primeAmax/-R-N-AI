/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Settings, Key, Check, AlertCircle, Info, Sparkles, Plus, Trash, Eye, EyeOff, Lock } from 'lucide-react';
import { DataManager, AISettings } from '../../utils/DataManager';
import appIDList from '../../constants/appIDList.json';

const AISettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [customIDs, setCustomIDs] = useState<{id: string, name: string}[]>([]);
  const [isRevealed, setIsRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    DataManager.getAISettings().then(s => {
      setSettings(s);
      if (s.customAppIDs) setCustomIDs(s.customAppIDs);
    });
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const updateSettings = async (newSettings: AISettings) => {
    setSettings(newSettings);
    await DataManager.saveAISettings(newSettings);
  };

  const handleSelectAppID = (id: string) => {
    if (!settings) return;
    updateSettings({ ...settings, selectedAppID: id });
  };

  const handleAddCustomID = () => {
    const id = prompt('Enter your personal App ID:');
    if (!id || !settings) return;
    const name = `Custom: ${id.slice(0, 8)}...`;
    const newList = [...customIDs, { id, name }];
    setCustomIDs(newList);
    updateSettings({ ...settings, customAppIDs: newList, selectedAppID: id });
  };

  const handleDeleteCustomID = (id: string) => {
    if (!settings) return;
    const newList = customIDs.filter(c => c.id !== id);
    setCustomIDs(newList);
    updateSettings({ 
      ...settings, 
      customAppIDs: newList, 
      selectedAppID: settings.selectedAppID === id ? 'threat-all' : settings.selectedAppID 
    });
  };

  const handleUpdateAPIKey = (provider: string, key: string) => {
    if (!settings) return;
    updateSettings({
      ...settings,
      apiKeys: { ...settings.apiKeys, [provider]: key }
    });
  };

  const handleUpdateModel = (provider: string, model: string) => {
    if (!settings) return;
    updateSettings({
      ...settings,
      models: { ...settings.models, [provider]: model }
    });
  };

  const handleSelectProvider = (p: string) => {
    if (!settings) return;
    updateSettings({ ...settings, selectedProvider: p as any, enabledProviders: [p] });
  };

  if (!settings) return null;

  const isFree = settings.selectedProvider === 'picoapps';

  return (
    <div className="min-h-screen bg-[#191919] text-white flex flex-col">
      <header className="p-4 border-b border-white/10 flex items-center gap-4 sticky top-0 bg-[#191919] z-[100]">
        <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-all text-white active:scale-95">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold font-display">Redwan Assistant Settings</h1>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8">
        {/* Provider Selection */}
        <section className="space-y-4">
          <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] px-2">Select Provider</h2>
          <div className="grid grid-cols-3 gap-3">
            {['picoapps', 'gemini', 'openrouter'].map(p => (
              <button
                key={p}
                onClick={() => handleSelectProvider(p)}
                className={`flex flex-col items-center justify-center p-4 rounded-3xl border transition-all gap-2 ${
                  settings.selectedProvider === p ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 grayscale opacity-60'
                }`}
              >
                <Sparkles size={20} className={settings.selectedProvider === p ? 'text-white' : 'text-blue-400'} />
                <span className="text-[10px] font-black uppercase tracking-widest">{p === 'picoapps' ? 'Free' : p}</span>
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
                      (settings.selectedAppID || 'threat-all') === app.id ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-sm font-black">{app.name}</span>
                      <span className="text-[10px] text-white/40 font-mono uppercase">{app.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {(settings.selectedAppID || 'threat-all') === app.id && <Check size={18} className="text-blue-400" />}
                      {customIDs.some(c => c.id === app.id) && (
                        <div onClick={(e) => { e.stopPropagation(); handleDeleteCustomID(app.id); }} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                          <Trash size={16} />
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
                    <h2 className="text-lg font-bold capitalize">{settings.selectedProvider} API</h2>
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
                        value={settings.apiKeys[settings.selectedProvider] || ''}
                        onChange={(e) => handleUpdateAPIKey(settings.selectedProvider, e.target.value)}
                        placeholder="Paste your key here..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-mono outline-none"
                      />
                      <AnimatePresence>
                        {!isRevealed[settings.selectedProvider] && (
                          <motion.div 
                            initial={false}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            onClick={() => setIsRevealed({...isRevealed, [settings.selectedProvider]: true})}
                            className="absolute inset-0 bg-blue-600 flex items-center justify-center gap-2 cursor-pointer z-10"
                          >
                            <Lock size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">Tap to Reveal API</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <button 
                        onClick={() => setIsRevealed({...isRevealed, [settings.selectedProvider]: false})}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full transition-all text-white/40"
                      >
                        {isRevealed[settings.selectedProvider] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Manual Model Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase ml-4">Manual Model Name</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={settings.models[settings.selectedProvider] || ''}
                        onChange={(e) => handleUpdateModel(settings.selectedProvider, e.target.value)}
                        placeholder="e.g. gemini-1.5-pro-latest"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold outline-none border-dashed focus:border-blue-500/50"
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

        <footer className="pt-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">v2.8 Stable Built</span>
          </div>
          <p className="text-xs text-white/20 px-12 leading-relaxed">
            All data and keys stay local in your browser's IndexedDB. Redwan Assistant never transmits your credentials to external servers.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default AISettingsPage;
