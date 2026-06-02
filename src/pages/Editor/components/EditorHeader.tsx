/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Note } from '../../../services/storage/DataManager';
import { PublishIcon } from '../svg/PublishIcon';

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
  onStartCollab?: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onBack,
  onShowMenu,
  onStartCollab,
  isCollaborating = false,
  collabPeerCount = 0,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-transparent transition-colors px-4 h-14 flex items-center justify-between border-none">
      <div className="flex items-center">
        {/* Requirement 5: Back button at top left */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onBack} 
          className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Back"
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </motion.button>
      </div>

      <div className="flex items-center gap-2">
         {/* Requirement 6: Collaboration/Publish button next to 3-dot */}
         <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onStartCollab}
          className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all flex items-center gap-1.5"
          title="Collaborate / Publish"
         >
           <PublishIcon size={22} />
           {isCollaborating && (
             <span className="text-[10px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
               {collabPeerCount}
             </span>
           )}
         </motion.button>

         {/* Requirement 5: Three-dot menu at top right */}
         <button 
          onClick={onShowMenu}
          className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-90"
          title="More options"
         >
          <MoreHorizontal size={24} />
         </button>
      </div>
    </header>
  );
};
