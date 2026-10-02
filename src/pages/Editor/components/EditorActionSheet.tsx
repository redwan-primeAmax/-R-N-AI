/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronRight, Plus, Box, Tag, FolderInput, Copy, Download, CopyPlus, Lock, Unlock } from 'lucide-react';
import { Note } from '../../../services/storage/DataManager';
import { cn } from '../../../utils/cn';
import { useNavigate } from 'react-router-dom';

import { readOnlyToggleAction } from '../actions/ReadOnlyToggleAction';
import { tagAction } from '../actions/TagAction';
import { duplicateNoteAction } from '../actions/DuplicateNoteAction';
import { exportNoteAction } from '../actions/ExportNoteAction';
import { copyContentAction } from '../actions/CopyContentAction';

interface EditorActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  isReadOnly: boolean;
  onToggleReadOnly: () => void;
  onDelete?: () => void;
  onCopy: () => void;
  onLock: () => void;
  onExport: () => void;
  onTag: () => void;
  onBookmark?: () => void;
  onTheme?: () => void;
  subPages: Note[];
  onAddSubPage: () => void;
  blocks?: any[];
}

export const EditorActionSheet: React.FC<EditorActionSheetProps> = ({
  isOpen,
  onClose,
  note,
  isReadOnly,
  onToggleReadOnly,
  onCopy,
  onExport,
  onTag,
  subPages,
  onAddSubPage,
  blocks = []
}) => {
  const navigate = useNavigate();
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
    const resolvedLabel = typeof label === 'function' ? label() : label;
    const resolvedSubtitle = typeof subtitle === 'function' ? subtitle() : subtitle;

    return (
      <button 
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3.5 px-4 py-2 rounded-2xl transition-all hover:bg-white/5 active:scale-[0.99] group border border-transparent hover:border-white/5",
          danger ? "text-red-500" : "text-white/90"
        )}
      >
        <div className={cn("w-6 flex justify-center opacity-70 group-hover:opacity-100 transition-all shrink-0", danger ? "text-red-500" : "text-white")}>
          {Icon && <Icon size={19} strokeWidth={1.5} />}
        </div>
        <div className="flex flex-col items-start text-left flex-1 min-w-0">
          <span className="font-medium text-[14px] leading-tight tracking-wide truncate">{resolvedLabel}</span>
          {resolvedSubtitle && <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-0.5">{resolvedSubtitle}</span>}
        </div>
      </button>
    );
  };

  const handleMoveTo = () => {
    onClose();
    // Step 8: Directly redirect user to Bookmarks/Folders page
    navigate('/bookmarks', { state: { moveNoteId: note.id } });
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
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
            className="relative w-full bg-[#121213] rounded-t-[36px] border-t border-white/[0.05] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] overflow-hidden max-h-[90vh] flex flex-col pt-2"
          >
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto my-3 shrink-0" />
            
            <div className="px-6 mb-3 flex items-center gap-3">
               <div className="w-12 h-12 bg-white/[0.03] rounded-2xl flex items-center justify-center text-2xl border border-white/5 shrink-0">
                  {note.emoji || '📄'}
               </div>
               <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base text-white/90 truncate">{note.title || 'শিরোনামহীন'}</h3>
                  <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-0.5">
                     {new Date(note.updatedAt).toLocaleDateString()} • {subPages.length} Subpages
                  </p>
               </div>
            </div>

            <div className="overflow-y-auto pb-4 flex-1 no-scrollbar px-4">
              {viewMode === 'subpages' ? (
                <div className="animate-fade-in space-y-3">
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
                            navigate(`/editor/${sub.id}`);
                            onClose();
                          }}
                          className="flex items-center gap-3.5 p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/5 transition-all text-left"
                        >
                          <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-white/20 shrink-0">
                            <FileText size={18} />
                          </div>
                          <span className="font-bold text-xs text-white/70 truncate flex-1">{sub.title || 'শিরোনামহীন'}</span>
                          <ChevronRight size={16} className="text-white/10" />
                        </button>
                      ))
                    ) : (
                      <div className="p-10 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center opacity-30 my-3">
                        <FileText size={28} className="mb-2 text-white/40" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">কোন অনুষঙ্গিক পাতা নেই</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-[2px]">
                  <MenuAction 
                    icon={Box} 
                    label="অনুষঙ্গিক পাতা (Sub Pages)" 
                    subtitle={`${subPages.length}টি অনুষঙ্গিক পাতা ব্যবস্থাপনা`}
                    onClick={() => setViewMode('subpages')} 
                  />
                  <MenuAction 
                    icon={Tag} 
                    label="ট্যাগ ম্যানেজ (Manage Tags)" 
                    subtitle="নোটের ট্যাগ পরিবর্তন বা যোগ করুন"
                    onClick={() => {
                      onClose();
                      tagAction.onClick(onTag);
                    }} 
                  />
                  <MenuAction 
                    icon={isReadOnly ? Unlock : Lock} 
                    label="Toggle Read-Only" 
                    subtitle={isReadOnly ? "নোট সম্পাদনা চালু করুন (Edit Mode)" : "নোট ভুলবশত পরিবর্তন রোধ করতে লক করুন"}
                    onClick={() => readOnlyToggleAction.onClick(onToggleReadOnly)} 
                  />
                  <MenuAction 
                    icon={Copy} 
                    label="Copy Content" 
                    subtitle="নোটের সমস্ত টেক্সট ক্লিপবোর্ডে কপি করুন"
                    onClick={() => copyContentAction.onClick(blocks, setIsCopied)} 
                  />
                  <MenuAction 
                    icon={Download} 
                    label="Export Notes" 
                    subtitle="পিডিএফ বা অন্য ফরম্যাটে ডাউনলোড করুন"
                    onClick={() => exportNoteAction.onClick(onExport)} 
                  />
                  <MenuAction 
                    icon={CopyPlus} 
                    label="Duplicate Page" 
                    subtitle="একটি হুবহু নতুন অনুলিপি তৈরি করুন"
                    onClick={() => { onCopy(); onClose(); }} 
                  />
                  <MenuAction 
                    icon={FolderInput} 
                    label="Move To" 
                    subtitle="অন্য ফোল্ডার বা ডিরেক্টরিতে স্থানান্তর করুন"
                    onClick={handleMoveTo} 
                  />
                </div>
              )}
            </div>

            <div className="p-3 bg-[#121213] border-t border-white/[0.05] shrink-0">
              <button 
                onClick={viewMode === 'subpages' ? () => setViewMode('main') : onClose}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all text-white/40 border border-white/5 active:scale-[0.98]"
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
