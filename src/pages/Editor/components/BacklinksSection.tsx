/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { DataManager } from '../../../services/storage/DataManager';
import { findBacklinks, BacklinkItem } from '../../../utils/backlinks';
import { Note } from '../../../types/note';
import { cn } from '../../../utils/cn';

interface BacklinksSectionProps {
  currentNoteId: string;
  onNavigateToNote: (noteId: string) => void;
  isLight: boolean;
}

export const BacklinksSection: React.FC<BacklinksSectionProps> = ({
  currentNoteId,
  onNavigateToNote,
  isLight
}) => {
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadBacklinks = async () => {
      if (!currentNoteId) return;
      try {
        const allNotes = await DataManager.getAllNotes();
        if (isMounted) {
          const links = findBacklinks(currentNoteId, allNotes as Note[]);
          setBacklinks(links);
        }
      } catch (err) {
        console.error('Failed to load backlinks:', err);
      }
    };

    loadBacklinks();
    return () => { isMounted = false; };
  }, [currentNoteId]);

  if (backlinks.length === 0) return null;

  return (
    <div className={cn(
      "mt-12 pt-6 border-t rounded-2xl p-4 transition-colors",
      isLight ? "border-gray-200 bg-gray-50/50" : "border-white/10 bg-white/[0.02]"
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity cursor-pointer w-full text-left mb-2"
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Link2 size={16} className="text-blue-500" />
        <span>ব্যাকলিংকসমূহ (Backlinks)</span>
        <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-black ml-1">
          {backlinks.length}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2 mt-3">
          {backlinks.map((link) => (
            <button
              key={link.noteId}
              onClick={() => onNavigateToNote(link.noteId)}
              className={cn(
                "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer group/link",
                isLight 
                  ? "bg-white hover:bg-blue-50/50 border-gray-200 hover:border-blue-300" 
                  : "bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20"
              )}
            >
              <div className="text-xl shrink-0 mt-0.5">{link.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-blue-500 group-hover/link:underline truncate">
                  {link.title}
                </div>
                <div className="text-xs opacity-60 truncate mt-0.5 font-mono">
                  {link.snippet}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
