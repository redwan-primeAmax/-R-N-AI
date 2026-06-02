/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CustomBlockEditor, { blocksToHtml } from './components/CustomBlockEditor';
import { 
  Bold, Italic, Strikethrough, Code, ImageIcon, X, FileText, ChevronRight, Loader2, Check, AlertCircle, EyeOff, Eye, Info, Files, Hash, Star, Plus, Trash2, Lock
} from 'lucide-react';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { DataManager } from '../../services/storage/DataManager';
import { useEditorState } from './hooks/useEditorState';
import { globalCollabManager } from '../../services/PeerCollabManager';
import { EditorHeader } from './components/EditorHeader';
import { EditorToolbar } from './components/EditorToolbar';
import { BlockMenu } from './components/BlockMenu';
import { SubPageManager } from './components/SubPageManager';
import { EditorActionSheet } from './components/EditorActionSheet';
import { LinkPageList } from './components/LinkPageList';
import { PlusPanel } from './components/PlusPanel';
import { InputDialog, ConfirmDialog } from '../../components/modals/CustomDialogs';
import LoadingScreen from '../../components/LoadingScreen';
import { TagManagerModal } from '../../components/modals/TagManagerModal';
import { ThemeSelectorModal } from '../../components/modals/ThemeSelectorModal';
import { NoteExportModal } from '../../components/modals/NoteExportModal';
import { loadThemeConfig } from './themes/ThemeRegistry';
import { ThemeConfig } from './themes/types';
import { cn } from '../../utils/cn';
import { hashPassword } from '../../utils/crypto';

