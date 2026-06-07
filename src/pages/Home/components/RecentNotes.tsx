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
            whileHover={{ scale: 1.05, translateY: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNoteClick(note.id)}
            className="flex-shrink-0 w-36 relative overflow-hidden rounded-[32px] p-[1.5px] transition-all duration-300 bg-gradient-to-b from-[#4d5b6b] to-[#1a1f26] shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.45)] cursor-pointer"
          >
            <div className="relative w-full h-full bg-[#1a2332] rounded-[30.5px] p-5 flex flex-col items-center text-center gap-3 overflow-hidden">
              {/* Subtle Inner Glow Layer */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#24334d] via-[#0f172a] to-[#050810] opacity-90" />
              
              {/* Texture Overlay */}
              <div 
                className="absolute inset-0 opacity-100 pointer-events-none bg-cover bg-center"
                style={{ backgroundImage: "url('/assets/web_note_card_bg/web_note_card_bg.png')" }}
              />

              <div className="relative z-10 flex flex-col items-center gap-3 w-full">
                <div className="w-12 h-12 bg-white/[0.02] rounded-2xl flex items-center justify-center shadow-inner border border-white/5 group-hover:scale-105 transition-transform">
                  {note.emoji ? (
                    <span className="text-2xl drop-shadow-md">{note.emoji}</span>
                  ) : (
                    <FileText size={20} className="text-white/30" />
                  )}
                </div>
                <div className="font-bold text-[11px] truncate w-full px-1 text-white/90">
                  {note.title || 'শিরোনামহীন'}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
