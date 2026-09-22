/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, FileText, MoreVertical, Lock } from 'lucide-react';
import { PageIcon } from '../../../components/PageIcon';
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
  onMoreClick?: (note: Note, e: React.MouseEvent) => void;
}

export const NoteCard = React.memo<NoteCardProps>(({ 
  note, 
  isSelectionMode, 
  isSelected, 
  onClick,
  onMoreClick
}) => {
  // Determine a stable random background based on ID
  const cardBackground = React.useMemo(() => {
    return "linear-gradient(135deg, var(--bg-card-start) 0%, var(--bg-card-end) 100%)";
  }, []);

  const getTagStyle = (tag: string) => {
    const TAG_COLORS = [
      { bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', text: 'text-emerald-400' },
      { bg: 'bg-sky-400/10', border: 'border-sky-400/20', text: 'text-sky-400' },
      { bg: 'bg-rose-400/10', border: 'border-rose-400/20', text: 'text-rose-400' },
      { bg: 'bg-violet-400/10', border: 'border-violet-400/20', text: 'text-violet-400' },
      { bg: 'bg-amber-400/10', border: 'border-amber-400/20', text: 'text-amber-400' },
      { bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/20', text: 'text-fuchsia-400' },
    ];
    const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return TAG_COLORS[hash % TAG_COLORS.length];
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(note.id)}
      className={cn(
        "relative group rounded-[26px] p-[1.5px] transition-all duration-200 cursor-pointer overflow-hidden min-h-[190px] touch-manipulation shadow-[0_6px_24px_rgba(0,0,0,0.5)] border border-white/[0.06] hover:border-amber-400/30",
        isSelected && "ring-2 ring-[#FFB03A] shadow-[0_0_20px_rgba(255,176,58,0.4)]"
      )}
    >
      <div 
        style={{ background: cardBackground }}
        className="relative w-full h-full rounded-[24.5px] flex flex-col p-5 overflow-hidden"
      >
        {/* Android Material 3 subtle top inner highlight */}
        <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        <div className="relative z-20 flex flex-col h-full max-w-full">
          <div className="flex items-start justify-between min-h-[30px] mb-2">
            <div className="flex items-center gap-2 flex-wrap max-w-full overflow-hidden">
              {note.isCollaborated && (
                <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-1.5 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Live</span>
                </div>
              )}
              {isSelectionMode && (
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                  isSelected ? "bg-[#FFB03A] border-[#FFB03A] shadow-md" : "border-white/20 bg-white/[0.04]"
                )}>
                  {isSelected && <Check size={14} className="text-black stroke-[3]" />}
                </div>
              )}
            </div>

            {/* Android More Options Button */}
            {!isSelectionMode && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onMoreClick?.(note, e);
                }}
                className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all active:scale-90"
                aria-label="আরও অপশন"
              >
                <MoreVertical size={18} />
              </button>
            )}
          </div>
          
          <div className="min-w-0 flex-1 flex flex-col gap-2 overflow-hidden">
            <div className="flex items-start gap-3.5">
              <div 
                className="w-12 h-12 bg-white/[0.04] rounded-2xl flex items-center justify-center shadow-inner border border-white/10 group-hover:scale-105 group-hover:bg-white/[0.08] group-hover:border-amber-400/30 shrink-0 overflow-hidden transition-transform"
              >
                {note.emoji ? (
                  <PageIcon emoji={note.emoji} className="text-3xl drop-shadow-md" fallback="📄" />
                ) : (
                  <FileText size={24} className="text-amber-400/70" />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="font-bold text-[17px] leading-snug tracking-tight text-white/95 group-hover:text-amber-200 transition-colors truncate block">
                  {note.title || 'শিরোনামহীন নোট'}
                </h3>
                <p className="text-[13px] font-normal leading-relaxed line-clamp-2 mt-1 text-white/50 group-hover:text-white/70 transition-colors break-words max-h-[38px] overflow-hidden">
                  {note.description ? (note.description.length > 90 ? note.description.substring(0, 87) + '...' : note.description) : 'কোনো অতিরিক্ত বিবরণ নেই'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/[0.06] overflow-hidden">
            <div className="flex gap-1.5 flex-wrap max-w-full overflow-hidden items-center">
              {note.isLocked && <Lock size={12} className="text-amber-400 mr-1" />}
              {note.tags && note.tags.length > 0 ? (
                note.tags.slice(0, 2).map(tag => {
                  const style = getTagStyle(tag);
                  return (
                    <span 
                      key={tag} 
                      className={cn(
                        "px-2.5 py-0.5 border rounded-full text-[9px] font-bold tracking-tight truncate",
                        style.bg, style.border, style.text
                      )}
                    >
                      #{tag}
                    </span>
                  );
                })
              ) : (
                <span className="text-[10px] font-medium text-white/30 truncate">নোট</span>
              )}
            </div>
            
            <span className="text-[10px] font-mono text-white/40 group-hover:text-white/70 transition-colors shrink-0 whitespace-nowrap ml-2">
              {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
