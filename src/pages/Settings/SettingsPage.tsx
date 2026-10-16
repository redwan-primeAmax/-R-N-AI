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

/** One row inside a grouped settings card. */
const SettingsRow = ({
  icon: Icon,
  title,
  description,
  onClick,
  iconClasses = "bg-white/[0.06] border-white/[0.08] text-white/60",
  danger = false,
  last = false,
}: {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
  iconClasses?: string;
  danger?: boolean;
  last?: boolean;
}) => (
  <motion.button
    whileTap={{ scale: 0.99 }}
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 px-5 py-4 text-left transition-colors group active:bg-white/[0.04]",
      "hover:bg-white/[0.03]",
      !last && "border-b border-white/[0.05]"
    )}
  >
    <span className={cn(
      "w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
      iconClasses
    )}>
      <Icon size={21} />
    </span>
    <span className="flex-1 min-w-0">
      <span className={cn(
        "block text-[15px] font-bold tracking-tight truncate",
        danger ? "text-red-300" : "text-white/90"
      )}>
        {title}
      </span>
      <span className="block text-[11px] text-white/30 leading-relaxed font-medium mt-0.5 line-clamp-2">
        {description}
      </span>
    </span>
    <ChevronRight
      size={17}
      className={cn(
        "shrink-0 transition-all group-hover:translate-x-0.5",
        danger ? "text-red-400/40 group-hover:text-red-300" : "text-white/20 group-hover:text-amber-300"
      )}
    />
  </motion.button>
);

