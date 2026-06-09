/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronRight, Plus, Box } from 'lucide-react';
import { Note } from '../../../services/storage/DataManager';
import { cn } from '../../../utils/cn';
import { useNavigate } from 'react-router-dom';

// Import our modular action definitions
import { subPagesNavigation } from '../actions/SubPagesNavigation';
import { shareCollabAction } from '../actions/ShareCollabAction';
import { readOnlyToggleAction } from '../actions/ReadOnlyToggleAction';
import { tagAction } from '../actions/TagAction';
import { themeAction } from '../actions/ThemeAction';
import { duplicateNoteAction } from '../actions/DuplicateNoteAction';
import { lockPageAction } from '../actions/LockPageAction';
import { exportNoteAction } from '../actions/ExportNoteAction';
import { deleteNoteAction } from '../actions/DeleteNoteAction';

interface EditorActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  isReadOnly: boolean;
  onToggleReadOnly: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onLock: () => void;
  onExport: () => void;
  onTag: () => void;
  onTheme?: () => void;
  subPages: Note[];
  onAddSubPage: () => void;
  onStartCollab?: (options?: { password?: string, memberLimit?: number }) => void;
  isCollabActive?: boolean;
  collabRoomId?: string | null;
  collaborators?: { id: string, name: string }[];
  onKickCollaborator?: (peerId: string) => void;
}

