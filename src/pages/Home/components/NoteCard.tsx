/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, FileText, MoreVertical, Lock, Radio } from 'lucide-react';
import { PageIcon } from '../../../components/PageIcon';
import { Note } from '../../../services/storage/DataManager';
import { cn } from '../../../utils/cn';
import { truncateGraphemes } from '../../../utils/text';

interface NoteCardProps {
  note: Note;
  isSelectionMode: boolean;
  isSelected: boolean;
  onClick: (id: string) => void;
  onMoreClick?: (note: Note, e: React.MouseEvent) => void;
  mode?: 'grid' | 'layer';
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'এইমাত্র';
  if (minutes < 60) return `${minutes}মি আগে`;
  if (hours < 24) return `${hours}ঘ আগে`;
  if (days === 1) return 'গতকাল';
  if (days < 7) return `${days}দিন আগে`;

  return new Date(timestamp).toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric' 
  });
}

export const NoteCard = React.memo<NoteCardProps>(({ 
  note, 
  isSelectionMode, 
  isSelected, 
  onClick,
  onMoreClick,
  mode = 'layer'
}) => {
  const isGrid = mode === 'grid';
  const previewText = React.useMemo(() => {
    const plain = note.content ? note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    return truncateGraphemes(plain, isGrid ? 90 : 60);
  }, [note.content, isGrid]);

  const timeLabel = React.useMemo(() => {
    return formatRelativeTime(note.updatedAt);
  }, [note.updatedAt]);

  if (isGrid) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onClick(note.id)}
        className={cn(
          "group relative flex flex-col justify-between p-4 rounded-2xl transition-all cursor-pointer select-none min-h-[120px]",
          "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 shadow-sm",
          isSelected && "bg-amber-400/15 border-amber-400/40"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {isSelectionMode ? (
              <div 
                className={cn(
                  "w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0",
                  isSelected ? "bg-amber-500 border-amber-500 text-white" : "border-white/30 bg-transparent"
                )}
              >
                {isSelected && <Check size={13} strokeWidth={3} />}
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.06] shrink-0 text-base">
                {note.emoji ? (
                  <PageIcon emoji={note.emoji} className="text-xl" fallback="📄" />
                ) : (
                  <FileText size={18} className="text-white/60" />
                )}
              </div>
            )}
            <h3 className="text-sm font-bold text-white truncate min-w-0 flex-1">
              {note.title || 'শিরোনামহীন নোট'}
            </h3>
          </div>
          {!isSelectionMode && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onMoreClick?.(note, e);
              }}
              className="p-1 -mr-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="More actions"
            >
              <MoreVertical size={16} />
            </button>
          )}
        </div>

        {previewText && (
          <p className="text-xs text-white/60 line-clamp-2 mb-3 leading-relaxed">
            {previewText}
          </p>
        )}

        <div className="flex items-center justify-between text-[11px] text-white/40 mt-auto pt-2 border-t border-white/[0.04]">
          <span>{timeLabel}</span>
          {note.isLocked && <Lock size={12} className="text-amber-400 shrink-0" />}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick(note.id)}
      className={cn(
        "group relative flex items-center justify-between transition-colors cursor-pointer select-none",
        "border-b border-black/[0.06] dark:border-white/[0.06] last:border-b-0",
        "hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:bg-black/[0.05] dark:active:bg-white/[0.06]",
        "py-2.5 px-3 rounded-xl my-0.5",
        isSelected && "bg-amber-400/10 dark:bg-amber-400/15 hover:bg-amber-400/15"
      )}
    >
      {/* Left: Checkbox or Notion-style Page Icon */}
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        {isSelectionMode ? (
          <div 
            className={cn(
              "w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0",
              isSelected 
                ? "bg-amber-500 border-amber-500 text-white shadow-sm" 
                : "border-black/30 dark:border-white/30 bg-transparent"
            )}
          >
            {isSelected && <Check size={13} strokeWidth={3} />}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/[0.03] dark:bg-white/[0.05] shrink-0 text-base">
            {note.emoji ? (
              <PageIcon emoji={note.emoji} className="text-xl" fallback="📄" />
            ) : (
              <FileText size={18} className="text-black/50 dark:text-white/50" />
            )}
          </div>
        )}

        {/* Center: Title & Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] sm:text-[15px] font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {note.title || 'শিরোনামহীন নোট'}
            </h3>
            {note.isLocked && (
              <Lock size={12} className="text-amber-500 dark:text-amber-400 shrink-0" />
            )}
            {note.isCollaborated && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <Radio size={8} className="animate-pulse" /> Live
              </span>
            )}
          </div>

          {/* Secondary Row: relative time, preview, neutral tag pills */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 min-w-0 flex-wrap">
            <span className="shrink-0 text-[11px] font-normal text-neutral-400 dark:text-neutral-500">
              {timeLabel}
            </span>

            {previewText && (
              <>
                <span className="text-neutral-300 dark:text-neutral-600 select-none">•</span>
                <span className="truncate text-[12px] text-neutral-500 dark:text-neutral-400 max-w-[240px] sm:max-w-md">
                  {previewText}
                </span>
              </>
            )}

            {note.tags && note.tags.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 ml-1 shrink-0">
                {note.tags.slice(0, 2).map(tag => (
                  <span 
                    key={tag}
                    className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      {!isSelectionMode && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onMoreClick?.(note, e);
          }}
          className="p-1.5 -mr-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 active:scale-90"
          aria-label="আরও অপশন"
          title="More actions"
        >
          <MoreVertical size={16} />
        </button>
      )}
    </motion.div>
  );
});
