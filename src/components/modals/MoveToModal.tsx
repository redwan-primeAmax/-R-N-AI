/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal } from './Modal';
import { Box } from 'lucide-react';
import { sanitizeSearchQuery } from '../../utils/sanitizer';
import { Note } from '../../services/storage/DataManager';

interface MoveToModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (noteId: string, targetParentId?: string) => void;
  notes: Note[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentNote: Note | null;
}

export function MoveToModal({ 
  isOpen, 
  onClose, 
  onMove, 
  notes, 
  searchQuery, 
  onSearchChange,
  currentNote 
}: MoveToModalProps) {
  if (!currentNote) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Move to">
      <div className="p-2">
        <div className="relative mb-6">
          <input 
            value={searchQuery}
            onChange={(e) => onSearchChange(sanitizeSearchQuery(e.target.value))}
            placeholder="Search for a page..."
            className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-blue-500/30 transition-all placeholder:text-white/20"
          />
        </div>
        <div className="space-y-1 max-h-[50vh] overflow-y-auto no-scrollbar">
          <button 
            onClick={() => onMove(currentNote.id, undefined)}
            className="w-full flex items-center gap-3 p-4 hover:bg-white/5 rounded-2xl text-left transition-all group"
          >
            <Box size={18} className="text-white/20 group-hover:text-blue-400" />
            <span className="text-sm font-bold">Root Workspace</span>
          </button>
          <div className="h-px bg-white/5 my-2 mx-4" />
          {notes
            .filter(n => n.id !== currentNote.id && n.title?.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(targetNote => (
              <button 
                key={targetNote.id}
                onClick={() => onMove(currentNote.id, targetNote.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-white/5 rounded-2xl text-left transition-all"
              >
                <span className="text-lg">{targetNote.emoji || '📄'}</span>
                <span className="text-sm font-bold truncate">{targetNote.title || 'Untitled'}</span>
              </button>
            ))
          }
        </div>
      </div>
    </Modal>
  );
}
