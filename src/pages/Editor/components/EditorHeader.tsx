/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, MoreHorizontal, Loader2, Search, FileDown, Users } from 'lucide-react';
import { Note } from '../../../services/storage/DataManager';

interface EditorHeaderProps {
  onBack: () => void;
  workspaceName: string;
  parentNote: Note | null;
  title: string;
  activeTasksCount: number;
  onShowMenu: () => void;
  onExportPDF?: () => void;
  isCollaborating?: boolean;
  collabPeerCount?: number;
  onNavigateToNote?: (noteId: string) => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onBack,
  workspaceName,
  parentNote,
  title,
  activeTasksCount,
  onShowMenu,
  onExportPDF,
  isCollaborating = false,
  collabPeerCount = 0,
  onNavigateToNote
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-[#121212]/60 backdrop-blur-3xl px-1 h-14 flex items-center justify-between border-b border-white/[0.03] light-theme:bg-white/80 light-theme:border-gray-200">
      <div className="flex items-center gap-0 overflow-hidden">
        <motion.button 
          whileTap={{ scale: 0.9, x: -2 }}
          onClick={onBack} 
          className="p-3 text-white/40 hover:text-white dark:hover:text-white light-theme:text-gray-400 light-theme:hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </motion.button>
        
        <div className="flex items-center gap-1.5 text-xs font-bold text-white/40 light-theme:text-gray-400 truncate pr-4">
          <span className="truncate max-w-[80px] sm:max-w-[120px]">{workspaceName}</span>
          <ChevronRight size={12} className="flex-shrink-0" />
          {parentNote && (
            <>
              <span 
                onClick={() => onNavigateToNote && onNavigateToNote(parentNote.id)}
                className="truncate max-w-[80px] sm:max-w-[100px] hover:text-white light-theme:hover:text-gray-900 transition-colors cursor-pointer hover:underline"
              >
                {parentNote.title || 'শিরোনামহীন'}
              </span>
              <ChevronRight size={12} className="flex-shrink-0" />
            </>
          )}
          <span className="text-white/80 light-theme:text-gray-800 truncate text-ellipsis">{title || 'শিরোনামহীন'}</span>
        </div>

        {isCollaborating && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/25 rounded-full ml-1 animate-pulse flex-shrink-0">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-[9px] font-black text-green-400 uppercase tracking-widest hidden xs:inline-block">
              Live {collabPeerCount > 0 ? `(${collabPeerCount})` : 'Hosting'}
            </span>
          </div>
        )}

        {activeTasksCount > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full animate-pulse ml-2">
            <Loader2 size={10} className="animate-spin text-blue-400" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-0">
         <button 
          onClick={onShowMenu}
          className="p-3 text-white/60 hover:text-white light-theme:text-gray-500 light-theme:hover:text-gray-900 transition-all active:scale-90"
          aria-label="মেনু"
          title="Menu"
         >
          <MoreHorizontal size={22} />
         </button>
      </div>
    </header>
  );
};
