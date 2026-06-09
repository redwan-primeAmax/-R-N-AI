/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronUp } from 'lucide-react';
import { DataManager, Note, Workspace } from '../../services/storage/DataManager';
import { HistoryManager, RecentNote } from '../../services/storage/HistoryManager';
import { motion, AnimatePresence } from 'framer-motion';
import { operationRunner } from '../../services/storage/OperationRunner';

import Sidebar from '../../components/Sidebar';
import LoadingScreen from '../../components/LoadingScreen';
import AnimatedDivider from '../../components/AnimatedDivider';
import { HomeHeader } from './components/HomeHeader';
import { RecentNotes } from './components/RecentNotes';
import { NoteCard } from './components/NoteCard';
import { ActionMenu } from './components/ActionMenu';
import { SelectionBar } from './components/SelectionBar';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';
import { JoinCollabModal } from '../../components/modals/JoinCollabModal';

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showJoinCollabModal, setShowJoinCollabModal] = useState(false);
  const [activeTasksCount, setActiveTasksCount] = useState(0);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNoteForMenu, setSelectedNoteForMenu] = useState<Note | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Custom states for 100-star Progressive Chunk Loading to handle scale perfectly
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [historyNotes, setHistoryNotes] = useState<RecentNote[]>([]);
  const observerTarget = useRef<HTMLDivElement | null>(null);
  
  const navigate = useNavigate();
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0];

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeWsId = await DataManager.getActiveWorkspaceId();
      const allNotes = await DataManager.getAllNotes();
      setCurrentWorkspaceId(activeWsId);

      const workspaceNotes = allNotes.filter(n => (n.workspaceId === activeWsId || (activeWsId === 'default' && !n.workspaceId)));
      
      const filtered = workspaceNotes.filter((n: Note) => !n.isTrashed && !n.isLocked && !n.parentId);
      
      setNotes(filtered.sort((a: Note, b: Note) => b.updatedAt - a.updatedAt));

      setVisibleCount(10); // Reset visible slice size on data loads to 10 for high-performance lazy loading
      
      const ws = await DataManager.getWorkspaces();
      setWorkspaces(ws);

      const recentHistory = await HistoryManager.getRecentNotes();
      setHistoryNotes(recentHistory);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Scroll position listener for ScrollToTop button
  useEffect(() => {
    const handleScroll = () => {
      // Threshold: Header (~80px) + RecentNotes (~200px) + 3 cards (~450px) = ~730px
      if (window.scrollY > 450) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Performance-optimised Intersection Observer to dynamically stream note cards only as needed
  useEffect(() => {
    if (!observerTarget.current) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => Math.min(prev + 10, notes.length));
      }
    }, {
      threshold: 0.1,
      rootMargin: '200px' // Fetch ahead to make scrolling completely imperceptible and butter smooth
    });
    
    const currentSentinel = observerTarget.current;
    observer.observe(currentSentinel);
    
    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [notes.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsub = operationRunner.subscribe(() => {
      setActiveTasksCount(operationRunner.getActiveTasksCount());
    });
    return unsub;
  }, []);

  useEffect(() => {
    loadData();
    const syncHandler = DataManager.onSync(loadData);
    
    const handleOpenExternal = () => navigate('/external-ai-import');
    window.addEventListener('open-external-import', handleOpenExternal);

    const handleHistoryUpdate = () => {
      HistoryManager.getRecentNotes().then(setHistoryNotes);
    };
    window.addEventListener('history-updated', handleHistoryUpdate);

    const handleWorkspaceChange = () => loadData();
    window.addEventListener('workspace-notes-changed', handleWorkspaceChange);

    return () => {
      DataManager.offSync(syncHandler);
      window.removeEventListener('open-external-import', handleOpenExternal);
      window.removeEventListener('history-updated', handleHistoryUpdate);
      window.removeEventListener('workspace-notes-changed', handleWorkspaceChange);
    };
  }, [loadData, navigate]);

  const handleSoftDelete = async (id: string) => {
    const note = await DataManager.getNoteById(id);
    if (note) {
      await DataManager.saveNote({ ...note, isTrashed: true, updatedAt: Date.now() });
      // Removed redundant loadData() as saveNote triggers workspace-notes-changed event
    }
  };

  const handleNoteClick = (id: string) => {
    if (isSelectionMode) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      navigate(`/editor/${id}`, { state: { fromOutside: true } });
    }
  };

  const handleCopyNote = async (note: Note) => {
    const newNote = { 
      ...note, 
      id: crypto.randomUUID(), 
      title: (note.title || 'শিরোনামহীন') + ' (কপি)', 
      updatedAt: Date.now() 
    };
    await DataManager.saveNote(newNote);
    loadData();
  };

  const recentNotesList = [...notes]
    .filter(n => n.lastOpenedAt)
    .sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0))
    .slice(0, 4);

  if (recentNotesList.length === 0) {
    recentNotesList.push(...[...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4));
  }

  const handleEmojiSelect = async (id: string, emoji: string) => {
    const note = await DataManager.getNoteById(id);
    if (note) {
      const updatedNote = { ...note, emoji, updatedAt: Date.now() };
      await DataManager.saveNote(updatedNote);
      loadData();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-48 overflow-x-hidden select-none">
      {isLoading && <LoadingScreen />}

      <Sidebar 
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onOpenTrash={() => navigate('/recycle-bin')}
        onOpenSettings={() => navigate('/settings')}
        onJoinCollabClick={() => setShowJoinCollabModal(true)}
      />

      <JoinCollabModal 
        isOpen={showJoinCollabModal}
        onClose={() => setShowJoinCollabModal(false)}
      />

      <HomeHeader 
        currentWorkspaceName={currentWorkspace?.name}
        activeTasksCount={activeTasksCount}
        onOpenWorkspace={() => navigate('/workspaces')}
        onOpenMenu={() => setShowSidebar(true)}
      />

      <RecentNotes 
        notes={historyNotes}
        onNoteClick={(id) => navigate(`/editor/${id}`, { state: { fromOutside: true } })}
      />

      <AnimatedDivider />

      <div className="px-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-12">
          {notes.length > 0 ? (
            <>
              {notes.slice(0, visibleCount).map(note => (
                <NoteCard 
                  key={note.id}
                  note={note}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedIds.includes(note.id)}
                  onClick={handleNoteClick}
                  onMoreClick={(n) => setSelectedNoteForMenu(n)}
                />
              ))}
              
              {/* Sentinel target for high-performance lazy loading without visual loader */}
              {notes.length > visibleCount && (
                <div 
                  ref={observerTarget}
                  className="h-1 w-full"
                />
              )}
            </>
          ) : (
            <div className="col-span-2 py-32 flex flex-col items-center justify-center text-white/5">
              <FileText size={48} className="mb-4 opacity-10" />
              <p className="font-bold italic text-sm">কোনো নোট পাওয়া যায়নি</p>
            </div>
          )}
        </div>
      </div>

      <ActionMenu 
        note={selectedNoteForMenu}
        onClose={() => setSelectedNoteForMenu(null)}
        onEdit={(id) => navigate(`/editor/${id}`)}
        onCopy={handleCopyNote}
        onDelete={handleSoftDelete}
        onToggleSelection={(id) => {
          setIsSelectionMode(true);
          setSelectedIds([id]);
        }}
        onEmojiSelect={handleEmojiSelect}
      />

      <SelectionBar 
        isVisible={isSelectionMode}
        selectedCount={selectedIds.length}
        onCancel={() => { setIsSelectionMode(false); setSelectedIds([]); }}
        onDelete={() => setShowBulkDeleteConfirm(true)}
      />

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={async () => {
          setIsLoading(true);
          try {
            await DataManager.bulkTrashNotes(selectedIds);
            setSelectedIds([]);
            setIsSelectionMode(false);
          } catch (err) {
            console.error('Bulk trash failed:', err);
          } finally {
            setShowBulkDeleteConfirm(false);
            loadData();
          }
        }}
        title="নির্বাচিত অংশ মুছুন"
        message={`আপনি কি নির্বাচিত ${selectedIds.length}টি নোট রিসাইকেল বিনে পাঠাতে চান?`}
        variant="danger"
        confirmText="হ্যাঁ, মুছুন"
        cancelText="বাতিল"
      />

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.5 }}
            onClick={scrollToTop}
            className="fixed bottom-32 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(37,99,235,0.4)] z-[40] transition-all hover:scale-110 active:scale-90"
          >
            <ChevronUp size={28} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
