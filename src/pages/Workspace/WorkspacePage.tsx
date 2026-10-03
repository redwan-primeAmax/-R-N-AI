/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

export default function WorkspacePage() {
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
    <div className="min-h-screen bg-[var(--bg-main)] text-white font-sans antialiased flex flex-col selection:bg-blue-500/30">
      {isLoading && <LoadingScreen />}
      {isSwitching && <LoadingScreen />}

      {/* Modern Sticky Top App Bar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/main')}
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-90 border border-white/5 cursor-pointer"
              title="ফিরে যান"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">ওয়ার্কস্পেসসমূহ</h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs font-bold">
                  {workspaces.length}
                </span>
              </div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest hidden sm:block">
                Multi-Workspace Management
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>নতুন তৈরি করুন</span>
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
              placeholder="ওয়ার্কস্পেস খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500/60 focus:bg-white/[0.06] transition-all"
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
            <span>কোটা নীতি (১০,০০০ নোট)</span>
          </button>
        </div>

        {/* Creation Card Modal / Panel */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              className="p-5 sm:p-6 bg-gradient-to-br from-blue-950/40 via-[#161618] to-[#121214] border-2 border-blue-500/40 rounded-[32px] shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  নতুন ওয়ার্কস্পেস তৈরি
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
                  placeholder="ওয়ার্কস্পেসের নাম লিখুন (যেমন: Personal, Project, Studies)..."
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="w-full bg-transparent border-b border-white/20 py-2.5 text-lg sm:text-xl font-bold text-white placeholder:text-white/25 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Quick Color Picker */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] font-bold text-white/40 mr-1">থিম কালার:</span>
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
                    "flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer",
                    !newWorkspaceName.trim() && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Check size={16} strokeWidth={2.5} />
                  সংরক্ষণ করুন
                </button>

                <button
                  onClick={() => setIsCreating(false)}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-xs uppercase tracking-wider text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspaces Grid */}
        {filteredWorkspaces.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white/[0.02] border border-white/5 rounded-[36px] p-8">
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto text-white/30">
              <Folder size={32} />
            </div>
            <h3 className="font-extrabold text-base text-white">কোনো ওয়ার্কস্পেস পাওয়া যায়নি</h3>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              {searchQuery ? `"${searchQuery}" এর সাথে মিলে এমন কোনো ওয়ার্কস্পেস নেই।` : 'আপনার এখনও কোনো ওয়ার্কস্পেস তৈরি করা হয়নি।'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold text-white transition-all"
              >
                ফিল্টার রিসেট করুন
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
                      ? "bg-gradient-to-br from-blue-500/10 via-[#181a24] to-[#121318] border-blue-500/50 shadow-2xl shadow-blue-500/10 ring-1 ring-blue-500/20" 
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
                        title="লোগো ও কালার পরিবর্তন করুন"
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
                              className="bg-black/40 border border-blue-500 rounded-xl px-2 py-1 outline-none font-bold text-base text-white w-full"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename();
                                if (e.key === 'Escape') setEditingWorkspace(null);
                              }}
                            />
                            <button onClick={handleRename} className="p-1.5 bg-blue-600 rounded-xl text-white">
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
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-wider text-blue-300">
                            সক্রিয়
                          </span>
                        </div>
                      )}

                      <button
                        onClick={() => setWorkspaceSettingsModal(ws)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90 cursor-pointer"
                        title="মেনু"
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Middle: Capacity Progress Bar */}
                  <div className="my-5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                      <span className="text-white/40">নোট সংখ্যা</span>
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
                          capacityPercent > 90 ? "bg-red-500" : capacityPercent > 75 ? "bg-amber-400" : "bg-blue-500"
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
                          ? "bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20" 
                          : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
                      )}
                    >
                      {isActive ? (
                        <>
                          <Check size={14} strokeWidth={3} className="text-blue-400" />
                          <span>বর্তমান ওয়ার্কস্পেস</span>
                        </>
                      ) : (
                        <span>সুইচ করুন</span>
                      )}
                    </button>

                    <button
                      onClick={() => setWorkspaceForLogo(ws)}
                      className="px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="আইকন ও রং পরিবর্তন"
                    >
                      <Palette size={14} />
                      <span className="hidden sm:inline">লোগো</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Workspace Settings / Action Sheet Modal */}
      <AnimatePresence>
        {workspaceSettingsModal && (
          <Modal
            isOpen={true}
            onClose={() => setWorkspaceSettingsModal(null)}
            title={`ওয়ার্কস্পেস সেটিংস: ${workspaceSettingsModal.name}`}
          >
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
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                  <Edit3 size={18} />
                </div>
                <div>
                  <div className="font-bold text-sm text-white">নাম পরিবর্তন করুন (Rename)</div>
                  <div className="text-[11px] text-white/40">ওয়ার্কস্পেসের টাইটেল এডিট করুন</div>
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
                  <div className="font-bold text-sm text-white">আইকন ও থিম কালার (Appearance)</div>
                  <div className="text-[11px] text-white/40">লোগো, প্রিসেট আইকন, ইমোজি ও কালার কাস্টমাইজ করুন</div>
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
                  <div className="font-bold text-sm text-white">ডুপ্লিকেট করুন (Duplicate Workspace)</div>
                  <div className="text-[11px] text-white/40">ওয়ার্কস্পেস ও এর সকল নোট ক্লোন করুন</div>
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
                  <div className="font-bold text-sm text-white">ব্যাকআপ এক্সপোর্ট (JSON Export)</div>
                  <div className="text-[11px] text-white/40">এই ওয়ার্কস্পেসের সব নোট ডাউনলোড করুন</div>
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
                    সব নোট মুছে ফেলুন (Clear Notes)
                  </div>
                  <div className="text-[11px] text-white/40">ওয়ার্কস্পেস অক্ষত রেখে কেবল নোটগুলো খালি করুন</div>
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
                    ওয়ার্কস্পেস ডিলিট করুন (Delete Workspace)
                  </div>
                  <div className="text-[11px] text-white/40">স্থায়ীভাবে ওয়ার্কস্পেসটি মুছে ফেলুন</div>
                </div>
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={workspaceToDelete !== null}
        onClose={() => setWorkspaceToDelete(null)}
        onConfirm={handleDelete}
        title="ওয়ার্কস্পেস মুছে ফেলুন"
        message="আপনি কি নিশ্চিত যে এই ওয়ার্কস্পেস এবং এর অন্তর্ভুক্ত সমস্ত নোট চিরতরে ডিলিট করতে চান? এই কাজ পরবর্তীতে ফেরত নেওয়া সম্ভব নয়।"
        variant="danger"
        confirmText="হ্যাঁ, ডিলিট করুন"
        cancelText="বাতিল"
      />

      {/* Clear Notes Confirmation Dialog */}
      <ConfirmDialog
        isOpen={workspaceToClear !== null}
        onClose={() => setWorkspaceToClear(null)}
        onConfirm={handleClearNotes}
        title="ওয়ার্কস্পেসের সব নোট ক্লিয়ার"
        message="আপনি কি এই ওয়ার্কস্পেসের সব নোট মুছে ফেলতে চান? ওয়ার্কস্পেসটি অক্ষত থাকবে কিন্তু ভেতরের নোটগুলো ডিলিট হয়ে যাবে।"
        variant="danger"
        confirmText="সব নোট মুছুন"
        cancelText="বাতিল"
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
      <AnimatePresence>
        {showLimitNoticeModal && (
          <Modal
            isOpen={true}
            onClose={handleDismissLimitNotice}
            title="ওয়ার্কস্পেস কোটা ও তথ্য"
          >
            <div className="p-6 text-center space-y-5 text-white">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20">
                <Rocket size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">প্রতি ওয়ার্কস্পেসে ১০,০০০ নোট লিমিট</h3>
                <p className="text-xs text-white/70 leading-relaxed max-w-sm mx-auto">
                  আপনার ব্রাউজার ও ডিভাইসের পারফরম্যান্স যেন সর্বদা সর্বোচ্চ দ্রুত ও মসৃণ থাকে, সেজন্য প্রতিটি ওয়ার্কস্পেসে সর্বোচ্চ ১০,০০০ নোট রাখা যায়। একাধিক প্রজেক্টের জন্য আপনি যত ইচ্ছা নতুন ওয়ার্কস্পেস তৈরি করে নিতে পারেন।
                </p>
              </div>
              <button
                onClick={handleDismissLimitNotice}
                className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-black rounded-2xl transition-all shadow-lg shadow-amber-400/25 cursor-pointer"
              >
                বুঝেছি (OK)
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

    </div>
  );
}
