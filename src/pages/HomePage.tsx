import { useEffect, useState, useRef, memo, useCallback, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, ChevronRight, Trash2, X, Check, MoreHorizontal, 
  ChevronDown, Layout, Copy, Star, MoreVertical, 
  Sparkles, UploadCloud, Settings, Loader2, Edit2, 
  History, Search, Menu, Moon, Sun, Database, FileInput, Cloud, RefreshCw
} from 'lucide-react';
import { DataManager, Note, Workspace } from '../utils/DataManager';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '../components/Modal';
import Sidebar from '../components/Sidebar';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [userName, setUserName] = useState<string>('User');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [activeMenuNote, setActiveMenuNote] = useState<Note | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
  const [storageType, setStorageType] = useState<'local' | 'cloud'>('local');
  
  const navigate = useNavigate();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    const allNotes = await DataManager.getAllNotes();
    setNotes(allNotes.filter(n => !n.isTrashed).sort((a, b) => b.updatedAt - a.updatedAt));
    setTrashedNotes(allNotes.filter(n => n.isTrashed));
    
    const name = await DataManager.getUserName();
    if (name) setUserName(name);
    
    const ws = await DataManager.getWorkspaces();
    setWorkspaces(ws);
    const currentWsId = await DataManager.getCurrentWorkspaceId();
    setCurrentWorkspaceId(currentWsId);
    
    const tokens = await DataManager.getGoogleTokens();
    setIsCloudConnected(!!tokens);

    const prefs = await DataManager.getUserPreferences();
    setStorageType(prefs.storageType || 'local');
  }, []);

  useEffect(() => {
    loadData();
    const syncHandler = DataManager.onSync(loadData);
    
    const handleOpenExternal = () => {
      navigate('/ai/external-import');
    };
    
    const handleOpenCloud = () => {
      navigate('/inbox');
    };

    window.addEventListener('open-external-import', handleOpenExternal);
    window.addEventListener('open-cloud-import', handleOpenCloud);

    return () => {
      DataManager.offSync(syncHandler);
      window.removeEventListener('open-external-import', handleOpenExternal);
      window.removeEventListener('open-cloud-import', handleOpenCloud);
    };
  }, [loadData, navigate]);

  const handleSyncCloud = async () => {
    if (!isCloudConnected) {
      navigate('/ai/settings');
      return;
    }
    setIsSyncing(true);
    setNotification({ message: 'তথ্য সমন্বয় হচ্ছে...', type: 'info' });
    try {
      await DataManager.syncAllWithCloud();
      setNotification({ message: 'সফলভাবে সম্পন্ন হয়েছে!', type: 'success' });
      loadData();
      setTimeout(() => setNotification(null), 3000);
    } catch (e: any) {
      setNotification({ message: 'ব্যর্থ হয়েছে (পুনরায় চেষ্টা করুন)', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetrySync = async () => {
    setIsSyncing(true);
    setNotification({ message: 'পুনরায় চেষ্টা করা হচ্ছে...', type: 'info' });
    try {
      await DataManager.syncAllWithCloud();
      setNotification({ message: 'সফল হয়েছে!', type: 'success' });
      loadData();
      setTimeout(() => setNotification(null), 3000);
    } catch (e: any) {
      setNotification({ message: 'আবারও ব্যর্থ হয়েছে', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    const note = await DataManager.getNoteById(id);
    if (note) {
      await DataManager.saveNote({ ...note, isTrashed: true, updatedAt: Date.now() });
      loadData();
    }
  };

  const recoverNote = async (id: string) => {
    const note = await DataManager.getNoteById(id);
    if (note) {
      await DataManager.saveNote({ ...note, isTrashed: false, updatedAt: Date.now() });
      loadData();
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
    };
    await DataManager.saveNote(newNote);
    navigate(`/editor/${newNote.id}`);
  }, [navigate]);

  const handleNoteClick = (id: string) => {
    if (isSelectionMode) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      navigate(`/editor/${id}`);
    }
  };

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedIds([id]);
    }, 400);
  };

  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const displayNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-48 overflow-x-hidden main-screen select-none">
      <Sidebar 
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onOpenTrash={() => setShowTrash(true)}
        onOpenSettings={() => navigate('/ai/settings')}
        onSync={handleSyncCloud}
        isCloudConnected={isCloudConnected}
      />

      <Modal isOpen={showTrash} onClose={() => setShowTrash(false)} title="Recycle Bin (পুনরুদ্ধার বাক্স)" id="trash-modal">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pb-10">
          {trashedNotes.length > 0 ? trashedNotes.map(n => (
            <div key={n.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <span className="text-xl">{n.emoji}</span>
                <span className="font-bold text-sm truncate">{n.title || 'Untitled'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => recoverNote(n.id)} className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-xl font-bold text-[10px] uppercase tracking-wider">Restore</button>
                <button onClick={async () => { if (confirm('Delete permanently?')) { await DataManager.deleteNote(n.id); loadData(); } }} className="p-2 bg-red-500/10 text-red-500 rounded-xl"><Trash2 size={16} /></button>
              </div>
            </div>
          )) : <div className="py-12 text-center text-white/20 italic text-sm">Trash is empty</div>}
        </div>
      </Modal>

      <div className="px-4 pt-6 pb-4 flex items-center justify-between sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-30 border-b border-white/[0.03]">
        <div className="flex flex-col">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-0.5">Records</div>
          <div className="text-xl font-black uppercase tracking-tight text-white">জার্নাল</div>
        </div>
        <div className="flex items-center gap-2">
          {storageType === 'cloud' && (
            <>
              <button 
                onClick={handleSyncCloud}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Cloud size={14} />}
                <span>তথ্য সমন্বয়</span>
              </button>
              <button 
                onClick={handleRetrySync}
                disabled={isSyncing}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white disabled:opacity-50"
                title="পুনরায় চেষ্টা করুন"
              >
                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
              </button>
            </>
          )}
          <button 
            onClick={() => setShowSidebar(true)}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white/80 active:scale-95"
          >
            সেটিংস প্যানেল
          </button>
        </div>
      </div>

      <div className="px-4 mt-8 mb-10">
        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/20 group-focus-within:text-blue-500 transition-colors"><Search size={22} /></div>
          <input 
            type="text" placeholder="Search your notes... (অনুসন্ধান করুন)" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.05] rounded-[28px] pl-14 pr-14 py-5 text-lg text-white outline-none focus:bg-white/[0.05] focus:border-blue-500/30 transition-all font-medium"
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-5 text-white/20 hover:text-white"><X size={22} /></button>}
        </div>
      </div>

      {!isSelectionMode && !searchQuery && (
        <div className="px-4 flex gap-4 mb-10">
           <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/templates')} className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-3xl p-5 flex flex-col gap-3">
             <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center"><Plus size={20} className="text-blue-400" /></div>
             <div className="text-left"><div className="font-bold text-sm">Templates</div><div className="text-[10px] text-white/40">Ready formats</div></div>
           </motion.button>
           <motion.button whileTap={{ scale: 0.95 }} onClick={createNewNote} className="flex-1 bg-blue-500 shadow-xl shadow-blue-500/20 rounded-3xl p-5 flex flex-col gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center"><Edit2 size={20} className="text-white" /></div>
             <div className="text-left"><div className="font-bold text-sm">Quick Write</div><div className="text-[10px] text-white/60">Start typing now</div></div>
           </motion.button>
        </div>
      )}

      <div className="px-4">
        <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-6 px-1">{searchQuery ? 'Search Results' : 'Recent Collections'}</h2>
        <div className="space-y-4">
          {displayNotes.map(note => (
            <div key={note.id} className="relative">
               <div 
                onClick={() => handleNoteClick(note.id)} onMouseDown={() => startLongPress(note.id)} onMouseUp={endLongPress} onMouseLeave={endLongPress}
                className={cn("group flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.03] rounded-3xl transition-all hover:bg-white/[0.05]", selectedIds.includes(note.id) && "bg-blue-500/10 border-blue-500/30")}
               >
                 <div className="flex items-center gap-4 min-w-0 pr-4">
                    <div className="w-12 h-12 bg-white/[0.03] rounded-2xl flex items-center justify-center text-2xl shadow-inner">{note.emoji}</div>
                    <div className="min-w-0"><h3 className="font-bold text-white/80 truncate text-[15px]">{note.title || 'Untitled Thought'}</h3><p className="text-[10px] font-medium text-white/20 uppercase tracking-widest mt-1">{new Date(note.updatedAt).toLocaleDateString()}</p></div>
                 </div>
                 <button onClick={(e) => { e.stopPropagation(); setActiveMenuNote(note); }} className="p-3 text-white/20 hover:text-white transition-all">
                   <Menu size={18} />
                 </button>
               </div>
               {selectedIds.includes(note.id) && <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center"><Check size={12} className="text-white font-bold" /></div>}
            </div>
          ))}
          {displayNotes.length === 0 && <div className="py-20 text-center text-white/10 italic">No notes found</div>}
        </div>
      </div>

      {/* Note Action Menu (Bottom Sheet) */}
      <AnimatePresence>
        {activeMenuNote && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveMenuNote(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" 
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-[#161616] border-t border-white/10 rounded-t-[32px] p-8 z-[101] shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">{activeMenuNote.emoji}</div>
                <div>
                  <h3 className="font-bold text-lg">{activeMenuNote.title || 'Untitled Thought'}</h3>
                  <p className="text-xs text-white/40 font-medium">Last updated: {new Date(activeMenuNote.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => { navigate(`/editor/${activeMenuNote.id}`); setActiveMenuNote(null); }}
                  className="w-full flex items-center gap-4 p-5 hover:bg-white/5 rounded-2xl transition-colors text-white/80 active:scale-98"
                >
                  <Edit2 size={20} className="text-blue-400" />
                  <span className="font-bold">Edit Note (পরিমার্জন করুন)</span>
                </button>
                <button 
                  onClick={async () => { 
                    const note = await DataManager.getNoteById(activeMenuNote.id);
                    if (note) {
                      await DataManager.saveNote({ ...note, id: crypto.randomUUID(), title: (note.title || 'Untitled') + ' (Copy)', updatedAt: Date.now() });
                      loadData();
                    }
                    setActiveMenuNote(null);
                  }}
                  className="w-full flex items-center gap-4 p-5 hover:bg-white/5 rounded-2xl transition-colors text-white/80 active:scale-98"
                >
                  <Copy size={20} className="text-purple-400" />
                  <span className="font-bold">Make a Copy (অনুলিপি করুন)</span>
                </button>
                <button 
                  onClick={() => { handleSoftDelete(activeMenuNote.id); setActiveMenuNote(null); }}
                  className="w-full flex items-center gap-4 p-5 hover:bg-red-500/10 rounded-2xl transition-colors text-red-500 active:scale-98"
                >
                  <Trash2 size={20} />
                  <span className="font-bold">Delete Note (মুছে ফেলুন)</span>
                </button>
              </div>
              <button 
                onClick={() => setActiveMenuNote(null)}
                className="w-full mt-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all text-white/60"
              >
                Close (বন্ধ করুন)
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSelectionMode && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-[100px] left-6 right-6 z-50 bg-[#222]/90 backdrop-blur-xl p-4 rounded-3xl flex justify-between items-center border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3 ml-2"><div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black">{selectedIds.length}</div><span className="font-bold text-sm">Selected</span></div>
            <div className="flex gap-2">
              <button onClick={() => setIsSelectionMode(false)} className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold transition-all">Cancel</button>
              <button onClick={async () => { if (confirm('Move selected to trash?')) { for (const id of selectedIds) await handleSoftDelete(id); setSelectedIds([]); setIsSelectionMode(false); } }} className="px-4 py-2 bg-red-500 rounded-xl text-xs font-bold shadow-lg shadow-red-500/20">Delete</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
