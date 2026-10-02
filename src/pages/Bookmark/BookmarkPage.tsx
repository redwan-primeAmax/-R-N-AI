import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  FolderPlus, ChevronRight, Bookmark, 
  FileText, Trash2, Folder, 
  ArrowLeft, Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import { DataManager, Note } from '../../services/storage/DataManager';
import { PageIcon } from '../../components/PageIcon';
import { BookmarkFolder } from '../../types';
import LoadingScreen from '../../components/LoadingScreen';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';
import { Modal } from '../../components/modals/Modal';
import { cn } from '../../utils/cn';

export default function BookmarkPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolderId = searchParams.get('folder') || undefined;

  const moveNoteId = location.state?.moveNoteId as string | undefined;

  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentFolder, setCurrentFolder] = useState<BookmarkFolder | null>(null);
  const [parentFolder, setParentFolder] = useState<BookmarkFolder | null>(null);
  const [selectedFolderForMove, setSelectedFolderForMove] = useState<string | null>(currentFolderId || null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<BookmarkFolder | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allFolders = await DataManager.getBookmarkFolders();
      const allNotes = await DataManager.getAllNotes();
      
      const currentFs = allFolders.filter(f => f.parentId === currentFolderId);
      const currentNs = allNotes.filter(n => n.isBookmarked && n.bookmarkFolderId === currentFolderId);
      
      const current = allFolders.find(f => f.id === currentFolderId) || null;
      const parent = current?.parentId ? (allFolders.find(f => f.id === current.parentId) || null) : null;
      
      setFolders(currentFs);
      setNotes(currentNs);
      setCurrentFolder(current);
      setParentFolder(parent);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    loadData();
    window.addEventListener('workspace-notes-changed', loadData);
    return () => window.removeEventListener('workspace-notes-changed', loadData);
  }, [loadData]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await DataManager.createBookmarkFolder(newFolderName, currentFolderId);
    setNewFolderName('');
    setShowCreateModal(false);
    loadData();
  };

  const handleDeleteFolder = async () => {
    if (folderToDelete) {
      await DataManager.deleteBookmarkFolder(folderToDelete.id);
      setFolderToDelete(null);
      loadData();
    }
  };

  const handleFolderClick = (id: string) => {
    if (moveNoteId) {
      setSelectedFolderForMove(id);
    }
    setSearchParams({ folder: id });
  };

  const handleFinalizeMove = async () => {
    if (!moveNoteId) return;
    try {
      const noteToMove = await DataManager.getNoteById(moveNoteId);
      if (noteToMove) {
        const targetFolder = selectedFolderForMove || currentFolderId;
        const updated = { ...noteToMove, isBookmarked: true, bookmarkFolderId: targetFolder, updatedAt: Date.now() };
        await DataManager.saveNote(updated);
        window.dispatchEvent(new CustomEvent('app-notification', {
          detail: { message: 'নোটটি ফোল্ডারে সরানো হয়েছে (Note moved successfully)', type: 'success' }
        }));
      }
    } catch (err) {
      console.error('Failed to move note:', err);
    } finally {
      navigate(`/editor/${moveNoteId}`, { replace: true });
    }
  };

  const goBack = () => {
    if (parentFolder) {
      setSearchParams({ folder: parentFolder.id });
    } else if (currentFolderId) {
      setSearchParams({});
    } else {
      navigate('/main');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-white pb-36 select-none relative">
      {isLoading && <LoadingScreen />}

      {/* Header */}
      <div className="sticky top-0 z-50 bg-[var(--bg-main)]/80 backdrop-blur-3xl border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={goBack}
              className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/5 transition-all active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Bookmark size={20} className="text-blue-500" />
                {currentFolder ? currentFolder.name : 'বুকমার্ক / ফোল্ডার'}
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
                {moveNoteId ? 'স্থানান্তরের জন্য ফোল্ডার বেছে নিন' : (currentFolder ? 'ফোল্ডার ভিউ' : 'রুট ডিরেক্টরি')}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-90 transition-all"
          >
            <FolderPlus size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Folders Section */}
        {folders.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black mb-4 flex items-center gap-2">
              <Folder size={12} /> ফোল্ডারসমূহ ({folders.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {folders.map(folder => {
                const isSelected = selectedFolderForMove === folder.id;
                return (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative"
                  >
                    <div 
                      onClick={() => handleFolderClick(folder.id)}
                      className={cn(
                        "flex items-center justify-between p-5 border rounded-3xl transition-all cursor-pointer active:scale-[0.98]",
                        isSelected 
                          ? "bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/10" 
                          : "bg-[#151516] border-white/5 hover:bg-[#1a1a1b] hover:border-blue-500/30"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                          isSelected ? "bg-blue-500 text-white" : "bg-blue-500/10 text-blue-400"
                        )}>
                          <Folder size={24} fill="currentColor" fillOpacity={0.1} />
                        </div>
                        <span className="font-bold text-[15px] truncate max-w-[150px]">{folder.name}</span>
                      </div>
                      <ChevronRight size={18} className="text-white/20 group-hover:text-blue-500 transition-colors" />
                    </div>
                    {!moveNoteId && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderToDelete(folder);
                        }}
                        className="absolute -top-1 -right-1 w-7 h-7 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black mb-4 flex items-center gap-2">
             <FileText size={12} /> নোটসমূহ ({notes.length})
          </h2>
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map(note => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => navigate(`/editor/${note.id}`)}
                  className="p-5 bg-[#151516] border border-white/5 rounded-3xl flex items-center gap-4 hover:border-white/10 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="w-12 h-12 bg-white/[0.03] rounded-2xl flex items-center justify-center shrink-0">
                    {note.emoji ? (
                      <PageIcon emoji={note.emoji} className="text-2xl" fallback="📄" />
                    ) : (
                      <FileText size={20} className="text-white/20" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[15px] truncate">{note.title || 'শিরোনামহীন চিন্তা'}</h3>
                    <p className="text-[11px] text-white/20 font-medium truncate mt-0.5">
                      {note.content ? note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) : 'কোনো বর্ণনা নেই'}
                    </p>
                  </div>
                  {!moveNoteId && (
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        await DataManager.removeNoteFromBookmark(note.id);
                        loadData();
                      }}
                      className="p-2 text-white/10 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-white/5 border border-dashed border-white/5 rounded-3xl">
              <Bookmark size={48} className="mb-4 opacity-5 rotate-12" />
              <p className="font-bold italic text-sm">কোনো বুকমার্ক পাওয়া যায়নি</p>
            </div>
          )}
        </div>
      </div>

      {/* Step 8 Move To Bottom Floating Done Bar */}
      {moveNoteId && (
        <div className="fixed bottom-6 left-6 right-6 z-[200] max-w-xl mx-auto bg-[#18181b] border border-blue-500/30 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-white">ফোল্ডার নির্বাচন করুন (Move To)</span>
            <span className="text-[10px] text-white/40 truncate">
              {currentFolder ? `টার্গেট: ${currentFolder.name}` : 'টার্গেট: রুট বুকমার্ক'}
            </span>
          </div>
          <button 
            onClick={handleFinalizeMove}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/30 shrink-0"
          >
            <Check size={16} strokeWidth={3} />
            <span>সম্পন্ন (Done)</span>
          </button>
        </div>
      )}

      {/* Create Folder Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="নতুন ফোল্ডার তৈরি করুন"
      >
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">ফোল্ডারের নাম</label>
            <input 
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="যেমন: পড়াশোনা, প্রজেক্ট..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500/50 transition-all font-bold text-white placeholder:text-white/10"
            />
          </div>
          <button 
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
            className="w-full py-4 bg-blue-600 disabled:opacity-50 disabled:bg-white/10 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            তৈরি করুন
          </button>
        </div>
      </Modal>

      <ConfirmDialog 
        isOpen={!!folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={handleDeleteFolder}
        title="ফোল্ডার মুছুন"
        message={`আপনি কি "${folderToDelete?.name}" ফোল্ডারটি মুছে ফেলতে চান? এর ভেতরের সব সাব-ফোল্ডার এবং নোটের লিংক মুছে যাবে।`}
        variant="danger"
        confirmText="হ্যাঁ, মুছুন"
      />
    </div>
  );
}
