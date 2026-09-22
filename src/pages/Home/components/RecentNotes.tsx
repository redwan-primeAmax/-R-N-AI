/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock } from 'lucide-react';
import { PageIcon } from '../../../components/PageIcon';
import { RecentNote } from '../../../services/storage/HistoryManager';

interface RecentNotesProps {
  notes: RecentNote[];
  onNoteClick: (id: string) => void;
}

export const RecentNotes: React.FC<RecentNotesProps> = ({ notes, onNoteClick }) => {
  if (notes.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden mt-4">
      <div className="flex items-center gap-1.5 mb-3 px-5">
        <Clock size={12} className="text-amber-400" />
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-white/50">
          সাম্প্রতিক নোটস
        </h2>
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-4 no-scrollbar pb-2">
        {notes.map(note => {
          return (
            <motion.button 
              key={note.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNoteClick(note.id)}
              className="flex-shrink-0 w-32 relative overflow-hidden rounded-[20px] p-[1px] transition-all duration-150 bg-white/[0.08] hover:bg-amber-400/20 shadow-md border border-white/[0.06] active:scale-95 cursor-pointer text-left"
            >
              <div className="relative w-full h-full bg-[#242220] rounded-[19px] p-3.5 flex flex-col items-start gap-2.5 overflow-hidden">
                <div className="w-9 h-9 bg-white/[0.05] rounded-xl flex items-center justify-center border border-white/10 overflow-hidden shadow-inner">
                  {note.emoji ? (
                    <PageIcon emoji={note.emoji} className="text-xl drop-shadow-sm" fallback="📄" />
                  ) : (
                    <FileText size={16} className="text-amber-400" />
                  )}
                </div>
                <div className="font-bold text-[12px] truncate w-full text-white/90">
                  {note.title || 'শিরোনামহীন নোট'}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
