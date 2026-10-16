/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  KeyRound,
  Check,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  MessageSquare,
  Plus,
  Trash2,
  Sparkles,
  Rocket,
  Zap,
  Cpu,
  Bot,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  CircleCheck,
} from 'lucide-react';
import { DataManager, AISettings } from '../../services/storage/DataManager';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../utils/translator';

const PROVIDERS = [
  { id: 'gemini', name: 'Gemini', tagline: 'Google AI', iconBg: 'bg-sky-500/15 border-sky-500/25', glow: 'shadow-[0_12px_36px_rgba(56,189,248,0.18)]' },
  { id: 'openrouter', name: 'OpenRouter', tagline: 'Multi-model gateway', iconBg: 'bg-orange-500/15 border-orange-500/25', glow: 'shadow-[0_12px_36px_rgba(249,115,22,0.18)]' },
  { id: 'fireworks', name: 'Fireworks', tagline: 'Fast inference', iconBg: 'bg-orange-500/15 border-orange-500/25', glow: 'shadow-[0_12px_36px_rgba(249,115,22,0.18)]' },
  { id: 'together', name: 'Together', tagline: 'Open models', iconBg: 'bg-amber-500/15 border-amber-500/25', glow: 'shadow-[0_12px_36px_rgba(245,158,11,0.18)]' },
] as const;

const ProviderIcon = ({ id }: { id: string }) => {
  if (id === 'gemini') {
    return <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-gemini-icon.png" className="w-6 h-6 object-contain" alt="Gemini" />;
  }
  if (id === 'openrouter') return <Sparkles size={22} className="text-orange-400" />;
  if (id === 'fireworks') return <Rocket size={22} className="text-orange-400" />;
  return <Zap size={22} className="text-amber-400" />;
};

const AIConfigurationPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [draftSettings, setDraftSettings] = useState<AISettings | null>(null);
  const [prevSettings, setPrevSettings] = useState<AISettings | null>(null);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isRevealed, setIsRevealed] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [newModel, setNewModel] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; showUndo?: boolean } | null>(null);

  const isDirty = settings && draftSettings && JSON.stringify(settings) !== JSON.stringify(draftSettings);

  useEffect(() => {
    DataManager.getAISettings().then(s => {
      setSettings(s);
      setDraftSettings(JSON.parse(JSON.stringify(s)));
    });
  }, []);

  // {t('aiConfig.unsaved')} warning
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
    setNewModel('');
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
    setNewModel('');
  };

  const handleAddModel = () => {
    if (!draftSettings) return;
    const val = newModel.trim();
    if (!val) return;
    const provider = draftSettings.selectedProvider;
    const list = draftSettings.providerModels[provider] || [];
    if (!list.includes(val)) {
      updateDraft({ providerModels: { ...draftSettings.providerModels, [provider]: [...list, val] } });
    }
    setNewModel('');
  };

  const handleRemoveModel = (index: number) => {
    if (!draftSettings) return;
    const provider = draftSettings.selectedProvider;
    const newList = (draftSettings.providerModels[provider] || []).filter((_, i) => i !== index);
    updateDraft({ providerModels: { ...draftSettings.providerModels, [provider]: newList } });
  };

  if (!draftSettings) {
    return (
      <div className="min-h-screen bg-[#120e0c] text-white flex flex-col items-center justify-center gap-4 font-sans">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-orange-500/15 border-t-orange-400 rounded-full"
        />
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/25">Loading…</p>
      </div>
    );
  }

  const provider = draftSettings.selectedProvider;
  const activeProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];
  const models = draftSettings.providerModels[provider] || [];
  const hasKey = !!(draftSettings.apiKeys[provider] || '').trim();
  const activeModel = draftSettings.selectedModels?.[provider] || '';

  return (
    <div className="min-h-screen bg-[#120e0c] text-white flex flex-col font-sans selection:bg-orange-500/30 relative">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-gradient-to-b from-orange-600/[0.10] via-amber-600/[0.04] to-transparent" />
      <div className="pointer-events-none fixed -top-24 right-0 w-72 h-72 rounded-full bg-orange-600/10 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-[#120e0c]/85 backdrop-blur-2xl">
        <div className="px-4 sm:px-6 md:px-10 py-4 flex items-center justify-between gap-3 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              onClick={handleBack}
              className="w-11 h-11 shrink-0 bg-white/[0.05] hover:bg-white/[0.1] rounded-2xl transition-all text-white active:scale-90 border border-white/[0.07] flex items-center justify-center group"
              aria-label="Back"
            >
              <ChevronLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-b from-orange-400/25 to-orange-600/10 border border-orange-400/25 flex items-center justify-center shadow-[0_10px_28px_rgba(249,115,22,0.25)]">
              <Cpu size={22} className="text-orange-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight truncate">
                {t('settings.aiConfig')}
              </h1>
              <p className="text-[9px] text-white/30 uppercase font-black tracking-[0.28em] mt-0.5">{t('aiConfig.tagline')}</p>
            </div>
          </div>

          <div className={cn(
            "inline-flex items-center gap-2 px-3.5 py-2 rounded-full border shrink-0 transition-colors",
            isDirty ? "bg-amber-500/10 border-amber-500/25" : "bg-emerald-500/10 border-emerald-500/25"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isDirty ? "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            )} />
            <span className={cn(
              "text-[9px] font-black uppercase tracking-[0.18em] leading-none",
              isDirty ? "text-amber-300" : "text-emerald-300"
            )}>
              {isDirty ? t('aiConfig.unsaved') : (language === 'bn' ? 'সিঙ্ক হয়েছে' : 'Synced')}
            </span>
          </div>
        </div>
      </header>

      <main className="relative flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 space-y-8 pb-52">
        {/* Summary strip */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: t('aiConfig.statsProvider'), value: activeProvider.name },
            { label: t('aiConfig.statsModels'), value: String(models.length) },
            { label: t('aiConfig.statsKey'), value: hasKey ? t('aiConfig.keySet') : t('aiConfig.keyMissing') },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] shadow-lg min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 truncate">{stat.label}</p>
              <p className="text-sm sm:text-base font-black tracking-tight mt-1 truncate">{stat.value}</p>
            </div>
          ))}
        </section>

        {/* Provider Selection */}
        <section className="space-y-4">
          <div className="flex items-center gap-4 px-1">
            <h2 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] shrink-0">{t('aiConfig.selectCore')}</h2>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="radiogroup" aria-label={t('aiConfig.selectCore')}>
            {PROVIDERS.map((p) => {
              const isActive = provider === p.id;
              const pModels = draftSettings.providerModels[p.id as keyof typeof draftSettings.providerModels] || [];
              const pHasKey = !!((draftSettings.apiKeys as Record<string, string>)[p.id] || '').trim();
              return (
                <button
                  key={p.id}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => handleSelectProvider(p.id)}
                  className={cn(
                    "relative flex flex-col items-start p-4 rounded-3xl border text-left transition-all duration-200 active:scale-[0.98] overflow-hidden",
                    isActive
                      ? `bg-orange-600/[0.12] border-orange-400/50 ring-1 ring-orange-400/30 ${p.glow}`
                      : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.14]"
                  )}
                >
                  {isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/40"
                    >
                      <Check size={11} strokeWidth={3.5} />
                    </motion.span>
                  )}
                  <div className={cn(
                    "w-11 h-11 rounded-2xl border flex items-center justify-center mb-3",
                    p.iconBg,
                    !isActive && "opacity-70"
                  )}>
                    <ProviderIcon id={p.id} />
                  </div>
                  <span className={cn("text-[13px] font-black tracking-tight leading-tight", isActive ? "text-white" : "text-white/70")}>
                    {p.name}
                  </span>
                  <span className="text-[10px] font-medium text-white/30 mt-0.5 leading-tight">{p.tagline}</span>
                  <span className="flex items-center gap-2 mt-3">
                    <span className={cn(
                      "flex items-center gap-1 text-[9px] font-black uppercase tracking-wider",
                      pHasKey ? "text-emerald-400" : "text-white/25"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", pHasKey ? "bg-emerald-400" : "bg-white/20")} />
                      {pHasKey ? 'Key set' : 'No key'}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-white/25">
                      {pModels.length} model{pModels.length === 1 ? '' : 's'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Configuration Card */}
        <AnimatePresence mode="wait">
          <motion.section
            key={provider}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.02] shadow-2xl overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center gap-4 px-6 sm:px-8 pt-6 sm:pt-8 pb-6 border-b border-white/[0.06]">
              <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0", activeProvider.iconBg)}>
                <ProviderIcon id={provider} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black tracking-tight truncate">{activeProvider.name} {t('aiConfig.configuration')}</h2>
                <p className="text-[9px] text-white/30 font-black uppercase tracking-[0.25em] mt-0.5">{language === 'bn' ? 'ক্রেডেনশিয়াল ও মডেল' : 'Credentials & Models'}</p>
              </div>
              <span className={cn(
                "hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider shrink-0",
                hasKey
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-300"
              )}>
                {hasKey ? <CircleCheck size={12} /> : <AlertCircle size={12} />}
                {hasKey ? 'Key ready' : 'Key needed'}
              </span>
            </div>

            <div className="px-6 sm:px-8 py-7 space-y-8">
              {/* API Key */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <label htmlFor="ai-api-key" className="text-[10px] font-black text-white/35 uppercase tracking-[0.22em] flex items-center gap-2">
                    <KeyRound size={13} className="text-orange-300" /> {t('aiConfig.accessKey')}
                  </label>
                  {provider === 'gemini' && (
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-orange-300 hover:text-orange-200 underline underline-offset-2 inline-flex items-center gap-1 transition-colors"
                    >
                      বিনামূল্যে Gemini API Key নিন <ExternalLink size={11} />
                    </a>
                  )}
                  {provider === 'openrouter' && (
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-orange-300 hover:text-orange-200 underline underline-offset-2 inline-flex items-center gap-1 transition-colors"
                    >
                      OpenRouter Key নিন <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                <div className="relative rounded-2xl border border-white/[0.09] bg-black/30 transition-all focus-within:border-orange-400/60 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:bg-orange-500/[0.04]">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                  <input
                    id="ai-api-key"
                    type={isRevealed[provider] ? 'text' : 'password'}
                    value={draftSettings.apiKeys[provider] || ''}
                    onChange={(e) => handleUpdateAPIKey(provider, e.target.value)}
                    placeholder={language === 'bn' ? 'আপনার API কী দিন...' : 'Paste your API key...'}
                    autoComplete="off"
                    className="w-full bg-transparent text-sm font-mono outline-none placeholder:font-sans placeholder:text-white/20 pl-11 pr-12 py-4 rounded-2xl"
                  />
                  <button
                    onClick={() => setIsRevealed({ ...isRevealed, [provider]: !isRevealed[provider] })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-xl transition-all text-white/30 hover:text-white active:scale-90"
                    aria-label={isRevealed[provider] ? 'Hide API key' : 'Show API key'}
                  >
                    {isRevealed[provider] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-orange-500/[0.06] border border-orange-500/[0.14] text-[11px] text-white/45 leading-relaxed">
                  <Info size={14} className="shrink-0 text-orange-300 mt-0.5" />
                  <span>
                    <strong className="text-white/75">GitHub Pages ব্যবহারকারীদের জন্য:</strong> GitHub Pages একটি স্ট্যাটিক সাইট (এখানে কোনো ব্যাকএন্ড সার্ভার থাকে না)। তাই AI ব্যবহার করতে এখানে আপনার নিজস্ব বিনামূল্যে পাওয়া Gemini বা OpenRouter API Key সেভ করুন।
                  </span>
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Models */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="new-model-input" className="text-[10px] font-black text-white/35 uppercase tracking-[0.22em] flex items-center gap-2">
                    <Bot size={13} className="text-orange-300" /> {t('aiConfig.configuredModels')}
                  </label>
                  <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-black text-white/50">
                    {models.length}
                  </span>
                </div>

                {models.length > 0 ? (
                  <ul className="space-y-2">
                    {models.map((model, mIdx) => (
                      <li
                        key={`${model}-${mIdx}`}
                        className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-orange-400/25 transition-colors group"
                      >
                        <Bot size={15} className="text-orange-300/70 shrink-0" />
                        <span className="flex-1 min-w-0 text-[13px] font-bold font-mono text-white/85 truncate">{model}</span>
                        {model === activeModel && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[9px] font-black uppercase tracking-wider shrink-0">
                            Default
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveModel(mIdx)}
                          className="p-2.5 rounded-xl text-white/35 hover:text-red-300 hover:bg-red-500/10 transition-all active:scale-90 shrink-0"
                          aria-label={`Remove ${model}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-8 px-4 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] flex flex-col items-center text-center gap-2">
                    <Bot size={26} className="text-white/15" />
                    <p className="text-xs font-bold text-white/35">{t('aiConfig.noModels')}</p>
                    <p className="text-[11px] text-white/20">{t('aiConfig.noModelsDesc')}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    id="new-model-input"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder={t('aiConfig.addModelPlaceholder')}
                    className="flex-1 min-w-0 bg-black/30 border border-white/[0.09] rounded-2xl px-4 py-3.5 text-sm font-mono placeholder:font-sans placeholder:text-white/20 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddModel();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddModel}
                    disabled={!newModel.trim()}
                    className="px-4 sm:px-5 shrink-0 bg-gradient-to-b from-orange-400 to-orange-600 hover:from-orange-300 hover:to-orange-500 disabled:from-white/[0.06] disabled:to-white/[0.06] disabled:text-white/25 text-white rounded-2xl transition-all active:scale-95 shadow-[0_10px_24px_rgba(249,115,22,0.3)] disabled:shadow-none flex items-center gap-1.5 text-xs font-black"
                  >
                    <Plus size={17} strokeWidth={3} />
                    <span className="hidden sm:inline">{t('aiConfig.add')}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        </AnimatePresence>

        {/* System Prompt */}
        <section className="rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-300">
                <MessageSquare size={17} />
              </div>
              <h3 className="text-[10px] font-black text-white/45 uppercase tracking-[0.22em]">
                {t('aiConfig.systemPrompt')}
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              {t('aiConfig.builtIn')}
            </span>
          </div>

          <div className="p-4 sm:p-5 bg-black/30 border border-white/[0.07] rounded-2xl text-xs text-white/55 leading-relaxed">
            <p className="font-semibold text-white/85 mb-1.5 flex items-center gap-1.5">
              <CircleCheck size={13} className="text-emerald-400" /> স্বয়ংক্রিয় সিস্টেম প্রম্পট সক্রিয়:
            </p>
            <p>নোট তৈরি/আপডেট কমান্ড, বাংলা ও ইংরেজি ভাষা সমর্থন, রিচ ব্লক সিনট্যাক্স (হেডিং, কালার, কলআউট, টাস্কলিস্ট, টেবিল) এবং অ্যাটাচড নোটস রিকগনিশন ইঞ্জিন স্বয়ংক্রিয়ভাবে সক্রিয় রয়েছে। ম্যানুয়াল কনফিগারেশনের প্রয়োজন নেই।</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <p className="text-[10px] text-white/35 font-medium">সিস্টেম প্রম্পট অ্যাপের কোর ইঞ্জিন দ্বারা নিয়ন্ত্রিত ও অপ্টিমাইজড।</p>
          </div>
        </section>

        {/* Privacy note */}
        <p className="text-[11px] text-white/25 px-4 leading-relaxed font-medium text-center flex items-start justify-center gap-2">
          <ShieldCheck size={14} className="text-emerald-400/70 shrink-0 mt-px" />
          <span>আপনার সব ডেটা এবং কীগুলো ব্রাউজারের ইনডেক্স-ডিবিতে (IndexedDB) লোকালভাবে থাকে। রেডওয়ান অ্যাসিস্ট্যান্ট কখনোই আপনার ক্রেডিটেন্সিয়ার বাইরের কোনো সার্ভারে পাঠায় না।</span>
        </p>
      </main>

      {/* Floating save dock — appears only with unsaved changes */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed inset-x-4 bottom-24 z-[110] flex justify-center pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center gap-2 p-2 pl-4 rounded-full bg-[#17131f]/95 backdrop-blur-2xl border border-orange-400/25 shadow-[0_20px_50px_rgba(0,0,0,0.6)] max-w-full">
              <span className="hidden sm:flex items-center gap-2 pr-1 text-[10px] font-black uppercase tracking-wider text-amber-300 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {t('aiConfig.unsaved')}
              </span>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
              >
                <RotateCcw size={13} /> {t('aiConfig.reset')}
              </button>
              <button
                onClick={handleManualSave}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 hover:from-orange-300 hover:to-orange-500 text-white text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-[0_8px_20px_rgba(249,115,22,0.4)] flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} strokeWidth={3} />}
                {isSaving ? (language === 'bn' ? 'সেভ হচ্ছে…' : 'Saving…') : (language === 'bn' ? 'সেভ করুন' : 'Save')}
              </button>
              <button
                onClick={handleBack}
                className="w-9 h-9 shrink-0 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white flex items-center justify-center transition-all active:scale-90"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Toast with Undo */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={cn(
              "fixed bottom-24 left-4 right-4 sm:left-auto sm:right-8 sm:max-w-md z-[120] p-4 rounded-3xl border flex items-center gap-3 shadow-2xl backdrop-blur-xl",
              status.type === 'success' ? "bg-emerald-600/95 border-emerald-400/30 text-white" :
              status.type === 'error' ? "bg-red-600/95 border-red-400/30 text-white" :
              "bg-orange-600/95 border-orange-400/30 text-white"
            )}
            role="status"
          >
            <span className="shrink-0">
              {status.type === 'error' ? <AlertCircle size={19} /> : status.type === 'success' ? <CircleCheck size={19} /> : <Info size={19} />}
            </span>
            <p className="text-sm font-bold flex-1 min-w-0">{status.message}</p>
            <span className="flex items-center gap-1.5 shrink-0">
              {status.showUndo && prevSettings && (
                <button
                  onClick={handleUndo}
                  className="px-3.5 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  {language === 'bn' ? 'আগে ফিরুন' : 'Undo'}
                </button>
              )}
              <button onClick={() => setStatus(null)} className="p-2 hover:bg-white/15 rounded-full transition-all" aria-label="Dismiss">
                <X size={17} />
              </button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Warning Modal */}
      <AnimatePresence>
        {showExitWarning && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExitWarning(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
            />
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-5 pointer-events-none">
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 12 }}
                className="w-full max-w-sm bg-[#17131f] border border-white/10 rounded-[2rem] p-7 shadow-2xl pointer-events-auto"
                role="alertdialog"
                aria-labelledby="exit-warning-title"
              >
                <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mb-5 mx-auto">
                  <AlertCircle size={30} />
                </div>
                <h3 id="exit-warning-title" className="text-xl font-black tracking-tight text-center mb-2">{language === 'bn' ? 'সেভ করা হয়নি!' : 'Unsaved Changes!'}</h3>
                <p className="text-sm text-white/40 text-center mb-7 leading-relaxed">{language === 'bn' ? 'আপনার কিছু পরিবর্তন সংরক্ষণ করা হয়নি। আপনি কি নিশ্চিতভাবে বের হতে চান?' : 'Some changes have not been saved. Do you really want to leave?'}</p>
                <div className="flex flex-col gap-2.5">
                  <button onClick={handleConfirmExit} className="w-full py-3.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/25 active:scale-[0.98]">{language === 'bn' ? 'হ্যাঁ, বের হয়ে যান' : 'Yes, Leave'}</button>
                  <button onClick={() => setShowExitWarning(false)} className="w-full py-3.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/80 font-bold rounded-2xl transition-all active:scale-[0.98]">{language === 'bn' ? 'ফিরে যান' : 'Go Back'}</button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIConfigurationPage;
