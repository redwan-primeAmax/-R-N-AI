/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ChevronRight, 
  Trash2, 
  X, 
  Check, 
  MoreHorizontal, 
  ChevronDown, 
  Inbox, 
  Layout, 
  Copy, 
  Star,
  MoreVertical
} from 'lucide-react';
import { DataManager, Note } from '../utils/DataManager';
import { motion, AnimatePresence } from 'motion/react';
import { FixedSizeList } from 'react-window';

// Memoized Context Menu to prevent unnecessary re-renders
const NoteContextMenu = memo(({ 
  note, 
  onClose, 
  onDuplicate, 
  onToggleFavorite, 
  onDelete 
}: { 
  note: Note; 
  onClose: () => void;
  onDuplicate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-[2px]" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-lg bg-[#1c1c1c] rounded-t-3xl p-6 pb-12 shadow-2xl border-t border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
        
        <div className="flex items-center gap-4 mb-8 px-2">
          <div className="text-3xl">{note.emoji}</div>
          <div className="min-w-0">
            <h3 className="text-white font-bold truncate">{note.title || 'Untitled'}</h3>
            <p className="text-white/40 text-xs">Last edited {new Date(note.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="space-y-1">
          <button 
            onClick={() => { onDuplicate(note.id); onClose(); }}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl transition-colors text-white active:scale-98"
          >
            <Copy size={20} className="text-white/60" />
            <span className="font-medium">Duplicate</span>
          </button>
          
          <button 
            onClick={() => { onToggleFavorite(note.id); onClose(); }}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl transition-colors text-white active:scale-98"
          >
            <Star size={20} className={note.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-white/60"} />
            <span className="font-medium">{note.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
          </button>

          <div className="h-px bg-white/5 my-2 mx-4" />

          <button 
            onClick={() => { onDelete(note.id); onClose(); }}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-red-500/10 rounded-2xl transition-colors text-red-500 active:scale-98"
          >
            <Trash2 size={20} />
            <span className="font-medium">Delete</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
});

NoteContextMenu.displayName = 'NoteContextMenu';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Memoized Row component for react-window
const NoteRow = memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: {
    notes: Note[];
    selectedIds: string[];
    isSelectionMode: boolean;
    handleNoteClick: (id: string) => void;
    startLongPress: (id: string) => void;
    endLongPress: () => void;
    setActiveMenuNote: (note: Note) => void;
    createNewNote: () => void;
  }
}) => {
  const { notes, selectedIds, isSelectionMode, handleNoteClick, startLongPress, endLongPress, setActiveMenuNote, createNewNote } = data;
  const note = notes[index];
  if (!note) return null;

  const isSelected = selectedIds.includes(note.id);

  return (
    <div style={style}>
      <motion.div
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={() => startLongPress(note.id)}
        onMouseUp={endLongPress}
        onMouseLeave={endLongPress}
        onTouchStart={() => startLongPress(note.id)}
        onTouchEnd={endLongPress}
        className={cn(
          "group relative flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer mx-4",
          isSelected 
            ? "bg-white/10" 
            : "hover:bg-white/5 active:bg-white/5"
        )}
      >
        <div 
          className="flex-grow flex items-center gap-3 min-w-0"
          onClick={() => handleNoteClick(note.id)}
        >
          <ChevronRight size={18} className={cn("transition-colors", isSelected ? "text-white/40" : "text-white/20")} />
          <span className="text-xl flex-shrink-0">{note.emoji}</span>
          <h3 className="font-medium text-[15px] truncate text-white/90">
            {note.title || 'Untitled'}
          </h3>
        </div>

        {!isSelectionMode && (
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuNote(note);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
            >
              <MoreHorizontal size={18} className="text-white/30" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                createNewNote();
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
            >
              <Plus size={18} className="text-white/30" />
            </button>
          </div>
        )}

        {isSelectionMode && (
          <div className="px-2">
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
              isSelected 
                ? "bg-white border-white" 
                : "border-white/20"
            )}>
              {isSelected && <Check size={12} className="text-black font-bold" />}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
});

NoteRow.displayName = 'NoteRow';

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [userName, setUserName] = useState<string>('User');
  const [activeMenuNote, setActiveMenuNote] = useState<Note | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [listHeight, setListHeight] = useState(window.innerHeight - 280);
  const navigate = useNavigate();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    
    const handleResize = () => {
      setListHeight(window.innerHeight - 280);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = useCallback(async () => {
    const allNotes = await DataManager.getAllNotes();
    setNotes(allNotes.sort((a, b) => b.updatedAt - a.updatedAt));
    const name = await DataManager.getUserName();
    if (name) setUserName(name);
  }, []);

  const createNewNote = useCallback(async () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      emoji: '📝',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false
    };
    await DataManager.saveNote(newNote);
    navigate(`/editor/${newNote.id}`);
  }, [navigate]);

  const handleNoteClick = useCallback((id: string) => {
    if (isSelectionMode) {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      navigate(`/editor/${id}`);
    }
  }, [isSelectionMode, navigate]);

  const startLongPress = useCallback((id: string) => {
    longPressTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedIds([id]);
    }, 600);
  }, []);

  const endLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }, []);

  const deleteSelected = useCallback(async () => {
    if (selectedIds.length > 0) {
      await DataManager.deleteNotes(selectedIds);
      setSelectedIds([]);
      setIsSelectionMode(false);
      loadData();
    }
  }, [selectedIds, loadData]);

  const cancelSelection = useCallback(() => {
    setSelectedIds([]);
    setIsSelectionMode(false);
  }, []);

  const handleDuplicate = useCallback(async (id: string) => {
    await DataManager.duplicateNote(id);
    loadData();
  }, [loadData]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    await DataManager.toggleFavorite(id);
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(async (id: string) => {
    await DataManager.deleteNote(id);
    loadData();
  }, [loadData]);


  return (
    <div className="min-h-screen bg-[#191919] text-white pb-32 overflow-x-hidden">
      {/* Top Bar */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between sticky top-0 bg-[#191919]/90 backdrop-blur-xl z-30 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center font-bold text-white/80">
            {userName.charAt(0).toUpperCase()}
          </div>
          <button className="flex items-center gap-1 text-sm font-medium text-white/90">
            {userName}'s space
            <ChevronDown size={14} className="text-white/40" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <Inbox size={22} className="text-white/60" />
          <MoreHorizontal size={22} className="text-white/60" />
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Private Section Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">Private</h2>
          <div className="flex items-center gap-4">
            <MoreHorizontal size={16} className="text-white/40" />
            <Plus size={18} className="text-white/40" onClick={createNewNote} />
          </div>
        </div>

        {/* Notes List */}
        <div className="mt-2 flex-grow overflow-hidden">
          {notes.length > 0 ? (
            <FixedSizeList
              height={listHeight}
              itemCount={notes.length}
              itemSize={52}
              width="100%"
              className="no-scrollbar"
              itemData={{
                notes,
                selectedIds,
                isSelectionMode,
                handleNoteClick,
                startLongPress,
                endLongPress,
                setActiveMenuNote,
                createNewNote
              }}
            >
              {NoteRow}
            </FixedSizeList>
          ) : (
            <div className="py-10 text-center text-white/20 text-sm italic">
              No notes found. Create one to get started!
            </div>
          )}
        </div>

        {/* Browse Templates Card */}
        {!isSelectionMode && (
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/templates')}
            className="mt-8 bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-all border-dashed"
          >
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Layout size={20} className="text-white/80" />
            </div>
            <div className="flex-grow">
              <h3 className="font-medium text-[15px]">Browse templates</h3>
              <p className="text-xs text-white/40">Start from a pre-made page</p>
            </div>
            <div className="flex flex-col gap-0.5 opacity-20">
              <div className="w-6 h-0.5 bg-white rounded-full" />
              <div className="w-4 h-0.5 bg-white rounded-full" />
              <div className="w-6 h-0.5 bg-white rounded-full" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Context Menu Overlay */}
      <AnimatePresence>
        {activeMenuNote && (
          <NoteContextMenu 
            note={activeMenuNote}
            onClose={() => setActiveMenuNote(null)}
            onDuplicate={handleDuplicate}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>

      {/* Selection Actions Bar */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[100px] left-4 right-4 z-50 bg-white text-black p-4 rounded-2xl flex justify-between items-center shadow-2xl border border-black/5"
          >
            <span className="font-bold text-sm ml-2">{selectedIds.length} selected</span>
            <div className="flex gap-2">
              <button
                onClick={cancelSelection}
                className="px-4 py-2 bg-black/5 rounded-xl text-sm font-bold hover:bg-black/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteSelected}
                className="px-4 py-2 bg-red-600 rounded-xl text-sm font-bold text-white hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

