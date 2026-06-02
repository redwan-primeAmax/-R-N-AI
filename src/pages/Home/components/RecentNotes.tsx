/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText } from 'lucide-react';
import { RecentNote } from '../../../services/storage/HistoryManager';

interface RecentNotesProps {
  notes: RecentNote[];
  onNoteClick: (id: string) => void;
}

export const RecentNotes: React.FC<RecentNotesProps> = ({ notes, onNoteClick }) => {
  if (notes.length === 0) return null;

  return (
    <div className="mb-10 overflow-hidden mt-8">
      <h2 className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em] mb-4 px-5">
        Recent Activity
      </h2>
      <div className="flex gap-3 overflow-x-auto px-5 no-scrollbar pb-4 -mx-1">
        {notes.map(note => (
          <motion.button 
            key={note.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNoteClick(note.id)}
            className="flex-shrink-0 w-36 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 border-b-[4px] border-r-[1.5px] rounded-[32px] p-5 flex flex-col items-center text-center gap-3 transition-all duration-150 hover:bg-white/[0.06] hover:border-white/15 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-[1px] active:border-r-[0.5px] shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.45)] cursor-pointer"
          >
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center shadow-inner border border-white/10 border-b-[2px] border-r-[1px]">
              <FileText size={24} className="text-white/20" />
            </div>
            <div className="font-bold text-xs truncate w-full px-1 text-white/80">
              {note.title || 'শিরোনামহীন'}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
