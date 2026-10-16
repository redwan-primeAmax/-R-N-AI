/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronUp, LayoutGrid, Layers } from 'lucide-react';
import { DataManager, Note, Workspace } from '../../services/storage/DataManager';
import { m as motion, AnimatePresence } from 'framer-motion';
import { operationRunner } from '../../services/storage/OperationRunner';

const Sidebar = lazy(() => import('../../components/Sidebar'));
const HomeNoteList = lazy(() => import('./components/HomeNoteList'));
import { HomeHeader } from './components/HomeHeader';
const ActionMenu = lazy(() => import('./components/ActionMenu').then(m => ({ default: m.ActionMenu })));
import { SelectionBar } from './components/SelectionBar';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../utils/translator';

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'layer'>(() => {
    return (localStorage.getItem('home_view_mode') as 'grid' | 'layer') || 'layer';
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTasksCount, setActiveTasksCount] = useState(0);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNoteForMenu, setSelectedNoteForMenu] = useState<Note | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);



  const navigate = useNavigate();
  const { t } = useLanguage();
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0];

  const hasMore = useRef(true);
  const loadingPage = useRef(false);
  const loadVersion = useRef(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageRef = useRef(0);
  const PAGE_SIZE = 12;

  // Scroll position listener for ScrollToTop button
  useEffect(() => {
    const handleScroll = () => {
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

  const loadData = useCallback(async (isInitial = true) => {
    if (!isInitial && (loadingPage.current || !hasMore.current)) return;
    const version = isInitial ? ++loadVersion.current : loadVersion.current;
    loadingPage.current = true;
    if (isInitial) setIsLoading(true);
    else setIsLoadingMore(true);
    try {
      const activeWsId = await DataManager.getActiveWorkspaceId();
      const targetPage = isInitial ? 0 : pageRef.current + 1;
      const { notes: fetchedNotes, hasMore: moreAvailable } = await DataManager.getNotesPaginated(targetPage, PAGE_SIZE);
      if (version !== loadVersion.current) return;
      setCurrentWorkspaceId(activeWsId);
      setNotes(prev => isInitial ? fetchedNotes : [...new Map([...prev, ...fetchedNotes].map(n => [n.id, n])).values()]);
      pageRef.current = targetPage;
      hasMore.current = moreAvailable;
      if (isInitial) {
        const ws = await DataManager.getWorkspaces();
        if (version !== loadVersion.current) return;
        setWorkspaces(ws);
      }
    } catch (err) { console.error(err); }
    finally {
      if (version === loadVersion.current) {
        loadingPage.current = false;
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, []);
  const loadMore = useCallback(() => { void loadData(false); }, [loadData]);

  useEffect(() => {
    const unsub = operationRunner.subscribe(() => {
      setActiveTasksCount(operationRunner.getActiveTasksCount());
    });
    return unsub;
  }, []);

  useEffect(() => {
    loadData();
    let reloadTimer: ReturnType<typeof setTimeout>;
    const scheduleReload = () => {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => { void loadData(); }, 50);
    };
    const syncHandler = DataManager.onSync(scheduleReload);

    const handleOpenExternal = () => navigate('/external-ai-import');
    window.addEventListener('open-external-import', handleOpenExternal);

    const handleWorkspaceChange = scheduleReload;
    window.addEventListener('workspace-notes-changed', handleWorkspaceChange);
    window.addEventListener('notes-cache-invalidated', handleWorkspaceChange);

    return () => {
      ++loadVersion.current;
      clearTimeout(reloadTimer);
      DataManager.offSync(syncHandler);
      window.removeEventListener('open-external-import', handleOpenExternal);
      window.removeEventListener('workspace-notes-changed', handleWorkspaceChange);
      window.removeEventListener('notes-cache-invalidated', handleWorkspaceChange);
    };
  }, [loadData, navigate]);

  const handleSoftDelete = async (id: string) => {
    setIsLoading(true);
    try {
      await DataManager.deleteNote(id);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsLoading(false);
      setSelectedNoteForMenu(null);
      await loadData();
    }
  };

  const handleNoteClick = useCallback((id: string) => {
    if (isSelectionMode) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      navigate(`/editor/${id}`, { state: { fromOutside: true } });
    }
  }, [isSelectionMode, navigate]);

  const handleNoteMoreClick = useCallback((note: Note) => {
    setSelectedNoteForMenu(note);
  }, []);

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

  const handleEmojiSelect = async (id: string, emoji: string) => {
    const note = await DataManager.getNoteById(id);
    if (note) {
      const updatedNote = { ...note, emoji, updatedAt: Date.now() };
      await DataManager.saveNote(updatedNote);
      loadData();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-white pb-48 overflow-x-hidden select-none">
      {showSidebar && <Suspense fallback={null}><Sidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onOpenTrash={() => navigate('/recycle-bin')}
        onOpenSettings={() => navigate('/settings')}
      /></Suspense>}

      <HomeHeader
        currentWorkspaceName={currentWorkspace?.name}
        currentWorkspaceColor={currentWorkspace?.color}
        activeTasksCount={activeTasksCount}
        onOpenWorkspace={() => navigate('/workspaces')}
        onOpenMenu={() => setShowSidebar(true)}
      />

      <div className="px-4 max-w-4xl mx-auto w-full pt-4">
        {/* Section Header with View Mode Switcher */}
        <div className="flex items-center justify-between pb-2 mb-2 px-1">
          <span className="text-[12px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            {t('home.pages', { count: notes.length })}
          </span>
          {/* Grid / Layer switcher — one polished amber design system:
              soft glass track, gradient pill + glow on the active mode */}
          <div
            role="group"
            aria-label={`${t('home.grid')} / ${t('home.layer')}`}
            className="flex items-center gap-1 p-1 rounded-2xl text-[11px] bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-amber-400/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
          >
            {([
              { mode: 'grid' as const, icon: LayoutGrid, label: t('home.grid'), title: t('home.gridMode') },
              { mode: 'layer' as const, icon: Layers, label: t('home.layer'), title: t('home.layerMode') },
            ]).map(({ mode, icon: Icon, label, title }) => {
              const isActive = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode);
                    localStorage.setItem('home_view_mode', mode);
                  }}
                  aria-pressed={isActive}
                  title={title}
                  className={cn(
                    "relative px-3 py-1.5 rounded-xl font-bold tracking-tight flex items-center gap-1.5 transition-all duration-200 active:scale-95",
                    isActive
                      ? "bg-gradient-to-b from-amber-300 to-amber-500 text-neutral-950 shadow-[0_4px_14px_rgba(245,158,11,0.45),inset_0_1px_0_rgba(255,255,255,0.5)]"
                      : "text-amber-100/50 hover:text-amber-200 hover:bg-amber-400/10"
                  )}
                >
                  <Icon size={14} strokeWidth={isActive ? 2.6 : 2} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes Container: Grid or Layer */}
        <div className="pb-24">
          {isLoading && notes.length === 0 ? (
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-white/[0.02] border border-white/[0.05] rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : notes.length > 0 ? (
            <Suspense fallback={<div className="h-40 animate-pulse" aria-label="Loading notes" />}>
              <HomeNoteList notes={notes} mode={viewMode} selectedIds={selectedIds}
                isSelectionMode={isSelectionMode} onClick={handleNoteClick}
                onMoreClick={handleNoteMoreClick} onLoadMore={loadMore} />
              {isLoadingMore && <p role="status" className="text-center py-4 text-sm text-neutral-400">Loading more notes…</p>}
            </Suspense>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600">
              <FileText size={44} className="mb-3 opacity-30" />
              <p className="font-medium text-sm">{t('home.noNotes')}</p>
            </div>
          )}
        </div>
      </div>

      {selectedNoteForMenu && <Suspense fallback={null}><ActionMenu
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
      /></Suspense>}

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
