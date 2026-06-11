import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, RotateCcw, X, ArrowLeft, 
  Trash, ChevronLeft, Loader2, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager, Note } from '../../services/storage/DataManager';
import LoadingScreen from '../../components/LoadingScreen';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';

export default function RecycleBin() {
  const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
  const [displayedNotes, setDisplayedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const navigate = useNavigate();

  const loadTrashed = useCallback(async () => {
    setIsLoading(true);
    const notes = await DataManager.getAllNotes();
    const trashed = notes.filter(n => n.isTrashed);
    setTrashedNotes(trashed);
    setDisplayedNotes(trashed.slice(0, ITEMS_PER_PAGE));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const onInvalidated = () => loadTrashed();
    window.addEventListener('notes-cache-invalidated', onInvalidated);
    window.addEventListener('workspace-notes-changed', onInvalidated);
    return () => {
      window.removeEventListener('notes-cache-invalidated', onInvalidated);
      window.removeEventListener('workspace-notes-changed', onInvalidated);
    };
  }, [loadTrashed]);

  const loadMore = () => {
    const nextPage = page + 1;
    const nextNotes = trashedNotes.slice(0, nextPage * ITEMS_PER_PAGE);
    setDisplayedNotes(nextNotes);
    setPage(nextPage);
  };

  useEffect(() => {
    loadTrashed();
  }, [loadTrashed]);

  const handleRestore = async (id: string) => {
    const note = trashedNotes.find(n => n.id === id);
    if (note) {
      await DataManager.saveNote({ ...note, isTrashed: false, updatedAt: Date.now() });
      loadTrashed();
    }
  };

  const handlePermanentDelete = async () => {
    if (!noteToDelete) return;
    await DataManager.deleteNotePermanent(noteToDelete);
    const deletedId = noteToDelete;
    setNoteToDelete(null);
    
    // Extra strong refresh
    await DataManager.getAllNotes(true); // force a clean load
    if (deletedId === 'welcome-note') {
       console.warn('[RecycleBin] V2: Welcome note was permanently deleted by user. It will not auto-reappear.');
    }
    loadTrashed();                       // your existing
  };

  const handleEmptyTrash = async () => {
    setIsLoading(true);
    try {
      const ids = trashedNotes.map(n => n.id);
      const hasWelcome = ids.includes('welcome-note');
      await DataManager.bulkDeleteNotesPermanent(ids);
      await DataManager.getAllNotes(true);
      if (hasWelcome) {
        console.warn('[RecycleBin] V2: Welcome note was permanently deleted during bulk empty. It will not auto-reappear.');
      }
    } catch (err) {
      console.error('Failed to empty trash:', err);
    } finally {
      setShowEmptyConfirm(false);
      loadTrashed();
    }
  };

  const handleBack = () => {
    navigate('/main');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
      className="fixed inset-0 bg-[#0A0A0B] z-[1000] flex flex-col pt-12"
    >
      {isLoading && <LoadingScreen />}
      <header className="px-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-white/60"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tighter">পুনরুদ্ধার বাক্স</h1>
            <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] mt-1">Recycle Bin</p>
          </div>
        </div>

        {trashedNotes.length > 0 && (
          <button 
            onClick={() => setShowEmptyConfirm(true)}
            className="flex items-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Trash size={14} />
            সব মুছুন
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 grayscale opacity-20">
            <Loader2 size={40} className="animate-spin mb-4" />
            <p className="font-bold">লোড হচ্ছে...</p>
          </div>
        ) : trashedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] opacity-20">
            <Trash2 size={80} className="mb-6" />
            <h2 className="text-xl font-bold italic">বক্সটি খালি!</h2>
            <p className="text-sm mb-8">মুছে ফেলা নোটগুলো এখানে জমা হবে</p>
            <button 
              onClick={async () => {
                await DataManager.createDemoData();
                loadTrashed();
              }}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all opacity-100"
            >
              টেস্ট ডেটা যোগ করুন
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedNotes.map(note => (
                <motion.div 
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-white/5 border border-white/5 rounded-[32px] group hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-3xl">{note.emoji || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white/90 truncate capitalize">{note.title || 'Untitled'}</h3>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button 
                      onClick={() => handleRestore(note.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500/10 hover:bg-blue-500 rounded-xl text-blue-400 hover:text-white text-xs font-bold transition-all"
                    >
                      <RotateCcw size={14} /> পুনরুদ্ধার
                    </button>
                    <button 
                      onClick={() => setNoteToDelete(note.id)}
                      className="p-3 bg-red-500/10 hover:bg-red-500 rounded-xl text-red-500 hover:text-white transition-all"
                      title="Delete Permanently"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {displayedNotes.length < trashedNotes.length && (
              <div className="flex justify-center pb-20">
                <button 
                  onClick={loadMore}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95"
                >
                  আরো লোড করুন ({trashedNotes.length - displayedNotes.length} টি বাকি)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full px-6 max-w-lg">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-[40px] flex items-center gap-4 shadow-2xl">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500">
            <AlertCircle size={20} />
          </div>
          <p className="text-xs text-white/40 leading-tight">
            মুছে ফেলা নোটগুলো এখানে ৩০ দিন পর্যন্ত থাকে। এর পরে সেগুলো স্বয়ংক্রিয়ভাবে চিরতরে মুছে যাবে।
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={noteToDelete !== null}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handlePermanentDelete}
        title="চিরতরে মুছুন"
        message="এই নোটটি চিরতরে মুছে যাবে। আপনি কি নিশ্চিত?"
        variant="danger"
        confirmText="হ্যাঁ, ডিলেট করুন"
        cancelText="বাতিল"
      />

      <ConfirmDialog
        isOpen={showEmptyConfirm}
        onClose={() => setShowEmptyConfirm(false)}
        onConfirm={handleEmptyTrash}
        title="রিসাইকেল বিন খালি করুন"
        message="সব নোট চিরতরে মুছে যাবে। আপনি কি নিশ্চিত?"
        variant="danger"
        confirmText="হ্যাঁ, সব মুছুন"
        cancelText="বাতিল"
      />
    </motion.div>
  );
}
