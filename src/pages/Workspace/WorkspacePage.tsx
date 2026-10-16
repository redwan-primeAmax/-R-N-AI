/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import React, { useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { 
  ArrowLeft, Plus, Check, X, Search, 
  Folder, Briefcase, Rocket, Sparkles, Copy, Download, 
  Trash2, Edit3, Eraser, Info, Palette, MoreHorizontal
} from 'lucide-react';

import { ConfirmDialog } from '../../components/modals/CustomDialogs';
import { WorkspaceLogoModal, WORKSPACE_PRESET_ICONS } from '../../components/modals/WorkspaceLogoModal';
import LoadingScreen from '../../components/LoadingScreen';
import { Modal } from '../../components/modals/Modal';
import { useWorkspaceLogic } from './useWorkspaceLogic';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../utils/translator';

export default function WorkspacePage() {
  const { t, language } = useLanguage();
  const {
    workspaces,
    filteredWorkspaces,
    activeWorkspaceId,
    workspaceNoteCounts,
    searchQuery,
    isLoading,
    isCreating,
    newWorkspaceName,
    newWorkspaceColor,
    editingWorkspace,
    editName,
    isSwitching,
    workspaceToDelete,
    workspaceToClear,
    workspaceForLogo,
    workspaceSettingsModal,
    showLimitNoticeModal,
    setSearchQuery,
    setIsCreating,
    setNewWorkspaceName,
    setNewWorkspaceColor,
    setEditingWorkspace,
    setEditName,
    setWorkspaceToDelete,
    setWorkspaceToClear,
    setWorkspaceForLogo,
    setWorkspaceSettingsModal,
    setShowLimitNoticeModal,
    handleDismissLimitNotice,
    handleCreate,
    handleRename,
    handleDelete,
    handleClearNotes,
    handleDuplicate,
    handleExportJson,
    handleSwitch,
    handleUpdateAppearance,
    navigate
  } = useWorkspaceLogic();

  // Helper to render workspace icon/logo avatar
  const renderWorkspaceAvatar = (ws: any, size: 'sm' | 'md' | 'lg' = 'md') => {
    const avatarColor = ws.color || '#3b82f6';
    const iconId = ws.icon || 'folder';
    const isSvg = !!ws.logoSvg && ws.logoSvg.trim().startsWith('<svg');
    const isEmoji = iconId && !WORKSPACE_PRESET_ICONS.some(i => i.id === iconId);

    const sizeClass = size === 'lg' ? 'w-16 h-16 rounded-2xl' : size === 'sm' ? 'w-9 h-9 rounded-xl' : 'w-12 h-12 rounded-2xl';
    const iconSize = size === 'lg' ? 28 : size === 'sm' ? 16 : 22;

    if (isSvg) {
      return (
        <div 
          className={cn(sizeClass, "flex items-center justify-center shadow-md relative overflow-hidden shrink-0 text-white")}
          style={{ backgroundColor: avatarColor }}
        >
          <div 
            className="w-3/5 h-3/5 flex items-center justify-center pointer-events-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ws.logoSvg) }}
          />
        </div>
      );
    }

    if (isEmoji) {
      return (
        <div 
          className={cn(sizeClass, "flex items-center justify-center shadow-md shrink-0 text-white")}
          style={{ backgroundColor: avatarColor }}
        >
          <span className={size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl'}>
            {iconId}
          </span>
        </div>
      );
    }

    const FoundIcon = WORKSPACE_PRESET_ICONS.find(i => i.id === iconId)?.icon || Folder;

    return (
      <div 
        className={cn(sizeClass, "flex items-center justify-center shadow-md shrink-0 text-white")}
        style={{ backgroundColor: avatarColor }}
      >
        <FoundIcon size={iconSize} strokeWidth={2.2} />
      </div>
    );
  };

  const QUICK_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'];

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-white font-sans antialiased flex flex-col selection:bg-teal-500/30">
      {isSwitching && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <LoadingScreen />
        </div>
      )}

      {/* Modern Sticky Top App Bar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/main')}
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-90 border border-white/5 cursor-pointer"
              title={t('common.back')}
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{t('workspace.title')}</h1>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-mono text-xs font-bold">
                  {workspaces.length}
                </span>
              </div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest hidden sm:block">
                {t('workspace.eyebrow')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-teal-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{t('workspace.createNew')}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 pb-32 space-y-6">
        
        {/* Search & Notice Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder={t('workspace.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-teal-500/60 focus:bg-white/[0.06] transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowLimitNoticeModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-xs text-white/50 hover:text-white transition-all self-start sm:self-auto cursor-pointer"
          >
            <Info size={14} className="text-amber-400" />
            <span>{t('workspace.limitTitle')}</span>
          </button>
        </div>

        {/* Creation Card Modal / Panel */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              className="p-5 sm:p-6 bg-gradient-to-br from-teal-950/40 via-[#161618] to-[#121214] border-2 border-teal-500/40 rounded-[32px] shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-teal-400 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  {t('workspace.createNew')}
                </span>
                <button 
                  onClick={() => setIsCreating(false)} 
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1">
                <input
                  autoFocus
                  type="text"
                  placeholder={t('workspace.namePlaceholder')}
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="w-full bg-transparent border-b border-white/20 py-2.5 text-lg sm:text-xl font-bold text-white placeholder:text-white/25 outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              {/* Quick Color Picker */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] font-bold text-white/40 mr-1">{t('workspace.colorLabel')}:</span>
                {QUICK_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewWorkspaceColor(color)}
                    className={cn(
                      "w-7 h-7 rounded-xl transition-all active:scale-90 flex items-center justify-center",
                      newWorkspaceColor === color ? "ring-2 ring-white scale-110 shadow-md" : "opacity-70 hover:opacity-100"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {newWorkspaceColor === color && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={!newWorkspaceName.trim()}
                  className={cn(
                    "flex-1 py-3 bg-teal-600 hover:bg-teal-500 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-lg shadow-teal-600/30 transition-all active:scale-95 cursor-pointer",
                    !newWorkspaceName.trim() && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Check size={16} strokeWidth={2.5} />
                  {t('workspace.create')}
                </button>

                <button
                  onClick={() => setIsCreating(false)}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-xs uppercase tracking-wider text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspaces Grid */}
        {isLoading && workspaces.length === 0 ? (
          <div className="py-20 flex items-center justify-center">
            <LoadingScreen />
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white/[0.02] border border-white/5 rounded-[36px] p-8">
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto text-white/30">
              <Folder size={32} />
            </div>
            <h3 className="font-extrabold text-base text-white">{t('workspace.noResults')}</h3>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              {searchQuery ? `"${searchQuery}" — ${language === 'bn' ? 'এর সাথে মিলে এমন কোনো ওয়ার্কস্পেস নেই।' : 'no workspace matches this search.'}` : t('workspace.noResultsDesc')}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold text-white transition-all"
              >
                {language === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Reset filter'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkspaces.map((ws) => {
              const isActive = ws.id === activeWorkspaceId;
              const count = workspaceNoteCounts[ws.id] || 0;
              const capacityPercent = Math.min(100, Math.round((count / 10000) * 100));

              return (
                <motion.div
                  key={ws.id}
                  layout
                  className={cn(
                    "group p-5 rounded-[32px] border transition-all duration-300 flex flex-col justify-between relative overflow-hidden",
                    isActive 
                      ? "bg-gradient-to-br from-teal-500/10 via-[#181a24] to-[#121318] border-teal-500/50 shadow-2xl shadow-teal-500/10 ring-1 ring-teal-500/20" 
                      : "bg-[#18181a]/90 border-white/[0.06] hover:border-white/15 hover:bg-[#1e1e22]"
                  )}
                >
                  {/* Top Row: Avatar + Title + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar with click to customize */}
                      <div 
                        onClick={() => setWorkspaceForLogo(ws)}
                        className="relative group/avatar cursor-pointer transition-transform active:scale-95 shrink-0"
                        title={t('workspace.appearance')}
                      >
                        {renderWorkspaceAvatar(ws, 'md')}
                        <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                          <Palette size={16} className="text-white drop-shadow" />
                        </div>
                      </div>

                      {/* Name / Inline Rename Input */}
                      <div className="min-w-0 flex-1">
                        {editingWorkspace?.id === ws.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              className="bg-black/40 border border-teal-500 rounded-xl px-2 py-1 outline-none font-bold text-base text-white w-full"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename();
                                if (e.key === 'Escape') setEditingWorkspace(null);
                              }}
                            />
                            <button onClick={handleRename} className="p-1.5 bg-teal-600 rounded-xl text-white">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingWorkspace(null)} className="p-1.5 bg-white/10 rounded-xl text-white/50">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-base text-white truncate max-w-[160px] sm:max-w-[180px]">
                                {ws.name}
                              </h3>
                            </div>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-tight mt-0.5">
                              {new Date(ws.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active LIVE Badge or Settings trigger */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isActive && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-500/20 border border-teal-500/30 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-wider text-teal-300">
                            {t('workspace.active')}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={() => setWorkspaceSettingsModal(ws)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90 cursor-pointer"
                        title={t('workspace.menu')}
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Middle: Capacity Progress Bar */}
                  <div className="my-5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                      <span className="text-white/40">{t('workspace.notesCount')}</span>
                      <span className={cn(
                        "font-extrabold",
                        capacityPercent > 90 ? "text-red-400" : capacityPercent > 75 ? "text-amber-400" : "text-white/70"
                      )}>
                        {count.toLocaleString()} / 10,000
                      </span>
                    </div>

                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          capacityPercent > 90 ? "bg-red-500" : capacityPercent > 75 ? "bg-amber-400" : "bg-teal-500"
                        )}
                        style={{ width: `${Math.max(4, capacityPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.04]">
                    <button
                      onClick={() => handleSwitch(ws.id)}
                      className={cn(
                        "flex-1 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95",
                        isActive 
                          ? "bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20" 
                          : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
                      )}
                    >
                      {isActive ? (
                        <>
                          <Check size={14} strokeWidth={3} className="text-teal-400" />
                          <span>{t('workspace.current')}</span>
                        </>
                      ) : (
                        <span>{t('workspace.switch')}</span>
                      )}
                    </button>

                    <button
                      onClick={() => setWorkspaceForLogo(ws)}
                      className="px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title={t('workspace.appearance')}
                    >
                      <Palette size={14} />
                      <span className="hidden sm:inline">{t('workspace.logo')}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Workspace Settings / Action Sheet Modal */}
      <Modal
        isOpen={!!workspaceSettingsModal}
        onClose={() => setWorkspaceSettingsModal(null)}
        title={workspaceSettingsModal ? `${t('workspace.settingsTitle')}: ${workspaceSettingsModal.name}` : undefined}
      >
        {workspaceSettingsModal && (
          <div className="p-5 sm:p-6 space-y-2 text-white">
            
            {/* Option 1: Rename */}
            <button
              onClick={() => {
                const target = workspaceSettingsModal;
                setWorkspaceSettingsModal(null);
                setEditName(target.name);
                setEditingWorkspace(target);
              }}
              className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left active:scale-98 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0">
                <Edit3 size={18} />
              </div>
              <div>
                <div className="font-bold text-sm text-white">{t('workspace.rename')}</div>
                <div className="text-[11px] text-white/40">{t('workspace.renameDesc')}</div>
              </div>
            </button>

            {/* Option 2: Appearance & Logo */}
            <button
              onClick={() => {
                const target = workspaceSettingsModal;
                setWorkspaceSettingsModal(null);
                setWorkspaceForLogo(target);
              }}
              className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left active:scale-98 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                <Palette size={18} />
              </div>
              <div>
                <div className="font-bold text-sm text-white">{t('workspace.appearance')}</div>
                <div className="text-[11px] text-white/40">{t('workspace.appearanceDesc')}</div>
              </div>
            </button>

            {/* Option 3: Duplicate */}
            <button
              onClick={() => {
                const targetId = workspaceSettingsModal.id;
                setWorkspaceSettingsModal(null);
                handleDuplicate(targetId);
              }}
              className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left active:scale-98 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <Copy size={18} />
              </div>
              <div>
                <div className="font-bold text-sm text-white">{t('workspace.duplicate')}</div>
                <div className="text-[11px] text-white/40">{t('workspace.duplicateDesc')}</div>
              </div>
            </button>

            {/* Option 4: Export Backup */}
            <button
              onClick={() => {
                const targetId = workspaceSettingsModal.id;
                setWorkspaceSettingsModal(null);
                handleExportJson(targetId);
              }}
              className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left active:scale-98 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                <Download size={18} />
              </div>
              <div>
                <div className="font-bold text-sm text-white">{t('workspace.exportBackup')}</div>
                <div className="text-[11px] text-white/40">{t('workspace.exportDesc')}</div>
              </div>
            </button>

            {/* Option 5: Clear All Notes */}
            <button
              onClick={() => {
                const targetId = workspaceSettingsModal.id;
                setWorkspaceSettingsModal(null);
                setWorkspaceToClear(targetId);
              }}
              className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 hover:bg-amber-500/10 rounded-2xl transition-all text-left active:scale-98 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                <Eraser size={18} />
              </div>
              <div>
                <div className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                  {t('workspace.clearNotes')}
                </div>
                <div className="text-[11px] text-white/40">{t('workspace.clearNotesDesc')}</div>
              </div>
            </button>

            {/* Option 6: Delete Workspace */}
            <button
              onClick={() => {
                const targetId = workspaceSettingsModal.id;
                setWorkspaceSettingsModal(null);
                setWorkspaceToDelete(targetId);
              }}
              className="w-full flex items-center gap-3.5 p-3.5 bg-white/5 hover:bg-red-500/15 rounded-2xl transition-all text-left active:scale-98 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors">
                <Trash2 size={18} />
              </div>
              <div>
                <div className="font-bold text-sm text-white group-hover:text-red-400 transition-colors">
                  {t('workspace.deleteWorkspace')}
                </div>
                <div className="text-[11px] text-white/40">{t('workspace.deleteDesc')}</div>
              </div>
            </button>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={workspaceToDelete !== null}
        onClose={() => setWorkspaceToDelete(null)}
        onConfirm={handleDelete}
        title={t('workspace.deleteTitle')}
        message={t('workspace.deleteMessage')}
        variant="danger"
        confirmText={t('workspace.confirmDelete')}
        cancelText={t('common.cancel')}
      />

      {/* Clear Notes Confirmation Dialog */}
      <ConfirmDialog
        isOpen={workspaceToClear !== null}
        onClose={() => setWorkspaceToClear(null)}
        onConfirm={handleClearNotes}
        title={t('workspace.clearTitle')}
        message={t('workspace.clearMessage')}
        variant="danger"
        confirmText={t('workspace.confirmClear')}
        cancelText={t('common.cancel')}
      />

      {/* Workspace Logo & Appearance Customizer Modal */}
      <WorkspaceLogoModal
        isOpen={!!workspaceForLogo}
        onClose={() => setWorkspaceForLogo(null)}
        onSave={handleUpdateAppearance}
        currentLogo={workspaceForLogo?.logoSvg}
        currentIcon={workspaceForLogo?.icon}
        currentColor={workspaceForLogo?.color}
        workspaceName={workspaceForLogo?.name}
      />

      {/* Limit Notice Modal */}
      <Modal
        isOpen={showLimitNoticeModal}
        onClose={handleDismissLimitNotice}
        title={t('workspace.limitTitle')}
      >
        <div className="p-6 text-center space-y-5 text-white">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20">
            <Rocket size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">{t('workspace.limitHeading')}</h3>
            <p className="text-xs text-white/70 leading-relaxed max-w-sm mx-auto">
              {t('workspace.limitBody')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismissLimitNotice}
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-black rounded-2xl transition-all shadow-lg shadow-amber-400/25 cursor-pointer"
          >
            {t('workspace.understood')}
          </button>
        </div>
      </Modal>

    </div>
  );
}