const SectionHeading = ({ label, danger = false }: { label: string; danger?: boolean }) => (
  <div className="flex items-center gap-3.5 px-1.5">
    <span className={cn("h-px w-6 rounded-full", danger ? "bg-red-500/40" : "bg-amber-400/40")} />
    <h2 className={cn(
      "text-[10px] font-black uppercase tracking-[0.32em]",
      danger ? "text-red-400/60" : "text-white/30"
    )}>
      {label}
    </h2>
    <span className="h-px flex-1 bg-white/[0.05]" />
  </div>
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
        /* overview is informational only — the page works without it */
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
      iconClasses: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    },
    {
      icon: History,
      title: t('settings.recentBackups'),
      description: t('settings.recentBackupsDesc'),
      path: "/recent-backups",
      iconClasses: "bg-teal-500/10 border-teal-500/20 text-teal-400",
    },
    {
      icon: Cloud,
      title: t('settings.cloudArchive'),
      description: t('settings.cloudArchiveDesc'),
      path: "/cloud-archive",
      iconClasses: "bg-sky-500/10 border-sky-500/20 text-sky-400",
    },
    {
      icon: Trash2,
      title: t('settings.recycleBin'),
      description: t('settings.recycleBinDesc'),
      path: "/recycle-bin",
      iconClasses: "bg-red-500/10 border-red-500/20 text-red-400",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b10] text-white flex flex-col font-sans relative">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[380px] bg-gradient-to-b from-amber-500/[0.06] via-violet-600/[0.05] to-transparent" />
      <div className="pointer-events-none fixed -top-24 left-1/3 w-72 h-72 rounded-full bg-violet-600/[0.07] blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-[#0b0b10]/85 backdrop-blur-2xl shrink-0">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3.5 max-w-3xl mx-auto w-full">
          <button
            onClick={() => navigate('/main')}
            className="w-11 h-11 shrink-0 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] rounded-2xl transition-all flex items-center justify-center active:scale-90 group"
            aria-label={t('common.back')}
          >
            <ChevronLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-b from-amber-300/25 to-amber-500/10 border border-amber-400/25 flex items-center justify-center shadow-[0_10px_28px_rgba(245,158,11,0.22)]">
            <Settings2 size={22} className="text-amber-300" />
          </span>
          {/* Single clean heading — the page is simply "Settings" everywhere */}
          <h1 className="text-xl font-black tracking-tight leading-none flex-1 min-w-0 truncate">
            {t('settings.title')}
          </h1>
          {activeLanguage && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-black uppercase tracking-wider text-white/50 shrink-0">
              <Globe size={12} className="text-emerald-400" />
              {activeLanguage.nativeLabel}
            </span>
          )}
        </div>
      </header>

      <main className="relative flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-9 pb-28">
        {/* Overview card */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] shadow-2xl p-5 sm:p-6 space-y-5 overflow-hidden relative"
        >
          <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-amber-500/[0.08] blur-3xl" />
          <div className="flex items-center justify-between gap-3 relative">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
              {t('settings.overview')}
            </h2>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300/80">
              <ShieldCheck size={13} className="text-emerald-400" />
              {t('settings.localNote')}
            </span>
          </div>

          {/* Storage meter */}
          <div className="space-y-2.5 relative">
            <div className="flex items-end justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-bold text-white/80">
                <HardDrive size={16} className="text-amber-300" />
                {t('settings.storageUsed')}
              </span>
              {storage ? (
                <span className="text-[11px] font-bold text-white/35">
                  {t('settings.storageOf', { used: formatSize(storage.used), quota: formatSize(storage.quota || 0) })}
                  <span className="text-amber-300 ml-1.5">{usagePercent.toFixed(1)}%</span>
                </span>
              ) : (
                <span className="h-3.5 w-24 rounded-full bg-white/[0.06] animate-pulse" />
              )}
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: storage ? `${Math.max(1.5, usagePercent)}%` : '0%' }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.45)]",
                  usagePercent > 90 && "from-red-400 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.45)]"
                )}
              />
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-2 gap-3 relative">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-black/25 border border-white/[0.06]">
              <span className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <LayoutGrid size={17} className="text-violet-300" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-white/25 truncate">
                  {t('settings.workspaces')}
                </span>
                <span className="block text-base font-black leading-tight mt-0.5">
                  {workspaceCount ?? '—'}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-black/25 border border-white/[0.06]">
              <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Globe size={17} className="text-emerald-300" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-white/25 truncate">
                  {t('settings.language')}
                </span>
                <span className="block text-base font-black leading-tight mt-0.5 truncate">
                  {activeLanguage?.nativeLabel ?? '—'}
                </span>
              </span>
            </div>
          </div>
        </motion.section>

        {/* AI & Intelligence */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="space-y-3.5"
        >
          <SectionHeading label={t('settings.aiSection')} />
          <div className="rounded-[1.75rem] border border-white/[0.07] bg-white/[0.02] shadow-xl overflow-hidden">
            <SettingsRow
              icon={Cpu}
              title={t('settings.aiConfig')}
              description={t('settings.aiConfigDesc')}
              onClick={() => navigate('/ai/settings')}
              iconClasses="bg-violet-500/10 border-violet-500/20 text-violet-300"
              last
            />
          </div>
        </motion.section>

        {/* Data & Storage */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="space-y-3.5"
        >
          <SectionHeading label={t('settings.dataSection')} />
          <div className="rounded-[1.75rem] border border-white/[0.07] bg-white/[0.02] shadow-xl overflow-hidden">
            {dataTiles.map((tile, i) => (
              <SettingsRow
                key={tile.path}
                icon={tile.icon}
                title={tile.title}
                description={tile.description}
                onClick={() => navigate(tile.path)}
                iconClasses={tile.iconClasses}
                last={i === dataTiles.length - 1}
              />
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
          <div className="rounded-[1.75rem] border border-white/[0.07] bg-white/[0.02] shadow-xl p-5 space-y-5">
            <div className="flex items-center gap-4">
              <span className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Globe size={21} className="text-emerald-300" />
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
                        ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-emerald-950 shadow-[0_8px_20px_rgba(16,185,129,0.35)]"
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
          <div className="rounded-[1.75rem] border border-red-500/[0.16] bg-red-500/[0.03] shadow-xl overflow-hidden">
            <SettingsRow
              icon={AlertTriangle}
              title={t('settings.deleteAll')}
              description={t('settings.deleteAllDesc')}
              onClick={() => setShowConfirm1(true)}
              iconClasses="bg-red-500/10 border-red-500/25 text-red-400"
              danger
              last
            />
          </div>
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
