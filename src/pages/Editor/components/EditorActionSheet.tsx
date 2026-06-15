/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronRight, Plus, Box, Check, ClipboardCopy, Trash2, Bookmark } from 'lucide-react';
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
import { copyContentAction } from '../actions/CopyContentAction';

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
  onBookmark?: () => void;
  onTheme?: () => void;
  subPages: Note[];
  onAddSubPage: () => void;
  onStartCollab?: (options?: { password?: string, memberLimit?: number }) => void;
  isCollabActive?: boolean;
  collabRoomId?: string | null;
  collaborators?: { id: string, name: string }[];
  onKickCollaborator?: (peerId: string) => void;
  blocks?: any[];
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
  onBookmark,
  onTheme,
  subPages,
  onAddSubPage,
  onStartCollab,
  isCollabActive = false,
  collabRoomId = null,
  collaborators = [],
  onKickCollaborator,
  blocks = []
}) => {
  const navigate = useNavigate();
  const [showCollabSettings, setShowCollabSettings] = useState(false);
  const [collabPassword, setCollabPassword] = useState('');
  const [collabLimit, setCollabLimit] = useState(5);
  const [viewMode, setViewMode] = useState<'main' | 'subpages'>('main');
  const [isCopied, setIsCopied] = useState(false);

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
          "w-full flex items-center gap-5 px-6 py-1.5 transition-all active:bg-white/5 group border-b border-white/[0.03] last:border-0",
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
            className="relative w-full bg-[#121213] rounded-t-[40px] border-t border-white/[0.05] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] overflow-hidden max-h-[90vh] flex flex-col pt-2"
          >
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto my-5 shrink-0" />
            
            <div className="px-6 mb-6 flex items-center gap-4">
               <div className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center text-4xl border border-white/5">
                  {note.emoji || '📄'}
               </div>
               <div>
                  <h3 className="font-bold text-xl text-white/90">{note.title || 'শিরোনামহীন'}</h3>
                  <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">
                     {new Date(note.updatedAt).toLocaleDateString()} • {subPages.length} Subpages
                  </p>
               </div>
            </div>

            <div className="overflow-y-auto pb-12 flex-1 no-scrollbar px-6 space-y-1">
              {viewMode === 'subpages' ? (
                <div className="animate-fade-in space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">অনুষঙ্গিক পাতা সমূহ</h4>
                    <button 
                      onClick={onAddSubPage}
                      className="p-2 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 rounded-xl border border-blue-500/10 transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-[45vh] overflow-y-auto no-scrollbar pr-1">
                    {subPages.length > 0 ? (
                      subPages.map(sub => (
                        <button 
                          key={sub.id}
                          onClick={() => {
                            const collabParam = collabRoomId ? `?collab=${collabRoomId}` : '';
                            navigate(`/editor/${sub.id}${collabParam}`);
                            onClose();
                          }}
                          className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-3xl hover:bg-white/5 transition-all text-left"
                        >
                          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/20">
                            <FileText size={18} />
                          </div>
                          <span className="font-bold text-xs text-white/70 truncate flex-1">{sub.title || 'শিরোনামহীন'}</span>
                          <ChevronRight size={16} className="text-white/10" />
                        </button>
                      ))
                    ) : (
                      <div className="p-12 border border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center opacity-30 my-4">
                        <FileText size={32} className="mb-2 text-white/40" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">কোন অনুষঙ্গিক পাতা নেই</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                     <button 
                        onClick={() => setViewMode('subpages')}
                        className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex flex-col items-center gap-2 hover:bg-blue-500/20 transition-all"
                     >
                        <Box size={24} className="text-blue-400" />
                        <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Sub Pages</span>
                     </button>
                     <button 
                        onClick={() => tagAction.onClick(onTag)}
                        className="p-5 bg-purple-500/10 border border-purple-500/20 rounded-3xl flex flex-col items-center gap-2 hover:bg-purple-500/20 transition-all"
                     >
                        <Check size={24} className="text-purple-400" />
                        <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Manage Tags</span>
                     </button>
                  </div>

                  <MenuAction 
                    icon={shareCollabAction.icon} 
                    label="Share Live Host" 
                    subtitle={() => shareCollabAction.subtitle(isCollabActive)}
                    onClick={() => setShowCollabSettings(!showCollabSettings)} 
                  />

                  {/* Collaboration UI handled here same as before */}
                  {/* Internal Actions */}
                  <MenuAction 
                    icon={readOnlyToggleAction.icon(isReadOnly)} 
                    label="Toggle Read-Only" 
                    subtitle={() => readOnlyToggleAction.subtitle(isReadOnly)}
                    onClick={() => readOnlyToggleAction.onClick(onToggleReadOnly)} 
                  />
                  <MenuAction 
                    icon={copyContentAction.icon(isCopied)} 
                    label="Copy Content" 
                    onClick={() => copyContentAction.onClick(blocks, setIsCopied)} 
                  />
                  <MenuAction 
                    icon={exportNoteAction.icon} 
                    label="Export Notes" 
                    onClick={() => exportNoteAction.onClick(onExport)} 
                  />
                   <MenuAction 
                    icon={duplicateNoteAction.icon} 
                    label="Duplicate Page" 
                    onClick={() => { onCopy(); onClose(); }} 
                  />
                  <MenuAction 
                    icon={Bookmark} 
                    label="বুকমার্কে যোগ করুন" 
                    onClick={() => { onBookmark?.(); onClose(); }} 
                  />

                  <div className="pt-4 mt-2 border-t border-white/5">
                    <button 
                      onClick={() => { onDelete(); onClose(); }}
                      className="w-full py-5 bg-red-500/10 hover:bg-red-500/20 rounded-3xl flex items-center justify-center gap-3 text-red-500 font-bold text-sm transition-all active:scale-[0.98]"
                    >
                      <Trash2 size={20} />
                      ডিলেট করুন (Delete Page)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#121213] border-t border-white/[0.05] shrink-0">
              <button 
                onClick={viewMode === 'subpages' ? () => setViewMode('main') : onClose}
                className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all text-white/40 border border-white/5 active:scale-[0.98]"
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
