/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { DataManager } from '../../services/storage/DataManager';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';
import { LANGUAGE_OPTIONS, useLanguage, type AppLanguage } from '../../utils/translator';

const SettingsTile = ({
  icon: Icon,
  title,
  description,
  onClick,
  colorClasses = "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10",
  iconColor = "text-white/60"
}: {
  icon: any,
  title: string,
  description: string,
  onClick: () => void,
  colorClasses?: string,
  iconColor?: string
}) => (
  <motion.button
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    onClick={onClick}
    className={cn(
      "p-6 rounded-[2rem] border flex flex-col text-left transition-all group relative overflow-hidden h-full shadow-lg",
      colorClasses
    )}
  >
    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
      <ChevronRight size={18} className="text-white/20" />
    </div>
    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", "bg-white/5", iconColor)}>
      <Icon size={24} />
    </div>
    <div className="space-y-1">
      <h3 className="text-lg font-bold tracking-tight text-white/90">{title}</h3>
      <p className="text-[11px] text-white/30 leading-relaxed font-medium">{description}</p>
    </div>
  </motion.button>
);

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [showConfirm1, setShowConfirm1] = useState(false);
  const [showConfirm2, setShowConfirm2] = useState(false);

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

  const sections = [
    {
      label: t('settings.aiSection'),
      tiles: [
        {
          icon: Cpu,
          title: t('settings.aiConfig'),
          description: t('settings.aiConfigDesc'),
          path: "/ai/settings",
          iconColor: "text-purple-400"
        }
      ]
    },
    {
      label: t('settings.dataSection'),
      tiles: [
        {
          icon: HardDrive,
          title: t('settings.dataMonitor'),
          description: t('settings.dataMonitorDesc'),
          path: "/data-monitor",
          iconColor: "text-orange-400"
        },
        {
          icon: History,
          title: t('settings.recentBackups'),
          description: t('settings.recentBackupsDesc'),
          path: "/recent-backups",
          iconColor: "text-teal-400"
        },
        {
          icon: Cloud,
          title: t('settings.cloudArchive'),
          description: t('settings.cloudArchiveDesc'),
          path: "/cloud-archive",
          iconColor: "text-blue-500"
        },
        {
          icon: Trash2,
          title: t('settings.recycleBin'),
          description: t('settings.recycleBinDesc'),
          path: "/recycle-bin",
          iconColor: "text-red-400"
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-sans">
      <header className="px-6 py-6 md:px-12 flex items-center justify-between shrink-0 bg-[#0d0d0d]/80 backdrop-blur-2xl z-[100] border-b border-white/5">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/main')}
            className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all flex items-center justify-center active:scale-95"
            aria-label={t('common.back')}
          >
            <ChevronLeft size={24} />
          </button>
          {/* Single clean heading — the page is simply "Settings" everywhere */}
          <h1 className="text-2xl font-black tracking-tighter leading-none">
            {t('settings.title')}
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-12 max-w-7xl mx-auto w-full space-y-16 pb-12">
        {sections.map((section) => (
          <div key={section.label} className="space-y-8">
            <div className="flex items-center gap-4 px-2">
              <div className="h-0.5 w-8 bg-purple-500/30 rounded-full" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">
                {section.label}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.tiles.map((tile: any) => (
                <SettingsTile
                  key={tile.title}
                  icon={tile.icon}
                  title={tile.title}
                  description={tile.description}
                  onClick={() => navigate(tile.path)}
                  iconColor={tile.iconColor}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Language */}
        <div className="space-y-8">
          <div className="flex items-center gap-4 px-2">
            <div className="h-0.5 w-8 bg-purple-500/30 rounded-full" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">
              {t('settings.preferencesSection')}
            </h2>
          </div>

          <div className="p-6 rounded-[2rem] border bg-white/[0.03] border-white/5 shadow-lg">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 text-emerald-400 shrink-0">
                <Globe size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight text-white/90">{t('settings.language')}</h3>
                <p className="text-[11px] text-white/30 leading-relaxed font-medium">{t('settings.languageDesc')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('settings.language')}>
              {LANGUAGE_OPTIONS.map((option) => {
                const isActive = language === option.value;
                return (
                  <button
                    key={option.value}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => void handleSelectLanguage(option.value)}
                    className={cn(
                      "px-4 py-4 rounded-2xl border flex items-center justify-between gap-2 transition-all active:scale-[0.98]",
                      isActive
                        ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-[0_0_24px_rgba(16,185,129,0.15)]"
                        : "bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <span className="text-sm font-bold">{option.nativeLabel}</span>
                    {isActive && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0">
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-8 pt-10">
           <div className="flex items-center gap-4 px-2">
              <div className="h-0.5 w-8 bg-red-500/30 rounded-full" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-red-500/40">
                {t('settings.dangerZone')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <SettingsTile
                  icon={AlertTriangle}
                  title={t('settings.deleteAll')}
                  description={t('settings.deleteAllDesc')}
                  onClick={() => setShowConfirm1(true)}
                  iconColor="text-red-500"
                  colorClasses="bg-red-500/[0.02] border-red-500/10 hover:bg-red-500/[0.05] hover:border-red-500/30 shadow-red-500/5 shadow-2xl"
               />
            </div>
        </div>
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
