/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Settings, Key, Check, AlertCircle, Info, Sparkles, Trash2 } from 'lucide-react';
import { DataManager, AISettings } from '../../utils/DataManager';

const AISettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [showKeyModal, setShowKeyModal] = useState<{ model: string; key: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<'chat' | 'memory' | null>(null);
  const [tempKey, setTempKey] = useState('');

  useEffect(() => {
    DataManager.getAISettings().then(setSettings);
  }, []);

  const handleToggleProvider = async (provider: string) => {
    if (!settings) return;

    const isEnabled = settings.enabledProviders.includes(provider);
    
    if (isEnabled) {
      // If it's already enabled, we don't do anything because we want at least one enabled
      // and with single-enable, disabling the current one would leave zero enabled.
      return;
    } else {
      // Single Enable Feature: Disable all others and enable this one
      // Check if API key exists for non-free models
      if (provider !== 'picoapps') {
        const hasKey = settings.apiKeys[provider as keyof typeof settings.apiKeys];
        if (!hasKey) {
          setShowKeyModal({ model: provider, key: '' });
          return;
        }
      }

      // Mutually exclusive: Only one provider can be enabled at a time
      const newEnabledProviders = [provider]; 
      const newSettings = { 
        ...settings, 
        enabledProviders: newEnabledProviders, 
        selectedProvider: provider as any 
      };
      setSettings(newSettings);
      await DataManager.saveAISettings(newSettings);
    }
  };

  const handleSelectProvider = async (provider: string) => {
    if (!settings || !settings.enabledProviders.includes(provider)) return;
    const newSettings = { ...settings, selectedProvider: provider as any };
    setSettings(newSettings);
    await DataManager.saveAISettings(newSettings);
  };

  const handleModelChange = async (provider: string, model: string) => {
    if (!settings) return;
    const newSettings = {
      ...settings,
      selectedModels: {
        ...settings.selectedModels,
        [provider]: model
      }
    };
    setSettings(newSettings);
    await DataManager.saveAISettings(newSettings);
  };

  const handleToggleDataChecking = async () => {
    if (!settings) return;
    const newSettings = { ...settings, dataCheckingEnabled: !settings.dataCheckingEnabled };
    setSettings(newSettings);
    await DataManager.saveAISettings(newSettings);
  };

  const handleToggleRetry = async () => {
    if (!settings) return;
    const newSettings = { 
      ...settings, 
      retrySettings: { 
        ...settings.retrySettings, 
        enabled: !settings.retrySettings.enabled 
      } 
    };
    setSettings(newSettings);
    await DataManager.saveAISettings(newSettings);
  };

  const handleRetryErrorCodesChange = async (codes: string) => {
    if (!settings) return;
    const newSettings = { 
      ...settings, 
      retrySettings: { 
        ...settings.retrySettings, 
        errorCodes: codes 
      } 
    };
    setSettings(newSettings);
    await DataManager.saveAISettings(newSettings);
  };

  const handleDataCheckingModelChange = async (model: 'selected' | 'free' | 'custom') => {
    if (!settings) return;
    const newSettings = { ...settings, dataCheckingModel: model };
    setSettings(newSettings);
    await DataManager.saveAISettings(newSettings);
  };

  const handleDataCheckingCustomProviderChange = async (provider: 'gemini' | 'openrouter' | 'mistral') => {
    if (!settings) return;
    const newSettings = { ...settings, dataCheckingCustomProvider: provider };
    setSettings(newSettings);
    await DataManager.saveAISettings(newSettings);
  };

  const handleSaveKey = async () => {
    if (!settings || !showKeyModal) return;

    const newSettings = {
      ...settings,
      apiKeys: {
        ...settings.apiKeys,
        [showKeyModal.model]: tempKey
      },
      enabledProviders: [showKeyModal.model],
      selectedProvider: showKeyModal.model as any
    };

    setSettings(newSettings);
    await DataManager.saveAISettings(newSettings);
    setShowKeyModal(null);
    setTempKey('');
  };

  const handleResetMemory = async () => {
    await DataManager.saveContextSummary({ text: "", timestamp: Date.now() });
    setShowClearConfirm(null);
  };

  const handleClearChat = async () => {
    await DataManager.clearChatHistory();
    const allTasks = await DataManager.getTasks();
    for (const task of allTasks) {
      await DataManager.deleteTask(task.id);
    }
    setShowClearConfirm(null);
  };

  if (!settings) return null;

  const providers = [
    { 
      id: 'picoapps', 
      name: 'PicoApps AI (Free AI)', 
      description: 'ফ্রি মডেল, কোনো কনফিগারেশন প্রয়োজন নেই। এটি বর্তমানে সক্রিয় আছে।', 
      isFree: true,
      models: [],
      isComingSoon: false
    },
    { 
      id: 'gemini', 
      name: 'Google Gemini', 
      description: 'গুগলের লেটেস্ট মডেল। হাই-কোয়ালিটি আউটপুট এবং বড় কনটেক্সট উইন্ডো।', 
      isFree: false,
      models: ['gemini-2.0-flash', 'gemini-2.0-pro-exp-02-05', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      isComingSoon: false
    },
    { 
      id: 'openrouter', 
      name: 'OpenRouter', 
      description: 'OpenRouter-এর মাধ্যমে যেকোনো মডেল ব্যবহার করুন।', 
      isFree: false,
      models: [],
      isComingSoon: false
    },
    { 
      id: 'mistral', 
      name: 'Mistral AI', 
      description: 'Mistral AI-এর শক্তিশালী ওপেন-সোর্স মডেলগুলো ব্যবহার করুন।', 
      isFree: false,
      models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-7b', 'open-mixtral-8x7b'],
      isComingSoon: false
    },
  ];

  return (
    <div className="min-h-screen bg-[#191919] text-white flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex items-center gap-4 sticky top-0 bg-[#191919]/80 backdrop-blur-md z-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/10 rounded-full transition-all text-white active:scale-95"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">AI সেটিংস</h1>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8 relative">
        {/* Control Mode Selection */}
        <section className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Sparkles className="text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">কন্ট্রোল মোড</h2>
              <p className="text-xs text-blue-100/50">আপনার ব্যবহারের ধরন অনুযায়ী মোড বেছে নিন।</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                const newSettings = { ...settings, controlMode: 'auto' as const };
                setSettings(newSettings);
                await DataManager.saveAISettings(newSettings);
              }}
              className={`p-4 rounded-2xl border transition-all text-left space-y-1 ${
                settings.controlMode === 'auto'
                  ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-600/20'
                  : 'bg-white/5 border-white/5 hover:border-white/10'
              }`}
            >
              <p className={`text-sm font-bold ${settings.controlMode === 'auto' ? 'text-white' : 'text-white/60'}`}>Auto</p>
              <p className={`text-[10px] ${settings.controlMode === 'auto' ? 'text-blue-100/70' : 'text-white/30'}`}>সিস্টেম অটোমেটিক ফ্রি মডেল ব্যবহার করবে।</p>
            </button>
            <button
              onClick={async () => {
                const newSettings = { ...settings, controlMode: 'manual' as const };
                setSettings(newSettings);
                await DataManager.saveAISettings(newSettings);
              }}
              className={`p-4 rounded-2xl border transition-all text-left space-y-1 ${
                settings.controlMode === 'manual'
                  ? 'bg-white/10 border-white/30 shadow-lg'
                  : 'bg-white/5 border-white/5 hover:border-white/10'
              }`}
            >
              <p className={`text-sm font-bold ${settings.controlMode === 'manual' ? 'text-white' : 'text-white/60'}`}>Manual Control</p>
              <p className={`text-[10px] ${settings.controlMode === 'manual' ? 'text-white/50' : 'text-white/30'}`}>আপনি নিজে মডেল এবং API কনফিগার করতে পারবেন।</p>
            </button>
          </div>
        </section>

        {settings.controlMode === 'auto' ? (
          <section className="py-12 text-center space-y-4 opacity-60">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Settings className="text-white/20" size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white/40">অ্যাডভান্সড সেটিংস লকড</h3>
              <p className="text-xs text-white/20 px-12">Auto মোডে অ্যাডভান্সড সেটিংস পরিবর্তন করা সম্ভব নয়। পরিবর্তন করতে Manual Control মোড অন করুন।</p>
            </div>
          </section>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-white/40 mb-2">
                <Info size={16} />
                <p className="text-sm">আপনার পছন্দের AI প্রোভাইডার বেছে নিন। ফ্রি মডেল ডিফল্টভাবে দেওয়া থাকে।</p>
              </div>

          {providers.map((provider) => {
            const isEnabled = settings.enabledProviders.includes(provider.id);
            const isSelected = settings.selectedProvider === provider.id;
            const hasKey = provider.isFree || settings.apiKeys[provider.id as keyof typeof settings.apiKeys];

            return (
              <motion.div 
                key={provider.id}
                layout
                className={`p-5 rounded-2xl border transition-all duration-300 ${
                  isSelected 
                    ? 'bg-white/10 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                    : 'bg-white/5 border-white/5 hover:border-white/10'
                } ${provider.isComingSoon ? 'opacity-60 grayscale' : ''}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => !provider.isComingSoon && isEnabled && handleSelectProvider(provider.id)}>
                    <div className="flex items-center gap-3">
                      <h3 className={`font-bold text-lg transition-colors ${isSelected ? 'text-white' : 'text-white/70'}`}>
                        {provider.name}
                      </h3>
                      {provider.isComingSoon && (
                        <span className="bg-white/10 text-white/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/10">
                          Soon
                        </span>
                      )}
                      {isSelected && (
                        <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Active
                        </span>
                      )}
                      {provider.isFree && (
                        <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-green-500/20">
                          Free
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/40 mt-1">{provider.description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {!provider.isFree && !provider.isComingSoon && (
                      <button 
                        onClick={() => {
                          setTempKey(settings.apiKeys[provider.id as keyof typeof settings.apiKeys] || '');
                          setShowKeyModal({ model: provider.id, key: settings.apiKeys[provider.id as keyof typeof settings.apiKeys] || '' });
                        }}
                        className={`p-2.5 rounded-xl transition-all ${
                          hasKey ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                        }`}
                        title="Configure API Key"
                      >
                        <Settings size={20} />
                      </button>
                    )}
                    
                    {!provider.isComingSoon && (
                      <button
                        onClick={() => handleToggleProvider(provider.id)}
                        className={`relative w-14 h-7 rounded-full transition-all duration-500 border-2 ${
                          isEnabled 
                            ? 'bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className={`absolute top-1 left-1 text-[8px] font-bold transition-opacity duration-300 ${isEnabled ? 'opacity-100' : 'opacity-0'}`}>
                          ON
                        </div>
                        <div className={`absolute top-1 right-1 text-[8px] font-bold transition-opacity duration-300 ${!isEnabled ? 'opacity-100' : 'opacity-0'}`}>
                          OFF
                        </div>
                        <motion.div
                          animate={{ x: isEnabled ? 28 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-lg transition-colors duration-300 ${
                            isEnabled ? 'bg-white' : 'bg-white/20'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {isEnabled && provider.id === 'openrouter' && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">মডেলের নাম (ম্যানুয়াল)</label>
                    <input
                      type="text"
                      value={settings.selectedModels.openrouter || ''}
                      onChange={(e) => handleModelChange('openrouter', e.target.value)}
                      placeholder="যেমন: google/gemini-pro-1.5"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
                    />
                    <p className="text-[10px] text-white/20 italic">OpenRouter থেকে মডেলের পুরো নাম দিন (যেমন: anthropic/claude-3-sonnet)।</p>
                  </div>
                )}

                {isEnabled && provider.models.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">মডেল সিলেক্ট করুন</label>
                    <div className="grid grid-cols-2 gap-2">
                      {provider.models.map(model => (
                        <button
                          key={model}
                          onClick={() => handleModelChange(provider.id, model)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            settings.selectedModels[provider.id as keyof typeof settings.selectedModels] === model
                              ? 'bg-white text-black border-white'
                              : 'bg-white/5 text-white/40 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isEnabled && !provider.isFree && !hasKey && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-400 text-xs font-medium">
                    <AlertCircle size={16} />
                    <span>API কী নেই। এটি কনফিগার না করা পর্যন্ত কাজ করবে না।</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </section>

        <section className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Check size={20} className="text-blue-400" />
                ডেটা চেকিং
              </h2>
              <p className="text-xs text-white/40">সঠিকতা এবং সম্পূর্ণতার জন্য AI আউটপুট যাচাই করুন।</p>
            </div>
            <button
              onClick={handleToggleDataChecking}
              className={`relative w-14 h-7 rounded-full transition-all duration-500 border-2 ${
                settings.dataCheckingEnabled 
                  ? 'bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className={`absolute top-1 left-1 text-[8px] font-bold transition-opacity duration-300 ${settings.dataCheckingEnabled ? 'opacity-100' : 'opacity-0'}`}>
                ON
              </div>
              <div className={`absolute top-1 right-1 text-[8px] font-bold transition-opacity duration-300 ${!settings.dataCheckingEnabled ? 'opacity-100' : 'opacity-0'}`}>
                OFF
              </div>
              <motion.div
                animate={{ x: settings.dataCheckingEnabled ? 28 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-lg transition-colors duration-300 ${
                  settings.dataCheckingEnabled ? 'bg-white' : 'bg-white/20'
                }`}
              />
            </button>
          </div>

          {settings.dataCheckingEnabled && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-4 border-t border-white/5"
            >
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">ভেরিফিকেশন মডেল</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleDataCheckingModelChange('selected')}
                  className={`p-4 rounded-2xl border transition-all text-left space-y-1 ${
                    settings.dataCheckingModel === 'selected'
                      ? 'bg-white/10 border-white/30'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <p className={`text-sm font-bold ${settings.dataCheckingModel === 'selected' ? 'text-white' : 'text-white/60'}`}>সিলেক্টেড</p>
                  <p className="text-[10px] text-white/30">অ্যাক্টিভ প্রোভাইডার</p>
                </button>
                <button
                  onClick={() => handleDataCheckingModelChange('free')}
                  className={`p-4 rounded-2xl border transition-all text-left space-y-1 ${
                    settings.dataCheckingModel === 'free'
                      ? 'bg-white/10 border-white/30'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <p className={`text-sm font-bold ${settings.dataCheckingModel === 'free' ? 'text-white' : 'text-white/60'}`}>ফ্রি মডেল</p>
                  <p className="text-[10px] text-white/30">PicoApps AI</p>
                </button>
                <button
                  onClick={() => handleDataCheckingModelChange('custom')}
                  className={`p-4 rounded-2xl border transition-all text-left space-y-1 ${
                    settings.dataCheckingModel === 'custom'
                      ? 'bg-white/10 border-white/30'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <p className={`text-sm font-bold ${settings.dataCheckingModel === 'custom' ? 'text-white' : 'text-white/60'}`}>কাস্টম</p>
                  <p className="text-[10px] text-white/30">পছন্দমতো বেছে নিন</p>
                </button>
              </div>

              {settings.dataCheckingModel === 'custom' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-3 gap-2 mt-4"
                >
                  {['gemini', 'openrouter', 'mistral'].map((p) => (
                    <button
                      key={p}
                      onClick={() => handleDataCheckingCustomProviderChange(p as any)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        settings.dataCheckingCustomProvider === p
                          ? 'bg-white text-black border-white'
                          : 'bg-white/5 text-white/40 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </section>

        {/* Retry Settings */}
        <section className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-400" />
                এরর হ্যান্ডলিং ও রিট্রাই
              </h2>
              <p className="text-xs text-white/40">নির্দিষ্ট এরর ঘটলে অটোমেটিক রিট্রাই করবে।</p>
            </div>
            <button
              onClick={handleToggleRetry}
              className={`relative w-14 h-7 rounded-full transition-all duration-500 border-2 ${
                settings.retrySettings.enabled 
                  ? 'bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className={`absolute top-1 left-1 text-[8px] font-bold transition-opacity duration-300 ${settings.retrySettings.enabled ? 'opacity-100' : 'opacity-0'}`}>
                ON
              </div>
              <div className={`absolute top-1 right-1 text-[8px] font-bold transition-opacity duration-300 ${!settings.retrySettings.enabled ? 'opacity-100' : 'opacity-0'}`}>
                OFF
              </div>
              <motion.div
                animate={{ x: settings.retrySettings.enabled ? 28 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-lg transition-colors duration-300 ${
                  settings.retrySettings.enabled ? 'bg-white' : 'bg-white/20'
                }`}
              />
            </button>
          </div>

          {settings.retrySettings.enabled && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-4 border-t border-white/5"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">নির্দিষ্ট এরর কোড</label>
                <textarea
                  value={settings.retrySettings.errorCodes}
                  onChange={(e) => handleRetryErrorCodesChange(e.target.value)}
                  placeholder="এরর কোডগুলো এখানে পেস্ট করুন (কমা দিয়ে আলাদা করুন)..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 transition-all min-h-[100px] resize-none"
                />
                <p className="text-[10px] text-white/20 italic">যদি এরর মেসেজে এই কোডগুলো থাকে, তবে সিস্টেম অটোমেটিক রিট্রাই করবে।</p>
              </div>
            </motion.div>
          )}
        </section>

        <section className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Trash2 size={20} className="text-red-400" />
            ডেটা ম্যানেজমেন্ট
          </h2>
          <p className="text-sm text-white/40 leading-relaxed mb-4">
            আপনার চ্যাট ইতিহাস এবং AI মেমরি এখান থেকে মুছতে পারেন।
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowClearConfirm('chat')}
              className="w-full py-3 bg-red-600/10 border border-red-600/20 text-red-400 rounded-xl font-bold text-sm hover:bg-red-600/20 transition-all"
            >
              চ্যাট ইতিহাস মুছুন
            </button>
            <button
              onClick={() => setShowClearConfirm('memory')}
              className="w-full py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl font-bold text-sm hover:bg-white/10 transition-all"
            >
              AI মেমরি রিসেট করুন
            </button>
          </div>
        </section>

        <section className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Key size={20} className="text-white/60" />
            গোপনীয়তা ও নিরাপত্তা
          </h2>
          <p className="text-sm text-white/40 leading-relaxed">
            আপনার API কী-গুলো <b>IndexedDB</b> ব্যবহার করে আপনার ডিভাইসে লোকালভাবে সেভ করা হয়। 
            এগুলো কখনোই আমাদের সার্ভারে পাঠানো হয় না। সব AI রিকোয়েস্ট সরাসরি আপনার ব্রাউজার থেকে সংশ্লিষ্ট AI প্রোভাইডারের কাছে পাঠানো হয়।
          </p>
        </section>
          </>
        )}
      </main>

      {/* API Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#222] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Key className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">API কী দিন</h2>
                  <p className="text-white/50 text-sm">{showKeyModal.model.toUpperCase()} এর জন্য</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 block">
                    API কী
                  </label>
                  <input
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowKeyModal(null)}
                    className="flex-1 py-3 rounded-2xl font-bold text-white/60 hover:bg-white/5 transition-all"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleSaveKey}
                    className="flex-1 py-3 rounded-2xl bg-white text-black font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    সেভ করুন
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#222] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-500/10 rounded-2xl">
                  <Trash2 className="text-red-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {showClearConfirm === 'chat' ? 'চ্যাট ইতিহাস মুছবেন?' : 'AI মেমরি রিসেট করবেন?'}
                  </h2>
                  <p className="text-white/50 text-sm">
                    {showClearConfirm === 'chat' 
                      ? 'এটি আপনার সব চ্যাট ইতিহাস এবং টাস্ক মুছে ফেলবে।' 
                      : 'এটি AI-এর শর্ট-টার্ম মেমরি মুছে ফেলবে।'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowClearConfirm(null)}
                  className="flex-1 py-3 rounded-2xl font-bold text-white/60 hover:bg-white/5 transition-all"
                >
                  বাতিল
                </button>
                <button
                  onClick={showClearConfirm === 'chat' ? handleClearChat : handleResetMemory}
                  className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all"
                >
                  নিশ্চিত করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AISettingsPage;
