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
  MoreVertical,
  Sparkles,
  UploadCloud,
  Download,
  Settings,
  Loader2
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
        transition={{ duration: 0.2, ease: "easeOut" }}
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

          <button 
            onClick={() => { DataManager.exportNoteAsTxt(note); onClose(); }}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl transition-colors text-white active:scale-98"
          >
            <Download size={20} className="text-white/60" />
            <span className="font-medium">Download (.txt)</span>
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
        onClick={() => {
          if (isSelectionMode) {
            handleNoteClick(note.id);
          }
        }}
        className={cn(
          "group relative flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer mx-4",
          isSelected 
            ? "bg-white/10" 
            : "hover:bg-white/5 active:bg-white/5",
          isSelectionMode && "select-none"
        )}
      >
        <div 
          className="flex-grow flex items-center gap-3 min-w-0"
          onClick={(e) => {
            if (!isSelectionMode) {
              handleNoteClick(note.id);
            }
          }}
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
              className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-100"
            >
              <MoreHorizontal size={18} className="text-white/40 group-hover:text-white" />
            </button>
          </div>
        )}

        {isSelectionMode && (
          <div className="w-10 h-10 flex items-center justify-center cursor-pointer -mr-2">
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
  const [listHeight, setListHeight] = useState(window.innerHeight - 350);
  const [searchQuery, setSearchQuery] = useState('');
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [tempName, setTempName] = useState('');
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
    if (name) {
      setUserName(name);
    } else {
      // New user detected
      setShowWelcomePopup(true);
    }
  }, []);

  const handleSaveName = async () => {
    if (tempName.trim()) {
      await DataManager.saveUserName(tempName.trim());
      setUserName(tempName.trim());
      setShowNamePopup(false);
    }
  };

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

  const handlePublish = useCallback(async (note: Note) => {
    try {
      const id = await DataManager.publishToSupabase(note);
      setPublishedId(id);
    } catch (e) {
      alert('Failed to publish: ' + e);
    }
  }, []);

  const handleImport = async (code: string) => {
    if (!code.trim()) return;
    setNotification({ message: 'Importing note...', type: 'info' });
    try {
      const note = await DataManager.importFromSupabase(code);
      setNotes(prev => [note, ...prev]);
      setSearchQuery('');
      setNotification({ message: 'Note imported successfully!', type: 'success' });
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
      setShowErrorModal(true);
      setNotification(null);
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleExportLogs = async () => {
    await DataManager.exportAuditLogs();
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayNotes = searchQuery ? filteredNotes : notes.slice(0, 4);


  return (
    <div className="min-h-screen bg-[#191919] text-white pb-32 overflow-x-hidden main-screen select-none">
      {/* Welcome Onboarding Popup */}
      <AnimatePresence>
        {showWelcomePopup && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[#1c1c1c] border border-white/10 p-8 rounded-[32px] w-full max-w-sm shadow-2xl text-center space-y-6"
            >
              <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center mx-auto">
                <Sparkles size={40} className="text-blue-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Welcome to RNAI Note</h2>
                <p className="text-blue-400 font-bold text-sm uppercase tracking-widest">Version 2.3</p>
              </div>
              <div className="space-y-4 text-white/70 text-sm leading-relaxed">
                <p>আপনাকে আমাদের <span className="text-white font-bold">2.3 ভার্সনে</span> স্বাগতম।</p>
                <p className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  এটি এখন <span className="text-amber-400 font-bold">বিটা মোডে বা টেস্টিং মোডে</span> রয়েছে। তাই অনেক বাগ গ্লিচেস থাকতে পারে।
                </p>
                <p>আপনি যদি কোনো বাগ বা গ্লিচেস খুঁজে পান বা কোনো এরর বা ইস্যু পান তখন কিন্তু সঙ্গে সঙ্গে আমাদের জানাতে পারেন।</p>
              </div>
              <button 
                onClick={() => {
                  setShowWelcomePopup(false);
                  setShowNamePopup(true);
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                শুরু করুন
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Name Input Popup */}
      <AnimatePresence>
        {showNamePopup && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[#1c1c1c] border border-white/10 p-8 rounded-[32px] w-full max-w-sm shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-white">আপনার নাম লিখুন</h2>
                <p className="text-white/40 text-xs">অ্যাপটি পার্সোনালাইজ করতে আপনার নাম প্রয়োজন।</p>
              </div>
              
              <div className="space-y-4">
                <input 
                  type="text"
                  placeholder="আপনার নাম..."
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all text-center font-bold text-lg"
                />
                <button 
                  onClick={handleSaveName}
                  disabled={!tempName.trim()}
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  সেভ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Published ID Modal */}
      <AnimatePresence>
        {publishedId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1c1c] border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <UploadCloud size={32} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Note Published!</h3>
              <p className="text-white/40 text-sm mb-6">Share this ID with others to let them import your note.</p>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 font-mono text-2xl tracking-widest font-bold text-blue-400">
                {publishedId}
              </div>

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(publishedId);
                  alert('ID copied to clipboard!');
                }}
                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold mb-3 transition-all"
              >
                Copy ID
              </button>
              <button 
                onClick={() => setPublishedId(null)}
                className="w-full py-3 bg-white text-black rounded-xl text-sm font-bold hover:bg-white/90 transition-all"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {showErrorModal && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1c1c] border border-red-500/20 p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <X size={32} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-red-400">Import Failed</h3>
              <p className="text-white/60 text-sm mb-8 leading-relaxed">
                {errorMessage.includes('Supabase credentials missing') 
                  ? 'Supabase URL and Anon Key are missing. Please set them in the Settings menu to enable cloud features.' 
                  : errorMessage}
              </p>
              
              <button 
                onClick={() => setShowErrorModal(false)}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/20"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
          <button 
            onClick={() => navigate('/import/import')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/60 hover:text-white"
            title="Import Note"
          >
            <UploadCloud size={20} />
          </button>
          <button 
            onClick={() => navigate('/ai/settings')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/60 hover:text-white"
            title="Settings"
          >
            <Settings size={22} />
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 80, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={cn(
              "fixed top-0 left-1/2 -translate-x-1/2 z-[130] px-4 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border",
              notification.type === 'success' ? "bg-green-500/20 text-green-400 border-green-500/30" :
              notification.type === 'error' ? "bg-red-500/20 text-red-400 border-red-500/30" :
              "bg-blue-500/20 text-blue-400 border-blue-500/30"
            )}
          >
            {notification.type === 'info' && <Loader2 size={14} className="animate-spin" />}
            {notification.type === 'success' && <Check size={14} />}
            {notification.type === 'error' && <X size={14} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 mt-6">
        {/* Top Cards Section */}
        {!isSelectionMode && (
          <div className="flex gap-3 mb-8">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.12)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => navigate('/templates')}
              className="flex-[4] bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors border-dashed"
            >
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Layout size={20} className="text-white/80" />
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="font-medium text-[15px] truncate">Templates</h3>
                <p className="text-[10px] text-white/40 truncate">Start from a pre-made page</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.9, backgroundColor: 'rgba(59,130,246,0.15)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => navigate('/ai/title-generator')}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors border-dashed"
            >
              <Sparkles size={20} className="text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-tighter text-white/60">Title AI</span>
            </motion.div>
          </div>
        )}

        {/* Search & Import Bar */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <input 
              type="text"
              placeholder="Search your notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-11 py-3 text-sm outline-none focus:border-white/20 transition-all"
            />
            <Plus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 rotate-45" />
          </div>
          
          {searchQuery.length >= 8 && !searchQuery.includes(' ') && (
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleImport(searchQuery)}
              className="w-full py-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-blue-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-600/30 transition-all"
            >
              <UploadCloud size={16} />
              Import Note with code "{searchQuery}"
            </motion.button>
          )}
        </div>

        {/* Private Section Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">
            {searchQuery ? 'Search Results' : 'Recent'}
          </h2>
          <div className="flex items-center gap-4">
            {!searchQuery && notes.length > 4 && (
              <span className="text-[10px] text-white/20 italic">Showing 4 of {notes.length}</span>
            )}
          </div>
        </div>

        {/* Notes List */}
        <div className="mt-2 flex-grow overflow-hidden">
          {displayNotes.length > 0 ? (
            <FixedSizeList
              height={listHeight}
              itemCount={displayNotes.length}
              itemSize={52}
              width="100%"
              className="no-scrollbar"
              itemData={{
                notes: displayNotes,
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
              {searchQuery ? 'No results found' : 'No notes found. Create one to get started!'}
            </div>
          )}
        </div>
      </div>

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
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-[100px] left-6 right-6 z-50 bg-[#222]/90 backdrop-blur-xl p-4 rounded-3xl flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
          >
            <div className="flex items-center gap-3 ml-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-blue-500/20">
                {selectedIds.length}
              </div>
              <span className="font-bold text-sm text-white/90">Selected</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={cancelSelection}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-white/60 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={deleteSelected}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 rounded-2xl text-xs font-bold text-white transition-all flex items-center gap-2 shadow-lg shadow-red-500/20 active:scale-95"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

