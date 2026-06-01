import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Trash2, 
  Settings2, Settings, Sun, Moon, Layers, Plus, Sparkles,
  ChevronRight, FileText, ChevronDown, MoreHorizontal,
  Box, Download, Zap, Database, AlertCircle, FileDown, Users,
  Boxes, Layout, ArrowLeft, History, Clock, Loader2
} from 'lucide-react';
import localforage from 'localforage';
import { DataManager, Note, Workspace } from '../services/storage/DataManager';
import { globalCollabManager } from '../services/PeerCollabManager';
import { blocksToHtml } from '../pages/Editor/components/CustomBlockEditor';
import { HistoryManager, RecentNote } from '../services/management/HistoryManager';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Modal } from './modals/Modal';
import { MoveToModal } from './modals/MoveToModal';
import LoadingScreen from './LoadingScreen';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
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
    const [usage, storedTags, history, ws, activeId] = await Promise.all([
      DataManager.getStorageUsage(),
      localforage.getItem<string[]>('system_tags'),
      HistoryManager.getRecentNotes(),
      DataManager.getWorkspaces(),
      DataManager.getActiveWorkspaceId()
    ]);
    setStorageInfo(usage);
    setSystemTags(storedTags || []);
    setRecentNotes(history);
    setActiveWorkspace(ws.find(w => w.id === activeId) || null);
  }, []);

  // Performance Optimization: Load notes dynamically only when the MoveTo modal acts is active
  useEffect(() => {
    if (showMoveTo) {
      DataManager.getAllNotes().then(allNotes => {
        setNotes(allNotes.filter(n => !n.isTrashed));
      }).catch(err => console.error(err));
    } else {
      setNotes([]);
    }
  }, [showMoveTo]);

  const saveTags = async (tags: string[]) => {
    setSystemTags(tags);
    await localforage.setItem('system_tags', tags);
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

  const renderNoteTreeItem = (note: Note, depth = 0) => {
    const children = notes.filter(n => n.parentId === note.id);
    const isExpanded = expandedNodes.has(note.id);

    return (
      <div key={note.id} className="select-none">
        <div 
          className="group flex items-center gap-2 py-3 px-2 rounded-2xl cursor-pointer transition-all hover:bg-white/5 text-white/80"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => { navigate(`/editor/${note.id}`); onClose(); }}
        >
          {children.length > 0 && (
            <button 
              onClick={(e) => toggleExpand(e, note.id)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                <ChevronRight size={14} />
              </motion.div>
            </button>
          )}
          {!children.length && <div className="w-6" />}
          <span className="text-lg">{note.emoji || '📄'}</span>
          <span className="text-sm font-bold truncate flex-1">{note.title || 'Untitled'}</span>
        </div>
        {isExpanded && children.length > 0 && (
          <div className="border-l border-white/5 ml-4">
            {children.map(child => renderNoteTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    
    // Listen for sync events
    const handleSyncEvent = () => loadData();
    window.addEventListener('sync', handleSyncEvent);
    window.addEventListener('notes-updated', handleSyncEvent);
    window.addEventListener('history-updated', handleSyncEvent);
    window.addEventListener('workspace-notes-changed', handleSyncEvent);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('sync', handleSyncEvent);
      window.removeEventListener('notes-updated', handleSyncEvent);
      window.removeEventListener('history-updated', handleSyncEvent);
      window.removeEventListener('workspace-notes-changed', handleSyncEvent);
    };
  }, [loadData]);

  // Remove unused notes list logic from sidebar
  /*
  const renderNoteItem = (note: Note, depth = 0) => { ... }
  const rootNotes = notes.filter(n => !n.parentId && !n.isTrashed);
  */

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const usagePercent = storageInfo ? Math.min(100, (storageInfo.used / (storageInfo.quota || 1)) * 100) : 0;
  const isFull = usagePercent > 90;

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', false);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-[100]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.22 }}
            className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[280px] bg-[#0A0A0B] border-r border-white/5 z-[101] flex flex-col pt-6 overflow-hidden rounded-r-[32px]"
          >
            {/* Loading Overlay */}
            <AnimatePresence>
              {isNavigating && (
                <LoadingScreen />
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="px-6 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/20 overflow-hidden">
                  {activeWorkspace?.logoSvg ? (
                    <div 
                      className="w-7 h-7 flex items-center justify-center overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: activeWorkspace.logoSvg }}
                    />
                  ) : (
                    activeWorkspace?.name?.charAt(0) || 'N'
                  )}
                </div>
                <div className="flex flex-col">
                  <h2 className="text-lg font-black tracking-tighter text-white leading-none">মূল মেনু</h2>
                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1 truncate max-w-[120px]">
                    {activeWorkspace?.name || 'Workspace'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-white transition-colors"
                  aria-label="বন্ধ করুন"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Menu List Section */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 mb-6 space-y-6">
              {/* Core Features */}
              <div className="bg-[#151516]/50 border border-white/[0.03] rounded-[32px] p-2 space-y-2 shadow-2xl">
                {[
                  { icon: <Box size={14} />, label: 'Browse Templates', path: '/templates', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]' },
                  { icon: <Zap size={14} />, label: 'Tool Library', path: '/tools', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]' },
                  { icon: <Sparkles size={14} />, label: 'AI Content Architect', path: '/external-ai-import', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]' },
                  { icon: <Users size={14} />, label: 'কোলাবোরেশন জয়েন', action: 'join-collab', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.1)]' },
                  { icon: <Database size={14} />, label: 'ডাটা ম্যানেজমেন্ট', path: '/data-management', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]' },
                  { icon: <Settings size={14} />, label: 'সেটিংস', path: '/settings', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]' },
                  { icon: <Trash2 size={14} />, label: 'রিসাইকেল বিন', path: '/recycle-bin', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]' }
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => { 
                      if (item.action === 'join-collab') {
                        onClose();
                        onJoinCollabClick();
                      } else if (item.path) { 
                        handleNavigation(item.path); 
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 bg-[#1C1C1D] hover:bg-[#222223] rounded-2xl transition-all group relative overflow-hidden active:scale-[0.98]",
                      item.glow
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 shadow-inner",
                        item.bg, item.color, item.border,
                        "group-hover:scale-110 group-hover:rotate-3"
                      )}>
                        {iconsLoaded ? (
                          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center">
                            {item.icon}
                          </motion.div>
                        ) : (
                          <SidebarIconPlaceholder />
                        )}
                      </div>
                      <span className="font-black text-[10px] uppercase tracking-[0.15em] text-white/40 group-hover:text-white transition-colors">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                       <ChevronRight size={14} className={item.color} />
                    </div>
                  </button>
                ))}
              </div>

            </div>

            {/* Storage Progress Bar (Bottom) */}
            <div className="p-4 mt-auto">
              <button 
                onClick={() => handleNavigation('/storage')}
                className="w-full text-left bg-[#151516] border border-white/[0.05] rounded-[24px] p-5 shadow-2xl relative overflow-hidden group transition-all hover:bg-[#1a1a1b] active:scale-95"
              >
                <div className="absolute inset-0 bg-blue-500/[0.01] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10">সার্ভার স্টোরেজ</span>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-xs font-black text-blue-400">{formatSize(storageInfo?.used || 0)}</span>
                    <span className="text-[8px] font-bold text-white/10">/ {(storageInfo?.quota && storageInfo.quota > 0) ? formatSize(storageInfo.quota) : 'Unlimited'}</span>
                  </div>
                </div>
                <div className="h-1 w-full bg-white/[0.03] rounded-full overflow-hidden relative z-10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      isFull ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                    )}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between relative z-10">
                  <span className="text-[8px] font-bold text-white/5 italic">ট্যাপ করে বিস্তারিত দেখুন</span>
                  <ChevronRight size={12} className="text-white/5 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>
            </div>
          </motion.div>
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
