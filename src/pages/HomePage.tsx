/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef, memo, useCallback, forwardRef } from 'react';
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
  Loader2,
  Edit2,
  History,
  Search
} from 'lucide-react';
import { DataManager, Note, Workspace } from '../utils/DataManager';
import { motion, AnimatePresence } from 'motion/react';
import { FixedSizeList } from 'react-window';
import { Modal } from '../components/Modal';

// Memoized Context Menu to prevent unnecessary re-renders
const NoteContextMenu = memo(forwardRef<HTMLDivElement, { 
  note: Note; 
  onClose: () => void;
  onDuplicate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}>(({ 
  note, 
  onClose, 
  onDuplicate, 
  onToggleFavorite, 
  onDelete
}, ref) => {
  return (
    <Modal ref={ref} isOpen={true} onClose={onClose} position="bottom" showCloseButton={false} id="note-context-menu">
      <div className="flex items-center gap-4 mb-8 px-2">
        <div className="text-3xl">{note.emoji}</div>
        <div className="min-w-0">
          <h3 className="text-white font-bold truncate text-xl tracking-tight">{note.title || 'Untitled'}</h3>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Last edited {new Date(note.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="space-y-1 pb-12">
        <button 
          onClick={() => { onDuplicate(note.id); onClose(); }}
          className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl transition-colors text-white active:scale-98"
          aria-label="Duplicate Note"
        >
          <Copy size={20} className="text-white/60" />
          <span className="font-medium">Duplicate</span>
        </button>
        
        <button 
          onClick={() => { onToggleFavorite(note.id); onClose(); }}
          className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl transition-colors text-white active:scale-98"
          aria-label={note.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Star size={20} className={note.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-white/60"} />
          <span className="font-medium">{note.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
        </button>

        <button 
          onClick={() => { 
             window.dispatchEvent(new CustomEvent('open-version-control', { detail: { noteId: note.id } }));
             onClose(); 
          }}
          className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl transition-colors text-white active:scale-98"
          aria-label="Version History"
        >
          <History size={20} className="text-white/60" />
          <span className="font-medium">Version History</span>
        </button>

        <button 
          onClick={() => { DataManager.exportNoteAsTxt(note); onClose(); }}
          className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl transition-colors text-white active:scale-98"
          aria-label="Download as .txt"
        >
          <Download size={20} className="text-white/60" />
          <span className="font-medium">Download (.txt)</span>
        </button>

        <div className="h-px bg-white/5 my-2 mx-4" />

        <button 
          onClick={() => { onDelete(note.id); onClose(); }}
          className="w-full flex items-center gap-4 px-4 py-4 hover:bg-red-500/10 rounded-2xl transition-colors text-red-500 active:scale-98"
          aria-label="Delete Note"
        >
          <Trash2 size={20} className="text-red-500" />
          <span className="font-medium">Delete</span>
        </button>
      </div>
    </Modal>
  );
}));

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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [activeMenuNote, setActiveMenuNote] = useState<Note | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [listHeight, setListHeight] = useState(window.innerHeight - 380);
  const [searchQuery, setSearchQuery] = useState('');
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [tempName, setTempName] = useState('');
  const navigate = useNavigate();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    
    const handleResize = () => {
      // Adjusted to account for floating navigation bar and bottom padding
      setListHeight(window.innerHeight - 380);
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
    }
    
    const ws = await DataManager.getWorkspaces();
    setWorkspaces(ws);
    const currentWsId = await DataManager.getCurrentWorkspaceId();
    setCurrentWorkspaceId(currentWsId);
  }, []);

  const handleSwitchWorkspace = async (id: string) => {
    await DataManager.setCurrentWorkspaceId(id);
    setCurrentWorkspaceId(id);
    setShowWorkspaceMenu(false);
    loadData();
  };

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
    }, 400); // Reduced from 600ms to 400ms for responsiveness
  }, []);

  const endLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }, []);

  // Modal Scroll Lock
  useEffect(() => {
    const shouldLock = showWorkspaceMenu || activeMenuNote || publishedId || showErrorModal || showNamePopup || showWelcomePopup;
    if (shouldLock) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showWorkspaceMenu, activeMenuNote, publishedId, showErrorModal, showNamePopup, showWelcomePopup]);

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
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-48 overflow-x-hidden main-screen select-none">
      {/* Published ID Modal */}
      <Modal isOpen={!!publishedId} onClose={() => setPublishedId(null)} id="published-id-modal">
        <div className="text-center">
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
              navigator.clipboard.writeText(publishedId || '');
              alert('ID copied to clipboard!');
            }}
            className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold mb-3 transition-all"
            aria-label="Copy ID to clipboard"
          >
            Copy ID
          </button>
          <button 
            onClick={() => setPublishedId(null)}
            className="w-full py-3 bg-white text-black rounded-xl text-sm font-bold hover:bg-white/90 transition-all"
            aria-label="Done"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)} id="error-modal">
        <div className="text-center">
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
            aria-label="Close error message"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Workspace Menu Modal */}
      <Modal 
        isOpen={showWorkspaceMenu} 
        onClose={() => setShowWorkspaceMenu(false)} 
        title="Workspaces (কাজের ক্ষেত্রসমূহ)" 
        maxWidth="max-w-md"
        id="workspace-menu-modal"
      >
        <div className="space-y-4">
          <p className="text-xs text-white/40 -mt-2 mb-4">Your workspaces are listed here (আপনার সকল কাজের ক্ষেত্র এখানে পাবেন)</p>
          
          <div className="max-h-[60vh] overflow-y-auto no-scrollbar space-y-2">
            {workspaces.map(ws => (
              <div key={ws.id} className="group relative">
                {isRenaming === ws.id ? (
                  <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
                    <input 
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      className="flex-1 bg-transparent border-none outline-none px-3 py-1 text-sm font-medium"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && renameValue.trim()) {
                          const updated = { ...ws, name: renameValue.trim() };
                          await DataManager.saveWorkspace(updated);
                          setWorkspaces(prev => prev.map(w => w.id === ws.id ? updated : w));
                          setIsRenaming(null);
                        } else if (e.key === 'Escape') {
                          setIsRenaming(null);
                        }
                      }}
                      title="Workspace Name"
                    />
                    <button 
                      onClick={async () => {
                        if (renameValue.trim()) {
                          const updated = { ...ws, name: renameValue.trim() };
                          await DataManager.saveWorkspace(updated);
                          setWorkspaces(prev => prev.map(w => w.id === ws.id ? updated : w));
                          setIsRenaming(null);
                        }
                      }}
                      className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"
                      aria-label="Confirm Rename"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                ) : (
                  <div className={cn(
                    "flex items-center justify-between px-5 py-4 rounded-[24px] transition-all border border-transparent shadow-sm",
                    ws.id === currentWorkspaceId 
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20 border-blue-400" 
                      : "bg-white/5 hover:bg-white/10 text-white/60 border-white/5"
                  )}>
                    <button 
                      onClick={() => {
                        handleSwitchWorkspace(ws.id);
                        setShowWorkspaceMenu(false);
                      }}
                      className="flex-1 text-left font-bold truncate pr-4 text-sm tracking-tight"
                      title={ws.name}
                    >
                      {ws.name}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
                      <button 
                        onClick={() => {
                          setIsRenaming(ws.id);
                          setRenameValue(ws.name);
                        }}
                        className={cn(
                          "p-2 rounded-xl transition-colors",
                          ws.id === currentWorkspaceId ? "hover:bg-white/20 text-white" : "hover:bg-white/10 text-white/40"
                        )}
                        aria-label="Rename Workspace"
                      >
                        <Edit2 size={14} />
                      </button>
                      {workspaces.length > 1 && (
                        <button 
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this workspace?')) {
                              await DataManager.deleteWorkspace(ws.id);
                              const updated = await DataManager.getWorkspaces();
                              setWorkspaces(updated);
                              const newId = await DataManager.getCurrentWorkspaceId();
                              setCurrentWorkspaceId(newId);
                            }
                          }}
                          className={cn(
                            "p-2 rounded-xl transition-colors",
                            ws.id === currentWorkspaceId ? "hover:bg-red-400/20 text-white" : "hover:bg-red-500/10 text-red-500"
                          )}
                          aria-label="Delete Workspace"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {workspaces.length < 5 && (
            <div className="pt-2">
              <button 
                onClick={async () => {
                  const nextNum = workspaces.length + 1;
                  const newWs = { 
                    id: crypto.randomUUID(), 
                    name: `Workspace ${nextNum}`,
                    createdAt: Date.now()
                  };
                  await DataManager.saveWorkspace(newWs);
                  const updated = await DataManager.getWorkspaces();
                  setWorkspaces(updated);
                  setIsRenaming(newWs.id);
                  setRenameValue(newWs.name);
                }}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                aria-label="Create New Workspace"
              >
                <Plus size={16} />
                Create New Workspace (নতুন কাজের ক্ষেত্র)
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Top Bar */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between sticky top-0 bg-[#191919]/90 backdrop-blur-xl z-30 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="flex items-center gap-1 text-sm font-bold text-white/90 hover:text-white transition-colors"
            >
              {workspaces.find(w => w.id === currentWorkspaceId)?.name || 'Workspace'}
              <ChevronDown size={14} className={cn("text-white/40 transition-transform", showWorkspaceMenu && "rotate-180")} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/ai/external-import')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-blue-400 hover:text-blue-300"
            title="External AI Import"
          >
            <Sparkles size={20} />
          </button>
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
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/templates')}
              className="flex-[4] bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all border-dashed"
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
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/ai/title-generator')}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border-dashed"
            >
              <Sparkles size={20} className="text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-tighter text-white/60">Title AI</span>
            </motion.div>
          </div>
        )}

        {/* Search & Import Bar */}
        <div className="mb-6 space-y-3">
          <div className="relative flex-grow">
            <input 
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-white/5 rounded-2xl px-12 py-3.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/10 transition-all font-medium"
            />
            <button 
              onClick={() => searchQuery ? setSearchQuery('') : null}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 transition-all p-1 rounded-lg",
                searchQuery ? "text-blue-500 bg-blue-500/10 rotate-0" : "text-white/20 rotate-45"
              )}
            >
              {searchQuery ? <X size={18} /> : <Search size={18} />}
            </button>
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
        <div className="mt-2 flex-grow overflow-hidden pb-32">
          {displayNotes.length > 0 ? (
            <FixedSizeList
              height={listHeight}
              itemCount={displayNotes.length}
              itemSize={60}
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