const ACTIVE_TASKS_LIMIT = 5;

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const {
    editor, note, setNote, title, setTitle, emoji, setEmoji, description, setDescription, 
    tags, setTags, theme, setTheme, isSaving,
    activeTasksCount, workspaceName, parentNote, currentSubPages, setCurrentSubPages, isListening,
    notification, setNotification, isReadOnly, setIsReadOnly, isUnlocked, setIsUnlocked,
    saveNote, loadNote, isDeletingRef, 
    titleRef, emojiRef, descriptionRef, noteRef, themeRef
  } = useEditorState(id);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Link Click Interception for Page Links (SPA navigation)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a.page-link');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) navigate(href);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [navigate]);

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [subPageMode, setSubPageMode] = useState<'attach' | 'create' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLockPrompt, setShowLockPrompt] = useState(false);
  const [showTagPrompt, setShowTagPrompt] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTheme, setActiveTheme] = useState<ThemeConfig | null>(null);
  const lastClickTime = useRef<number>(0);

  const [showLinkPanel, setShowLinkPanel] = useState(false);

  useEffect(() => {
    const handleShowSubPageLinkList = () => setShowLinkPanel(true);
    window.addEventListener('editor-event-showSubPageLinkList', handleShowSubPageLinkList);
    return () => window.removeEventListener('editor-event-showSubPageLinkList', handleShowSubPageLinkList);
  }, []);

  const handleLinkPageSelect = (targetNote: any) => {
    // Requirement 19: Insert link with arrow
    const linkHtml = `<a href="/editor/${targetNote.id}" class="page-link" data-note-id="${targetNote.id}"><span class="link-arrow">⤴</span> ${targetNote.title || 'শিরোনামহীন'}</a>`;
    document.execCommand('insertHTML', false, linkHtml);
    setShowLinkPanel(false);
  };

  // Collaboration P2P States
  const [collabRoom, setCollabRoom] = useState<string | null>(globalCollabManager.getRoomId(id));
  const [activePeers, setActivePeers] = useState(0);
  const [isHostOffline, setIsHostOffline] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Read if we need to auto-join from URL parameter "collab" on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlCollabId = searchParams.get('collab');
    
    if (urlCollabId && urlCollabId !== collabRoom) {
      const autoJoin = async () => {
        try {
          if (id) globalCollabManager.setActiveNoteId(id);
          // Pre-seed local state to Yjs doc to preserve offline updates during sync
          globalCollabManager.updateFromLocalState({
            blocks: editor.blocks,
            title,
            emoji,
            description,
            theme,
            noteId: id,
            parentId: note?.parentId,
            subPages: currentSubPages
          });

          setNotification({ message: 'Auto-joining collaborative session...', type: 'info' });
          await globalCollabManager.joinSession(urlCollabId, { targetNoteId: id });
          setCollabRoom(urlCollabId);

          // Mark as collaborated note on successful join
          if (id && note) {
            await DataManager.saveNote({
              ...note,
              isCollaborated: true,
              collabRoomId: urlCollabId,
              updatedAt: Date.now()
            });
          }

          setNotification({ message: 'P2P Session connected successfully!', type: 'success' });
          setTimeout(() => setNotification(null), 3000);
        } catch (err) {
          console.error(err);
          setNotification({ message: 'Failed to auto-join. Check Room ID.', type: 'error' });
          setTimeout(() => setNotification(null), 3000);
        }
      };
      autoJoin();
    }
  }, [location.search, id]);

  useEffect(() => {
    if (id) {
      globalCollabManager.setActiveNoteId(id);
    }
  }, [id]);

  // Periodic polling of connection status & Room ID to keep UI fresh
  useEffect(() => {
    const statsTimer = setInterval(() => {
      setCollabRoom(globalCollabManager.getRoomId(id));
      setActivePeers(globalCollabManager.getActivePeersCount(id));
      setIsHostOffline(globalCollabManager.getIsHostOffline(id));
      setCollaborators(globalCollabManager.getCollaborators(id));
    }, 1500);
    return () => clearInterval(statsTimer);
  }, [id]);

  // Auto-reconnect or Auto-host based on note metadata
  useEffect(() => {
    if (!id || !note) return;

    const performAutoConnection = async () => {
      // Auto-join if user joined this note before and room ID exists
      if (note.isCollaborated && note.collabRoomId && !collabRoom) {
        try {
          await globalCollabManager.joinSession(note.collabRoomId, { targetNoteId: id });
          setCollabRoom(note.collabRoomId);
        } catch (err) {
          console.warn('Auto-reconnect failed, host might be offline');
        }
      }

      // Auto-host if user was hosting this note before
      if (!note.isCollaborated && note.collabRoomId && !collabRoom) {
        try {
          const rid = await globalCollabManager.hostSession(id || '', { customRoomId: note.collabRoomId });
          setCollabRoom(rid);
        } catch (err) {
          console.error(err);
        }
      }
    };

    performAutoConnection();
  }, [id, note, collabRoom]);

  // Listen for 'kicked' event
  useEffect(() => {
    const handleKicked = async (e: any) => {
      if (e.detail?.noteId === id) {
        await DataManager.deleteNote(id);
        navigate('/');
      }
    };
    window.addEventListener('kicked-from-collab', handleKicked);
    return () => window.removeEventListener('kicked-from-collab', handleKicked);
  }, [id, navigate]);

  // Listen for remote Yjs updates and trigger authoritative local UI state updates
  useEffect(() => {
    if (!id || !note) return;

    const unregister = globalCollabManager.registerCallbacks(
      (syncedState) => {
        // Authoritative state reconciliation when applying remote updates
        if (globalCollabManager.isApplyingRemoteUpdate) {
          // ... (same as before)
          if (syncedState.title !== titleRef.current) {
            setTitle(syncedState.title);
            titleRef.current = syncedState.title;
          }
          if (syncedState.emoji !== emojiRef.current) {
            setEmoji(syncedState.emoji);
            emojiRef.current = syncedState.emoji;
          }
          if (syncedState.description !== descriptionRef.current) {
            setDescription(syncedState.description);
            descriptionRef.current = syncedState.description;
          }
          if (syncedState.theme !== themeRef.current) {
            setTheme(syncedState.theme);
            themeRef.current = syncedState.theme;
          }

          // Sync remote subpages to local DB and React state
          if (syncedState.syncedSubPages && syncedState.syncedSubPages.length > 0) {
            const subsPromises = syncedState.syncedSubPages.map(async (sub: any) => {
              const exists = await DataManager.getNoteById(sub.id);
              if (!exists || exists.updatedAt < sub.updatedAt) {
                await DataManager.saveNote({
                  ...sub,
                  content: exists?.content || '<p></p>'
                });
              }
            });
            Promise.all(subsPromises).then(() => {
              const activeSubs = syncedState.syncedSubPages!.filter((sub: any) => !sub.isTrashed);
              setCurrentSubPages(activeSubs);
            });
          }

          // Reconciliation: Compare blocks to prevent re-rendering when they align
          const currentBlocks = editor.blocks;
          let blocksChanged = currentBlocks.length !== syncedState.blocks.length;
          if (!blocksChanged) {
            for (let i = 0; i < currentBlocks.length; i++) {
              if (
                currentBlocks[i].id !== syncedState.blocks[i].id ||
                currentBlocks[i].content !== syncedState.blocks[i].content ||
                currentBlocks[i].type !== syncedState.blocks[i].type ||
                currentBlocks[i].checked !== syncedState.blocks[i].checked ||
                currentBlocks[i].language !== syncedState.blocks[i].language
              ) {
                blocksChanged = true;
                break;
              }
            }
          }

          if (blocksChanged) {
            editor.setBlocks(syncedState.blocks);
          }

          // Trigger local autosave with the newly arrived data to synchronize disk
          const updatedBlocksHtml = blocksToHtml(syncedState.blocks);
          DataManager.saveNote({
            ...note,
            title: syncedState.title,
            emoji: syncedState.emoji,
            description: syncedState.description,
            theme: syncedState.theme,
            content: updatedBlocksHtml,
            updatedAt: Date.now()
          }).then((saved) => {
            setNote(saved);
            noteRef.current = saved;
          }).catch(console.error);
        }
      },
      (msg, type) => {
        setNotification({
          message: msg,
          type: type === 'info' ? 'info' : type === 'success' ? 'success' : 'error'
        });
        setTimeout(() => setNotification(null), 3500);
      }
    );

    // Initial setup if we are already hosting or joined
    if (globalCollabManager.getRoomId()) {
      globalCollabManager.updateFromLocalState({
        blocks: editor.blocks,
        title,
        emoji,
        description,
        theme,
        noteId: id,
        parentId: note?.parentId,
        subPages: currentSubPages
      });
    }

    return unregister;
  }, [id, note]);

  // Stop and cleanup connection only when explicitly needed
  useEffect(() => {
    return () => {
      // We no longer disconnect on unmount to keep connection alive across pages 
      // (as long as we are still on the same note or in the App)
    };
  }, [id]);

  // Synchronize local edits to the Yjs Doc (which broadcasts updates automatically to remote peers)
  useEffect(() => {
    if (collabRoom && !globalCollabManager.isApplyingRemoteUpdate) {
      globalCollabManager.updateFromLocalState({
        blocks: editor.blocks,
        title,
        emoji,
        description,
        theme,
        noteId: id,
        parentId: note?.parentId,
        subPages: currentSubPages
      });
    }
  }, [editor.blocks, title, emoji, description, theme, collabRoom, id, note?.parentId, currentSubPages]);

  const handleStartCollab = async (options?: { password?: string, memberLimit?: number }) => {
    if (collabRoom && !options) {
      // Re-copy Room ID to clipboard as requested
      navigator.clipboard.writeText(collabRoom);
      setNotification({ message: 'Room ID copied to Clipboard!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      setNotification({ message: 'Creating secure Peer server...', type: 'info' });
      // Use existing collabRoomId if available for persistence or use custom params
      const roomId = await globalCollabManager.hostSession(id || '', {
        customRoomId: note?.collabRoomId || undefined,
        password: options?.password,
        memberLimit: options?.memberLimit
      });
      setCollabRoom(roomId);
      
      // Persist the room ID to the note so it can be auto-hosted later
      if (id && note) {
        await DataManager.saveNote({
          ...note,
          collabRoomId: roomId,
          updatedAt: Date.now()
        });
      }

      // Force-sync initial local state to Yjs document so the board is active
      globalCollabManager.updateFromLocalState({
        blocks: editor.blocks,
        title,
        emoji,
        description,
        theme,
        noteId: id,
        parentId: note?.parentId,
        subPages: currentSubPages
      });

      navigator.clipboard.writeText(roomId);
      setNotification({ message: `Session active! Room ID copied to Clipboard.`, type: 'success' });
      setTimeout(() => setNotification(null), 4000);

      const queryUrl = `${window.location.pathname}?collab=${roomId}`;
      window.history.replaceState({ ...window.history.state }, '', queryUrl);
    } catch (err) {
      console.error('Hosting collaboration session failed', err);
      setNotification({ message: 'P2P setup failed. Check connection.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  useEffect(() => {
    const handleCollabNotif = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail) {
        setNotification({
          message: customEvent.detail.message,
          type: customEvent.detail.type
        });
        setTimeout(() => setNotification(null), 3500);
      }
    };
    window.addEventListener('collab-notif', handleCollabNotif);
    return () => window.removeEventListener('collab-notif', handleCollabNotif);
  }, []);

  useEffect(() => {
    if (theme) {
      loadThemeConfig(theme).then(setActiveTheme);
    }
  }, [theme]);

  useEffect(() => {
    (window as any).editorEvents = {
      emit: (event: string, data?: any) => {
        if (event === 'createSubPage') setSubPageMode('create');
        if (event === 'attachSubPage') setSubPageMode('attach');
      }
    };
    return () => { delete (window as any).editorEvents; };
  }, []);

  useEffect(() => {
    const handlePdfExport = () => {
      // We will dispatch this event from somewhere else, we need to handle it using standard event listener 
      // but without the early return issue.
      if (!note) return;
      setNotification({ message: 'Generating PDF...', type: 'info' });
      
      const element = document.querySelector('.prose') as HTMLElement;
      if (!element) {
        setNotification({ message: 'Content not found', type: 'error' });
        return;
      }
      
      html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${note.title || 'note'}.pdf`);
        
        setNotification({ message: 'PDF Generated', type: 'success' });
      }).catch(err => {
        console.error('PDF generation failed:', err);
        setNotification({ message: 'PDF failed!', type: 'error' });
      }).finally(() => {
        setTimeout(() => setNotification(null), 2000);
      });
    };
    window.addEventListener('export-note-pdf', handlePdfExport);
    return () => window.removeEventListener('export-note-pdf', handlePdfExport);
  }, [note, setNotification]);

  const isLight = activeTheme ? ['default', 'snow-white', 'yellow-ruled', 'grid-paper', 'soft-linen'].includes(activeTheme.id) : true;

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', isLight);
    return () => {
      document.documentElement.classList.remove('light-theme');
    };
  }, [isLight]);

  if (!editor || !note) {
    return <LoadingScreen />;
  }

  if (note.isLocked && !isUnlocked) {
    const handleAuthSubmit = async () => {
      const trimmedInput = passwordInput.trim();
      if (!trimmedInput) return;
      const hashed = await hashPassword(trimmedInput);
      if (hashed === note.password || trimmedInput === note.password) {
        setIsUnlocked(true);
      } else {
        setNotification({ message: 'ভুল পাসওয়ার্ড!', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
      }
    };

    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center transition-colors duration-300 p-6",
        isLight ? "bg-gray-100 text-gray-900" : "bg-[#121212] text-white"
      )}>
        <div className="w-full max-w-md bg-[#191919] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mx-auto">
            <Lock size={32} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black font-display tracking-tight text-white animate-fade-in">নোটটি লক করা আছে (Locked Node)</h2>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider">এই নোটের বিষয়বস্তু দেখতে পাসওয়ার্ড প্রবেশ করুন</p>
          </div>
          
          <div className="space-y-4 text-left">
            <input 
              type="password" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              placeholder="পাসওয়ার্ড লিখুন..." 
              onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-mono focus:border-blue-500 outline-none placeholder:text-white/20 text-center text-white"
              autoFocus
            />

            <div className="flex gap-3">
              <button 
                onClick={() => navigate(-1)} 
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all text-white/80 active:scale-95"
              >
                ফিরে যান (Back)
              </button>
              <button 
                onClick={handleAuthSubmit} 
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all text-white active:scale-95 shadow-lg shadow-blue-500/20"
              >
                আনলক (Unlock)
              </button>
            </div>
          </div>
        </div>
        
        {notification && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }} 
            animate={{ y: 20, opacity: 1 }} 
            exit={{ y: -50, opacity: 0 }} 
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-6 py-3.5 rounded-full bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-xl"
          >
            {notification.message}
          </motion.div>
        )}
      </div>
    );
  }

  const handleBack = () => {
    const now = Date.now();
    const collabParam = collabRoom ? `?collab=${collabRoom}` : '';

    // Direct Home Redirection on Double Click
    if (now - lastClickTime.current < 300) {
      navigate(`/${collabParam}`);
      return;
    }
    lastClickTime.current = now;

    // Step-by-Step Back Navigation
    if (note?.parentId) {
      // Go to Parent Note if it exists
      navigate(`/editor/${note.parentId}${collabParam}`);
    } else {
      // Otherwise, go back in history or to Home
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate(`/${collabParam}`);
      }
    }
  };

  const updateTitle = (newTitle: string) => {
    setTitle(newTitle);
    titleRef.current = newTitle;
    saveNote(editor.getHTML());
  };

  const handleDelete = async () => {
    isDeletingRef.current = true;
    const currentNote = noteRef.current || note!;
    await DataManager.saveNote({ ...currentNote, isTrashed: true, updatedAt: Date.now() });
    navigate('/');
  };

  const handleCopy = async () => {
    const currentNote = noteRef.current || note!;
    const currentContent = blocksToHtml(editor.blocks);
    const newNote = { 
      ...currentNote, 
      id: crypto.randomUUID(), 
      title: (currentNote.title || 'শিরোনামহীন') + ' (Copy)', 
      content: currentContent,
      isLocked: false,
      password: '',
      collabRoomId: '',
      isCollaborated: false,
      publishedCode: '',
      updatedAt: Date.now(), 
      createdAt: Date.now() 
    };
    await DataManager.saveNote(newNote);
    setNotification({ message: 'Note Duplicated', type: 'success' });
    setShowActionSheet(false);
    setTimeout(() => setNotification(null), 2000);
  };

  const handleLock = async (password: string) => {
    const trimmed = password.trim();
    if (trimmed) {
      const hashed = await hashPassword(trimmed);
      const currentNote = noteRef.current || note!;
      await DataManager.saveNote({ ...currentNote, isLocked: true, password: hashed, updatedAt: Date.now() });
      setNotification({ message: 'Page Locked', type: 'success' });
      setShowActionSheet(false);
      setTimeout(() => setNotification(null), 2000);
    }
  };

  const handleExport = () => {
    setShowActionSheet(false);
    setShowExportModal(true);
  };

  const handleTagSaveSubmit = (updatedTags: string[]) => {
    setTags(updatedTags);
    DataManager.saveNote({ ...note!, tags: updatedTags, updatedAt: Date.now() });
    setNotification({ message: 'ট্যাগ আপডেট করা হয়েছে', type: 'success' });
    setTimeout(() => setNotification(null), 2000);
  };

  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId);
    themeRef.current = themeId;
    saveNote(editor.getHTML());
    
    // Optimistically update or wait for effect
    loadThemeConfig(themeId).then(setActiveTheme);
    
    setNotification({ message: 'Theme applied', type: 'success' });
    setTimeout(() => setNotification(null), 2000);
  };

  const themeClass = activeTheme?.className || '';

  const handleAddSubPage = async () => {
    const newSub = await DataManager.createNote(note!.workspaceId || 'default', note!.id);
    navigate(`/editor/${newSub.id}`);
    setShowActionSheet(false);
  };

  return (
    <div className={cn(
      "min-h-screen selection:bg-blue-500/30 font-sans transition-colors duration-300",
      isLight ? "bg-[#F1F1EF] text-[#37352F]" : "bg-[#121212] text-white"
    )}>
      <EditorHeader 
        onBack={handleBack}
        workspaceName={workspaceName}
        parentNote={parentNote}
        title={title}
        activeTasksCount={activeTasksCount}
        onShowMenu={() => setShowActionSheet(true)}
        isCollaborating={!!collabRoom}
        collabPeerCount={activePeers}
        onStartCollab={handleStartCollab}
        onNavigateToNote={(noteId) => {
          const collabParam = collabRoom ? `?collab=${collabRoom}` : '';
          navigate(`/editor/${noteId}${collabParam}`);
        }}
      />

      <main 
        className={cn(
          "pt-14 pb-48 max-w-4xl mx-auto min-h-screen transition-colors duration-300 mb-20",
          isLight ? "bg-white shadow-[0_0_80px_rgba(0,0,0,0.03)] border-x border-black/5" : "bg-[#121212]"
        )}
        onClick={(e) => {
          // Requirement 16: Click empty space to focus
          if (e.target === e.currentTarget) {
            const lastBlockId = editor.blocks[editor.blocks.length - 1]?.id;
            if (lastBlockId) {
              document.getElementById(lastBlockId)?.focus();
            }
          }
        }}
      >
        <div className="px-6 md:px-20 pt-10">
          {/* Requirement 3: Title at the absolute top */}
          <div className="flex flex-col mb-4 items-start">
            <textarea
              autoFocus
              value={title}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="শিরোনামহীন"
              rows={1}
              className={cn(
                "w-full bg-transparent text-4xl sm:text-5xl font-black focus:outline-none border-none ring-0 focus:ring-0 shadow-none tracking-tight resize-none leading-tight transition-colors",
                isLight ? "text-gray-900 placeholder:text-gray-200" : "text-white placeholder:text-white/[0.03]"
              )}
            />
          </div>

          <div className={cn(
            "relative group w-full h-32 sm:h-40 flex items-center justify-center overflow-hidden mb-6 rounded-3xl transition-colors duration-300",
            isLight ? "bg-[#f1f1f0]" : "bg-gradient-to-br from-black/20 via-[#1a1a1b] to-black"
          )}>
             <div className={cn(
               "absolute inset-0 transition-opacity",
               isLight ? "bg-white/10" : "bg-gradient-to-b from-[#121212]/0 via-[#121212]/50 to-[#121212]"
             )} />
          </div>

          <div 
            className={cn("relative pb-48 min-h-[70vh] transition-all", themeClass)}
            data-darkreader-ignore={themeClass ? "true" : undefined}
          >
            <CustomBlockEditor 
              editor={editor} 
              className={cn(
                "prose max-w-none focus:outline-none pb-20",
                !isLight && "prose-invert",
                isReadOnly && "pointer-events-none select-none text-muted-foreground"
              )} 
            />
          </div>
        </div>
      </main>

      <EditorToolbar 
        editor={editor}
        onPlusClick={() => setShowBlockMenu(true)}
        isReadOnly={isReadOnly}
        isLight={isLight}
      />

      <PlusPanel 
        isOpen={showBlockMenu} 
        onClose={() => setShowBlockMenu(false)} 
        editor={editor}
        isLight={isLight}
      />

      <LinkPageList 
        isOpen={showLinkPanel}
        onClose={() => setShowLinkPanel(false)}
        onSelect={handleLinkPageSelect}
        workspaceId={note?.workspaceId || 'default'}
      />

      <AnimatePresence>
        {subPageMode && (
          <SubPageManager 
            currentNote={note!} 
            type={subPageMode} 
            onClose={() => setSubPageMode(null)} 
          />
        )}
      </AnimatePresence>

      <EditorActionSheet 
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        note={note}
        isReadOnly={isReadOnly}
        onToggleReadOnly={() => setIsReadOnly(!isReadOnly)}
        onDelete={() => setShowDeleteConfirm(true)}
        onCopy={handleCopy}
        onLock={() => setShowLockPrompt(true)}
        onExport={handleExport}
        onTag={() => setShowTagPrompt(true)}
        onTheme={() => { setShowActionSheet(false); setShowThemeSelector(true); }}
        subPages={currentSubPages}
        onAddSubPage={handleAddSubPage}
        onStartCollab={handleStartCollab}
        isCollabActive={!!collabRoom}
        collabRoomId={collabRoom || undefined}
        collaborators={collaborators}
        onKickCollaborator={(peerId) => globalCollabManager.kickCollaborator(peerId, id)}
      />

      <ConfirmDialog 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)} 
        onConfirm={handleDelete} 
        title="মুছে ফেলুন" 
        message="আপনি কি এই নোটটি রিসাইকেল বিনে পাঠাতে চান?" 
        variant="danger"
        confirmText="হ্যাঁ, ডিলেট করুন"
        cancelText="বাতিল"
      />

      <InputDialog 
        isOpen={showLockPrompt} 
        onClose={() => setShowLockPrompt(false)} 
        onConfirm={handleLock} 
        title="পাসওয়ার্ড সেট করুন" 
        placeholder="সিক্রেট পাসওয়ার্ড..." 
        type="password"
        confirmText="লক করুন"
      />

      <TagManagerModal 
        isOpen={showTagPrompt} 
        onClose={() => setShowTagPrompt(false)} 
        note={note}
        onTagsUpdated={handleTagSaveSubmit} 
      />

      {notification && (
        <motion.div initial={{ y: -50 }} animate={{ y: 20 }} exit={{ y: -50 }} className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-full bg-white text-black text-xs font-black uppercase">
          {notification.message}
        </motion.div>
      )}
    </div>
  );
}

