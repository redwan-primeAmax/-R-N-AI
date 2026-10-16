/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  HardDrive,
  Cloud,
  History,
  Trash2,
  AlertTriangle,
  Globe,
  Check,
  Settings2,
  LayoutGrid,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { DataManager } from '../../services/storage/DataManager';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';
import { LANGUAGE_OPTIONS, useLanguage, type AppLanguage } from '../../utils/translator';
import { formatSize } from '../../utils/formatSize';

const SectionHeading = ({ label, danger = false }: { label: string; danger?: boolean }) => (
  <h2 className={cn(
    "text-[10px] font-black uppercase tracking-[0.32em] px-1",
    danger ? "text-red-400/70" : "text-white/30"
  )}>
    {label}
  </h2>
);

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [showConfirm1, setShowConfirm1] = useState(false);
  const [showConfirm2, setShowConfirm2] = useState(false);
  const [storage, setStorage] = useState<{ used: number; quota: number } | null>(null);
  const [workspaceCount, setWorkspaceCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [usage, workspaces] = await Promise.all([
          DataManager.getStorageUsage(),
          DataManager.getWorkspaces(),
        ]);
        if (cancelled) return;
        setStorage(usage);
        setWorkspaceCount(workspaces.length);
      } catch {
        /* Overview is informational only — the page works without it */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDeleteAppData = async () => {
    await DataManager.deleteAllData();
    window.location.reload();
  };

  const handleSelectLanguage = async (next: AppLanguage) => {
    setLanguage(next);
    // Mirror into IndexedDB preferences so backups / restores keep it.
    try {
      const prefs = await DataManager.getUserPreferences();
      await DataManager.saveUserPreferences({ ...prefs, language: next });
    } catch {
      /* localStorage (set by setLanguage) is the live source of truth */
    }
  };

  const usagePercent = storage
    ? Math.min(100, Math.max(0, (storage.used / (storage.quota || 1)) * 100))
    : 0;
  const activeLanguage = LANGUAGE_OPTIONS.find(o => o.value === language);

  const dataTiles = [
    {
      icon: HardDrive,
      title: t('settings.dataMonitor'),
      description: t('settings.dataMonitorDesc'),
      path: "/data-monitor",
      classes: "bg-orange-500/10 border-orange-500/20 text-orange-300",
    },
    {
      icon: History,
      title: t('settings.recentBackups'),
      description: t('settings.recentBackupsDesc'),
      path: "/recent-backups",
      classes: "bg-teal-500/10 border-teal-500/20 text-teal-300",
    },
    {
      icon: Cloud,
      title: t('settings.cloudArchive'),
      description: t('settings.cloudArchiveDesc'),
      path: "/cloud-archive",
      classes: "bg-sky-500/10 border-sky-500/20 text-sky-300",
    },
    {
      icon: Trash2,
      title: t('settings.recycleBin'),
      description: t('settings.recycleBinDesc'),
      path: "/recycle-bin",
      classes: "bg-red-500/10 border-red-500/20 text-red-300",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex flex-col font-sans relative">
      {/* Ambient background */}
      <div className="pointer-events-none fixed -top-28 left-1/4 w-80 h-80 rounded-full bg-cyan-500/[0.06] blur-3xl" />
      <div className="pointer-events-none fixed top-40 -right-24 w-72 h-72 rounded-full bg-indigo-500/[0.05] blur-3xl" />

      {/* Header — single clean "Settings" heading */}
      <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-[#0a0c10]/85 backdrop-blur-2xl shrink-0">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3.5 max-w-3xl mx-auto w-full">
          <button
            onClick={() => navigate('/main')}
            className="w-11 h-11 shrink-0 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] rounded-2xl transition-all flex items-center justify-center active:scale-90 group"
            aria-label={t('common.back')}
          >
            <ChevronLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-b from-cyan-300/25 to-cyan-500/10 border border-cyan-300/25 flex items-center justify-center">
            <Settings2 size={22} className="text-cyan-300" />
          </span>
          <h1 className="text-xl font-black tracking-tight leading-none flex-1 min-w-0 truncate">
            {t('settings.title')}
          </h1>
          {activeLanguage && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-black uppercase tracking-wider text-white/50 shrink-0">
              <Globe size={12} className="text-cyan-300" />
              {activeLanguage.nativeLabel}
            </span>
          )}
        </div>
      </header>

      <main className="relative flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-9 space-y-8 pb-28">
        {/* Overview banner */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-[26px] border border-cyan-300/[0.14] bg-gradient-to-br from-cyan-400/[0.10] via-white/[0.03] to-indigo-500/[0.07] shadow-2xl p-5 sm:p-6 space-y-5 overflow-hidden relative"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200/60">
              {t('settings.overview')}
            </h2>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300/85">
              <ShieldCheck size={13} className="text-emerald-400" />
              {t('settings.localNote')}
            </span>
          </div>

          {/* Storage meter */}
          <div className="space-y-2.5">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <span className="flex items-center gap-2 text-sm font-bold text-white/85">
                <HardDrive size={16} className="text-cyan-300" />
                {t('settings.storageUsed')}
              </span>
              {storage ? (
                <span className="text-[11px] font-bold text-white/40">
                  {t('settings.storageOf', { used: formatSize(storage.used), quota: formatSize(storage.quota || 0) })}
                  <span className="text-cyan-300 ml-1.5">{usagePercent.toFixed(1)}%</span>
                </span>
              ) : (
                <span className="h-3.5 w-24 rounded-full bg-white/[0.07] animate-pulse" />
              )}
            </div>
            <div className="h-2.5 rounded-full bg-black/30 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: storage ? `${Math.max(1.5, usagePercent)}%` : '0%' }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-cyan-300 to-cyan-500",
                  usagePercent > 90 && "from-red-400 to-red-500"
                )}
              />
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-black/25 border border-white/[0.06]">
              <span className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <LayoutGrid size={17} className="text-indigo-300" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-white/30 truncate">
                  {t('settings.workspaces')}
                </span>
                <span className="block text-base font-black leading-tight mt-0.5">
                  {workspaceCount ?? '—'}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-black/25 border border-white/[0.06]">
              <span className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Globe size={17} className="text-cyan-300" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-white/30 truncate">
                  {t('settings.language')}
                </span>
                <span className="block text-base font-black leading-tight mt-0.5 truncate">
                  {activeLanguage?.nativeLabel ?? '—'}
                </span>
              </span>
            </div>
          </div>
        </motion.section>

        {/* AI feature card */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="space-y-3.5"
        >
          <SectionHeading label={t('settings.aiSection')} />
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/ai/settings')}
            className="w-full text-left rounded-[26px] border border-orange-400/[0.18] bg-gradient-to-br from-orange-400/[0.10] via-white/[0.03] to-transparent p-5 sm:p-6 flex items-center gap-4 group hover:border-orange-400/30 transition-colors"
          >
            <span className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-2xl bg-gradient-to-b from-orange-300/30 to-orange-500/10 border border-orange-300/25 flex items-center justify-center shrink-0">
              <Cpu size={24} className="text-orange-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[16px] font-black tracking-tight text-white/95">{t('settings.aiConfig')}</span>
              <span className="block text-xs text-white/35 leading-relaxed font-medium mt-1">{t('settings.aiConfigDesc')}</span>
            </span>
            <ChevronRight size={19} className="text-orange-300/50 group-hover:text-orange-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>
        </motion.section>

        {/* Data & Storage — tile grid */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="space-y-3.5"
        >
          <SectionHeading label={t('settings.dataSection')} />
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3">
            {dataTiles.map((tile) => (
              <motion.button
                key={tile.path}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(tile.path)}
                className="text-left rounded-[22px] border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.045] transition-colors p-5 group"
              >
                <span className={cn("w-11 h-11 rounded-2xl border flex items-center justify-center", tile.classes)}>
                  <tile.icon size={20} />
                </span>
                <span className="block text-[15px] font-bold tracking-tight text-white/90 mt-3.5">{tile.title}</span>
                <span className="block text-[11px] text-white/30 leading-relaxed font-medium mt-1 line-clamp-2">{tile.description}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Preferences / Language */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="space-y-3.5"
        >
          <SectionHeading label={t('settings.preferencesSection')} />
          <div className="rounded-[26px] border border-white/[0.07] bg-white/[0.02] shadow-xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-4">
              <span className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Globe size={21} className="text-cyan-300" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-bold tracking-tight text-white/90">
                  {t('settings.language')}
                </span>
                <span className="block text-[11px] text-white/30 leading-relaxed font-medium mt-0.5">
                  {t('settings.languageDesc')}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-black/25 border border-white/[0.06]" role="radiogroup" aria-label={t('settings.language')}>
              {LANGUAGE_OPTIONS.map((option) => {
                const isActive = language === option.value;
                return (
                  <button
                    key={option.value}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => void handleSelectLanguage(option.value)}
                    className={cn(
                      "relative px-4 py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-[0.98]",
                      isActive
                        ? "bg-gradient-to-b from-cyan-300 to-cyan-500 text-cyan-950 shadow-[0_8px_20px_rgba(34,211,238,0.30)]"
                        : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                    )}
                  >
                    {option.nativeLabel}
                    {isActive && <Check size={15} strokeWidth={3.5} />}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Danger Zone */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          className="space-y-3.5"
        >
          <SectionHeading label={t('settings.dangerZone')} danger />
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowConfirm1(true)}
            className="w-full flex items-center gap-4 px-5 py-5 rounded-[26px] border border-red-500/[0.18] bg-red-500/[0.04] hover:bg-red-500/[0.07] text-left transition-colors group"
          >
            <span className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
              <AlertTriangle size={21} className="text-red-400" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-bold tracking-tight text-red-300">{t('settings.deleteAll')}</span>
              <span className="block text-[11px] text-white/30 leading-relaxed font-medium mt-0.5 line-clamp-2">{t('settings.deleteAllDesc')}</span>
            </span>
            <ChevronRight size={17} className="text-red-400/40 group-hover:text-red-300 transition-all shrink-0" />
          </motion.button>
        </motion.section>
      </main>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showConfirm1}
        onClose={() => setShowConfirm1(false)}
        onConfirm={() => {
          setShowConfirm1(false);
          setShowConfirm2(true);
        }}
        title={t('settings.deleteStep1Title')}
        message={t('settings.deleteStep1Message')}
        confirmText={t('settings.deleteNext')}
        cancelText={t('common.cancel')}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showConfirm2}
        onClose={() => setShowConfirm2(false)}
        onConfirm={handleDeleteAppData}
        title={t('settings.deleteFinalTitle')}
        message={t('settings.deleteFinalMessage')}
        confirmText={t('settings.deleteConfirm')}
        cancelText={t('settings.deleteGoBack')}
        variant="danger"
      />
    </div>
  );
};

export default SettingsPage;
