import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { 
  X, Trash2, Search, Bookmark, Lock,
  Settings2, Settings, Sun, Moon, Layers, Plus, Sparkles,
  ChevronRight, FileText, ChevronDown, MoreHorizontal,
  Box, Download, Zap, Database, AlertCircle, FileDown, Users,
  Boxes, Layout, ArrowLeft, History, Clock, Loader2, LayoutGrid, Monitor, Wrench, Share2
} from 'lucide-react';
import localforage from 'localforage';
import { DataManager, Note, Workspace } from '../services/storage/DataManager';
import { db } from '../services/storage/DexieDB';
import { globalCollabManager } from '../services/PeerCollabManager';
import { blocksToHtml } from '../pages/Editor/components/CustomBlockEditor';
import { HistoryManager, RecentNote } from '../services/storage/HistoryManager';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Modal } from './modals/Modal';
import { MoveToModal } from './modals/MoveToModal';
import { PageIcon } from './PageIcon';
import LoadingScreen from './LoadingScreen';
import { cn } from '../utils/cn';
import { formatSize } from '../utils/formatSize';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTrash: () => void;
  onOpenSettings: () => void;
  onJoinCollabClick: () => void;
}

export default function Sidebar({ 
  isOpen, 
  onClose, 
  onOpenTrash, 
  onOpenSettings,
  onJoinCollabClick
}: SidebarProps) {
  const navigate = useNavigate();
  const { id: activeNoteId } = useParams();
  const [sidebarView, setSidebarView] = useState<'main' | 'tags' | 'subpages'>('main');
  const [tagInput, setTagInput] = useState('');
  const [systemTags, setSystemTags] = useState<string[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isNavigating, setIsNavigating] = useState(false);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [iconsLoaded, setIconsLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIconsLoaded(false);
      const timer = setTimeout(() => {
        setIconsLoaded(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIconsLoaded(false);
    }
  }, [isOpen]);

  const SidebarIconPlaceholder = () => (
    <div className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center animate-pulse bg-white/5">
      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
    </div>
  );

  const handleNavigation = (path: string, options?: any) => {
    navigate(path, options);
    onClose();
  };

  const [showMoveTo, setShowMoveTo] = useState<Note | null>(null);
  const [moveSearch, setMoveToSearch] = useState('');

  const loadData = useCallback(async () => {
    const [usage, tagsRec, history, ws, activeId, allNotes] = await Promise.all([
      DataManager.getStorageUsage(),
      db.key_value_pairs.get('system_tags'),
      HistoryManager.getRecentNotes(),
      DataManager.getWorkspaces(),
      DataManager.getActiveWorkspaceId(),
      DataManager.getAllNotes()
    ]);
    setStorageInfo(usage);
    setSystemTags(tagsRec ? tagsRec.value : []);
    setRecentNotes(history);
    setActiveWorkspace(ws.find(w => w.id === activeId) || null);
    setNotes(allNotes.filter(n => !n.isTrashed));
  }, []);

  const saveTags = async (tags: string[]) => {
    setSystemTags(tags);
    await db.key_value_pairs.put({ key: 'system_tags', value: tags });
  };

  const handleMoveTo = async (noteId: string, newParentId?: string) => {
    const noteToMove = notes.find(n => n.id === noteId);
    if (noteToMove) {
      const updated = { ...noteToMove, parentId: newParentId, updatedAt: Date.now() };
      await DataManager.saveNote(updated);
      setShowMoveTo(null);
      loadData();
    }
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const renderNoteTreeItem = (note: Note, depth = 0, visited = new Set<string>()): React.ReactNode => {
    if (visited.has(note.id) || depth > 8) return null;
    const nextVisited = new Set(visited).add(note.id);
    const children = notes.filter(n => n.parentId === note.id && !n.isTrashed);
    const isExpanded = expandedNodes.has(note.id);
    const isActive = activeNoteId === note.id;

    return (
      <div key={note.id} className="select-none">
        <div 
          className={cn(
            "group flex items-center gap-2 py-2 px-2.5 rounded-xl cursor-pointer transition-all hover:bg-white/[0.06] text-white/80",
            isActive && "bg-amber-400/10 text-amber-300 font-semibold"
          )}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          onClick={() => { navigate(`/editor/${note.id}`); onClose(); }}
        >
          {children.length > 0 ? (
            <button 
              onClick={(e) => toggleExpand(e, note.id)}
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white"
              aria-label="টগল সাব-পেজ"
            >
              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                <ChevronRight size={13} />
              </motion.div>
            </button>
          ) : (
            <div className="w-5" />
          )}
          <PageIcon emoji={note.emoji} className="text-base shrink-0" />
          <span className="text-[13px] truncate flex-1">{note.title || 'Untitled'}</span>
        </div>
        {isExpanded && children.length > 0 && (
          <div className="border-l border-white/[0.08] ml-4">
            {children.map(child => renderNoteTreeItem(child, depth + 1, nextVisited))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    loadData();
    
    // Listen for sync events
    const handleSyncEvent = () => loadData();
    window.addEventListener('sync', handleSyncEvent);
    window.addEventListener('notes-updated', handleSyncEvent);
    window.addEventListener('history-updated', handleSyncEvent);
    window.addEventListener('workspace-notes-changed', handleSyncEvent);
    window.addEventListener('notes-cache-invalidated', handleSyncEvent);
    
    return () => {
      window.removeEventListener('sync', handleSyncEvent);
      window.removeEventListener('notes-updated', handleSyncEvent);
      window.removeEventListener('history-updated', handleSyncEvent);
      window.removeEventListener('workspace-notes-changed', handleSyncEvent);
      window.removeEventListener('notes-cache-invalidated', handleSyncEvent);
    };
  }, [loadData]);

  const usagePercent = storageInfo ? Math.min(100, (storageInfo.used / (storageInfo.quota || 1)) * 100) : 0;
  const isFull = usagePercent > 90;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-[100]"
          />

          {/* Sidebar Content */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.22 }}
            className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[280px] bg-[var(--bg-main)] border-r border-white/5 z-[101] flex flex-col pt-6 overflow-hidden rounded-r-[32px]"
          >
            {/* Loading Overlay */}
            <AnimatePresence>
              {isNavigating && (
                <LoadingScreen />
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="px-6 flex items-center justify-between mb-4 pb-4 border-b border-white/[0.06]">
              <div 
                onClick={() => handleNavigation('/workspaces')}
                className="flex items-center gap-3 cursor-pointer group"
                title="ওয়ার্কস্পেস পরিবর্তন করুন"
              >
                <div className="w-11 h-11 bg-gradient-to-tr from-[#FFB03A] to-[#FFC966] rounded-2xl flex items-center justify-center text-black font-black text-xl shadow-[0_4px_16px_rgba(255,176,58,0.35)] border border-amber-300/30 overflow-hidden group-hover:scale-105 transition-transform">
                  {activeWorkspace?.logoSvg ? (
                    <div 
                      className="w-7 h-7 flex items-center justify-center overflow-hidden text-black"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeWorkspace.logoSvg) }}
                    />
                  ) : (
                    activeWorkspace?.name?.charAt(0) || 'N'
                  )}
                </div>
                <div className="flex flex-col">
                  <h2 className="text-base font-black tracking-tight leading-none text-white/95 group-hover:text-amber-300 transition-colors">
                    {activeWorkspace?.name || 'My Notes'}
                  </h2>
                  <span className="text-[10px] font-bold text-amber-400 mt-1 flex items-center gap-1">
                    ট্যাপ করে ওয়ার্কস্পেস বদলান <ChevronRight size={10} />
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                  aria-label="বন্ধ করুন"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Menu List & Page Tree Section */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 mb-4 space-y-4">
              {/* Top Section: ONLY 3 Most Recently Opened Notes */}
              <div>
                <div className="flex items-center justify-between px-3 py-1.5 mb-1 text-[11px] font-bold uppercase tracking-wider text-white/40">
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-400" />
                    সাম্প্রতিক ৩টি নোট
                  </span>
                  <button 
                    onClick={() => {
                      navigate('/editor/new');
                      onClose();
                    }}
                    className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-white transition-colors"
                    title="নতুন পেজ"
                    aria-label="নতুন পেজ"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="space-y-1">
                  {(() => {
                    const top3Recent = [...notes]
                      .sort((a, b) => (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt))
                      .slice(0, 3);

                    if (top3Recent.length === 0) {
                      return (
                        <div className="px-3 py-2 text-xs text-white/30 italic">
                          কোনো নোট পাওয়া যায়নি
                        </div>
                      );
                    }

                    return top3Recent.map(note => {
                      const isActive = activeNoteId === note.id;
                      return (
                        <div 
                          key={note.id}
                          className={cn(
                            "group flex items-center justify-between gap-2.5 py-2 px-3 rounded-xl cursor-pointer transition-all hover:bg-white/[0.06] text-white/80",
                            isActive && "bg-amber-400/10 text-amber-300 font-semibold"
                          )}
                        >
                          <div 
                            onClick={() => { navigate(`/editor/${note.id}`); onClose(); }}
                            className="flex items-center gap-2.5 flex-1 min-w-0"
                          >
                            <PageIcon emoji={note.emoji} className="text-base shrink-0" />
                            <span className="text-[13px] truncate font-medium">{note.title || 'শিরোনামহীন'}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMoveTo(note);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-white transition-all"
                            title="মোভ করুন (Move To)"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Favorites Section */}
              {notes.filter(n => n.isFavorite).length > 0 && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <div className="px-3 py-1.5 mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <span>★ পছন্দের নোটসমূহ</span>
                  </div>
                  <div className="space-y-1">
                    {notes.filter(n => n.isFavorite).map(fNote => (
                      <div
                        key={fNote.id}
                        onClick={() => { navigate(`/editor/${fNote.id}`); onClose(); }}
                        className="flex items-center gap-2.5 py-2 px-3 rounded-xl cursor-pointer hover:bg-white/[0.06] text-white/80"
                      >
                        <PageIcon emoji={fNote.emoji} className="text-base shrink-0" />
                        <span className="text-[13px] truncate font-medium flex-1">{fNote.title || 'শিরোনামহীন'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Sections */}
              <div className="pt-2 border-t border-white/[0.06] space-y-1">
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/40">
                  অ্যাপ মেনু
                </div>
                {[
                  { icon: <Sparkles size={16} />, label: 'AI সহকারী ও চ্যাট', path: '/ai-auto' },
                  { icon: <Bookmark size={16} />, label: 'বুকমার্কসমূহ', path: '/bookmarks' },
                  { icon: <Lock size={16} />, label: 'সিকিউর ভল্ট (লকড)', path: '/vault' },
                  { icon: <Wrench size={16} />, label: 'টুলস সেকশন', path: '/tools' },
                  { icon: <Settings size={16} />, label: 'অ্যাপ সেটিংস', path: '/settings' },
                  { icon: <Trash2 size={16} />, label: 'রিসাইকেল বিন', path: '/recycle-bin' }
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => { 
                      if (item.path) { 
                        handleNavigation(item.path); 
                      }
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group active:scale-[0.98] hover:bg-white/[0.06] text-white/80 hover:text-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] text-amber-400 border border-white/[0.06] group-hover:bg-amber-400/20 group-hover:border-amber-400/30 transition-all">
                        {item.icon}
                      </div>
                      <span className="text-[13px] font-medium tracking-tight text-white/85 group-hover:text-white">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight size={13} className="text-white/20 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Notice */}
            <div className="p-8 text-center">
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/10">Diamond Road v1.0</p>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      <MoveToModal 
        isOpen={!!showMoveTo} 
        onClose={() => setShowMoveTo(null)} 
        onMove={handleMoveTo}
        notes={notes}
        searchQuery={moveSearch}
        onSearchChange={setMoveToSearch}
        currentNote={showMoveTo}
      />
    </>
  );
}
