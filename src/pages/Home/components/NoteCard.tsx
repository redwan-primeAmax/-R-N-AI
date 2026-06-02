/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, FileText } from 'lucide-react';
import { Note } from '../../../services/storage/DataManager';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NoteCardProps {
  note: Note;
  isSelectionMode: boolean;
  isSelected: boolean;
  onClick: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ 
  note, 
  isSelectionMode, 
  isSelected, 
  onClick 
}) => {
  const description = note.description || 'No Description';
  const truncatedDesc = description.length > 60 ? description.substring(0, 57) + '...' : description;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onClick(note.id)}
      className={cn(
        "relative group bg-[#121212] border border-white/[0.06] hover:border-white/[0.12] rounded-[28px] p-6 flex flex-col gap-4 transition-all duration-300 hover:bg-[#161616] hover:-translate-y-1 shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.8)] cursor-pointer overflow-hidden min-h-[180px]",
        isSelected && "ring-2 ring-blue-500 bg-blue-500/5 border-blue-500/30"
      )}
    >
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-start justify-between">
        <div className="w-14 h-14 bg-white/[0.03] rounded-[22px] flex items-center justify-center shadow-inner border border-white/5 group-hover:scale-110 transition-transform duration-500">
          <FileText size={28} className="text-white/20" />
        </div>
        <div className="flex items-center gap-2">
          {note.isCollaborated && (
            <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Live</span>
            </div>
          )}
          {isSelectionMode && (
            <div className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
              isSelected ? "bg-blue-600 border-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]" : "border-white/10 bg-white/[0.02]"
            )}>
              {isSelected && <Check size={14} className="text-white" />}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-1 min-w-0 flex-1">
        <h3 className="font-bold text-[17px] tracking-tight truncate text-white/90 group-hover:text-white transition-colors">
          {note.title || 'শিরোনামহীন'}
        </h3>
        <p className="text-xs text-white/40 font-medium leading-relaxed line-clamp-2 mt-2 group-hover:text-white/60 transition-colors">
          {truncatedDesc}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between">
        {note.tags && note.tags.length > 0 ? (
          <div className="flex gap-1.5 flex-wrap">
            {note.tags.slice(0, 2).map(tag => (
              <span key={tag} className="px-2.5 py-1 bg-white/[0.03] border border-white/[0.05] text-white/40 rounded-lg text-[9px] font-bold uppercase tracking-wider group-hover:border-white/10 group-hover:text-white/60 transition-all">
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[10px] font-mono text-white/10 uppercase tracking-widest">No tags</span>
        )}
        
        <span className="text-[9px] font-mono text-white/20 group-hover:text-white/40 transition-colors">
          {new Date(note.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </motion.div>
  );
};