export const EditorActionSheet: React.FC<EditorActionSheetProps> = ({
  isOpen,
  onClose,
  note,
  isReadOnly,
  onToggleReadOnly,
  onDelete,
  onCopy,
  onLock,
  onExport,
  onTag,
  onTheme,
  subPages,
  onAddSubPage,
  onStartCollab,
  isCollabActive = false,
  collabRoomId = null,
  collaborators = [],
  onKickCollaborator
}) => {
  const navigate = useNavigate();
  const [showCollabSettings, setShowCollabSettings] = useState(false);
  const [collabPassword, setCollabPassword] = useState('');
  const [collabLimit, setCollabLimit] = useState(5);
  const [viewMode, setViewMode] = useState<'main' | 'subpages'>('main');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
      setViewMode('main');
    }
  }, [isOpen]);

  if (!note) return null;

  const MenuAction = ({ icon: Icon, label, onClick, subtitle, danger = false }: any) => {
    // Resolve dynamically if functions are provided
    const resolvedLabel = typeof label === 'function' ? label() : label;
    const resolvedSubtitle = typeof subtitle === 'function' ? subtitle() : subtitle;

    return (
      <button 
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-5 px-6 py-4.5 transition-all active:bg-white/5 group border-b border-white/[0.03] last:border-0",
          danger ? "text-red-500" : "text-white/90"
        )}
      >
        <div className={cn("w-6 flex justify-center opacity-70 group-hover:opacity-100 transition-all", danger ? "text-red-500" : "text-white")}>
          {Icon && <Icon size={22} strokeWidth={1.5} />}
        </div>
        <div className="flex flex-col items-start text-left flex-1 min-w-0">
          <span className="font-medium text-[16px] tracking-wide truncate">{resolvedLabel}</span>
          {resolvedSubtitle && <span className="text-[10px] opacity-20 font-bold uppercase tracking-widest mt-0.5">{resolvedSubtitle}</span>}
        </div>
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-end">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-black/85 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full bg-[#121213] rounded-t-[40px] border-t border-white/[0.05] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto my-5 shrink-0" />
            
            <div className="overflow-y-auto pb-12 flex-1 no-scrollbar animate-fade-in">
              {viewMode === 'subpages' ? (
                <div className="px-6 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">অনুষঙ্গিক পাতা সমূহ (Sub Pages)</h4>
                    <button 
                      onClick={onAddSubPage}
                      className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/10 transition-all"
                    >
                      <Plus size={12} />
                      নতুন পাতা
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-[45vh] overflow-y-auto pr-1 no-scrollbar">
                    {subPages.length > 0 ? (
                      subPages.map(sub => (
                        <button 
                          key={sub.id}
                          onClick={() => {
                            const collabParam = collabRoomId ? `?collab=${collabRoomId}` : '';
                            navigate(`/editor/${sub.id}${collabParam}`);
                            onClose();
                          }}
                          className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/5 transition-all text-left"
                        >
                          <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/20">
                            <FileText size={16} />
                          </div>
                          <span className="font-bold text-xs text-white/70 truncate flex-1">{sub.title || 'শিরোনামহীন'}</span>
                          <ChevronRight size={14} className="text-white/20" />
                        </button>
                      ))
                    ) : (
                      <div className="p-8 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center opacity-30 my-2">
                        <FileText size={24} className="mb-2 text-white/40" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">কোন অনুষঙ্গিক পাতা নেই</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <MenuAction 
                    icon={subPagesNavigation.icon} 
                    label="অনুষঙ্গিক পাতা (Sub Pages)" 
                    subtitle={() => typeof subPagesNavigation.subtitle === 'function' ? subPagesNavigation.subtitle(subPages.length) : subPagesNavigation.subtitle}
                    onClick={() => subPagesNavigation.onClick(setViewMode)} 
                  />

                  <MenuAction 
                    icon={shareCollabAction.icon} 
                    label={() => shareCollabAction.label(isCollabActive)} 
                    subtitle={() => shareCollabAction.subtitle(isCollabActive)}
                    onClick={() => {
                      if (isCollabActive) {
                        setShowCollabSettings(!showCollabSettings);
                      } else if (onStartCollab) {
                        setShowCollabSettings(true);
                      }
                    }} 
                  />

                  <AnimatePresence>
                    {showCollabSettings && !isCollabActive && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-black/20"
                      >
                        <div className="p-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                               <label className="text-[10px] font-black uppercase text-white/20 ml-2 tracking-widest">Password</label>
                               <input 
                                  type="text" 
                                  value={collabPassword}
                                  onChange={e => setCollabPassword(e.target.value)}
                                  placeholder="Optional..."
                                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/30"
                               />
                            </div>
                            <div className="space-y-1.5">
                               <label className="text-[10px] font-black uppercase text-white/20 ml-2 tracking-widest">Limit</label>
                               <input 
                                  type="number" 
                                  value={collabLimit}
                                  onChange={e => setCollabLimit(Number(e.target.value))}
                                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/30"
                               />
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              shareCollabAction.onClick(() => {
                                onStartCollab && onStartCollab({ password: collabPassword, memberLimit: collabLimit });
                              });
                            }}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] transition-all"
                          >
                            Start Live Hosting
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isCollabActive && (
                    <div className="px-6 py-4 space-y-4 bg-black/20">
                      <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-3xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-green-400 tracking-wider">P2P Host Online</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={async () => {
                              const shareUrl = `${window.location.origin}/editor/${note.id}?collab=${collabRoomId}`;
                              await navigator.clipboard.writeText(shareUrl);
                              const event = new CustomEvent('collab-notif', { detail: { message: 'Link Copied!', type: 'success' } });
                              window.dispatchEvent(event);
                            }}
                            className="py-3 px-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-wider text-center transition-all text-white/80"
                          >
                            🔗 Link
                          </button>
                          <button
                            onClick={async () => {
                              if (collabRoomId) {
                                await navigator.clipboard.writeText(collabRoomId);
                                const event = new CustomEvent('collab-notif', { detail: { message: 'ID Copied!', type: 'success' } });
                                window.dispatchEvent(event);
                              }
                            }}
                            className="py-3 px-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-wider text-center transition-all text-cyan-400"
                          >
                            🆔 ID
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {collaborators.length > 0 ? (
                          collaborators.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.03] rounded-2xl">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                                  {c.name.slice(0, 1)}
                                </div>
                                <span className="text-xs font-bold text-white/70">{c.name}</span>
                              </div>
                              <button 
                                onClick={() => onKickCollaborator && onKickCollaborator(c.id)}
                                className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/20"
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-white/20 italic text-center">No active members</p>
                        )}
                      </div>
                    </div>
                  )}

                  <MenuAction 
                    icon={readOnlyToggleAction.icon(isReadOnly)} 
                    label={() => readOnlyToggleAction.label(isReadOnly)} 
                    subtitle={() => readOnlyToggleAction.subtitle(isReadOnly)}
                    onClick={() => readOnlyToggleAction.onClick(onToggleReadOnly)} 
                  />
                  <MenuAction 
                    icon={tagAction.icon} 
                    label="ট্যাগ ম্যানেজ করুন (Tags)" 
                    subtitle={tagAction.subtitle}
                    onClick={() => tagAction.onClick(onTag)} 
                  />
                  <MenuAction 
                    icon={themeAction.icon} 
                    label="থিম পরিবর্তন করুন (Theme)" 
                    subtitle={themeAction.subtitle}
                    onClick={() => {
                      if (onTheme) themeAction.onClick(onTheme);
                    }} 
                  />
                  <MenuAction 
                    icon={duplicateNoteAction.icon} 
                    label="ডুপ্লিকেট করুন (Duplicate)" 
                    subtitle={duplicateNoteAction.subtitle}
                    onClick={() => duplicateNoteAction.onClick(onCopy)} 
                  />
                  <MenuAction 
                    icon={lockPageAction.icon} 
                    label="পাসওয়ার্ড লক (Lock Page)" 
                    subtitle={lockPageAction.subtitle}
                    onClick={() => lockPageAction.onClick(onLock)} 
                  />
                  <MenuAction 
                    icon={exportNoteAction.icon} 
                    label="এক্সপোর্ট করুন (Export)" 
                    subtitle={exportNoteAction.subtitle}
                    onClick={() => exportNoteAction.onClick(onExport)} 
                  />

                  <div className="mt-2">
                    <MenuAction 
                      icon={deleteNoteAction.icon} 
                      label="মুছে ফেলুন (Delete)" 
                      subtitle={deleteNoteAction.subtitle}
                      danger={deleteNoteAction.danger} 
                      onClick={() => deleteNoteAction.onClick(onDelete)} 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-[#121213] border-t border-white/[0.05] shrink-0">
              <button 
                onClick={viewMode === 'subpages' ? () => setViewMode('main') : onClose}
                className="w-full py-4.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl font-black text-[13px] uppercase tracking-widest transition-all text-white/30 border border-white/5 active:scale-[0.98]"
              >
                {viewMode === 'subpages' ? "ফিরে যান (Back)" : "বন্ধ করুন (Close)"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
