/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import CustomBlockEditor from './components/CustomBlockEditor';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { X } from 'lucide-react';

import { useEditorState } from './hooks/useEditorState';
import { useCollaboration } from './hooks/useCollaboration';
import { usePdfExport } from './hooks/usePdfExport';
import { useEditorHandlers } from './hooks/useEditorHandlers';

import { EditorHeader } from './components/EditorHeader';
import { EditorToolbar } from './components/EditorToolbar';
import { EditorLockScreen } from './components/EditorLockScreen';
import { EditorModals } from './components/EditorModals';
import LoadingScreen from '../../components/LoadingScreen';
import { EditorModalProvider } from './context/EditorModalContext';

import { DataManager } from '../../services/storage/DataManager';
import { cn } from '../../utils/cn';

export default function EditorPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <EditorPage id={id} />;
}

function EditorPage({ id }: { id: string | undefined }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Share refs globally to prevent DOM-parsing vulnerabilities
  const blocksRefs = useRef<Record<string, HTMLElement>>({});

  const {
    editor, note, setNote, title, setTitle, emoji, setEmoji, description, setDescription, 
    tags, setTags, theme, setTheme,
    activeTasksCount, workspaceName, parentNote, currentSubPages, setCurrentSubPages,
    notification, setNotification, isReadOnly, setIsReadOnly, isUnlocked, setIsUnlocked,
    saveNote, titleRef, emojiRef, descriptionRef, noteRef, themeRef, blocksRef
  } = useEditorState(id, blocksRefs as any);

  // Collaboration P2P Setup
  const {
    collabRoom, activePeers, collaborators, handleStartCollab, handleKickCollaborator
  } = useCollaboration({
    id, note, editor, title, emoji, description, theme, currentSubPages,
    setNote, setTitle, setEmoji, setDescription, setTheme, setCurrentSubPages, setNotification,
    location, navigate, titleRef, emojiRef, descriptionRef, themeRef, noteRef
  });

  // Editor Actions & Component Handlers Setup
  const {
    showActionSheet, setShowActionSheet,
    showBlockMenu, setShowBlockMenu,
    showThemeSelector, setShowThemeSelector,
    subPageMode, setSubPageMode,
    showDeleteConfirm, setShowDeleteConfirm,
    showLockPrompt, setShowLockPrompt,
    showTagPrompt, setShowTagPrompt,
    showExportModal, setShowExportModal,
    isLight, themeClass,
    showLinkPanel, setShowLinkPanel,
    isTitleFocused, setIsTitleFocused,
    isUploading, setIsUploading,
    showPageEmojiPicker, setShowPageEmojiPicker,
    handleLinkPageSelect, handleBack,
    updateTitle, updateDescription, updateEmoji,
    handleDelete, handleCopy, handleLock,
    handleTagSaveSubmit, handleThemeSelect, handleAddSubPage
  } = useEditorHandlers({
    id, note, editor, title, emoji, description, theme, tags, currentSubPages, collabRoom,
    setNote, setTitle, setEmoji, setDescription, setTags, setTheme, setNotification,
    setIsReadOnly, isReadOnly, saveNote, titleRef, emojiRef, descriptionRef, noteRef, themeRef, blocksRef,
    handleStartCollab
  });

  // Additional event sync & listening setup with throttling guard to prevent DOM flooding
  useEffect(() => {
    let lastNotifTime = 0;
    const NOTIF_THROTTLE_MS = 500;
    let isUnmounted = false;

    const handleCollabNotif = (e: Event) => {
      if (isUnmounted) return;
      const now = Date.now();
      if (now - lastNotifTime < NOTIF_THROTTLE_MS) {
        console.warn('Blocked duplicate collab-notif to prevent DOM flooding');
        return;
      }
      lastNotifTime = now;

      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail) {
        setNotification({ message: customEvent.detail.message, type: customEvent.detail.type });
        const timer = setTimeout(() => {
          if (!isUnmounted) setNotification(null);
        }, 3500);
        return () => clearTimeout(timer);
      }
    };
    window.addEventListener('collab-notif', handleCollabNotif);
    
    return () => {
      isUnmounted = true;
      window.removeEventListener('collab-notif', handleCollabNotif);
      // Bug 10 Cleanup: Revoke all object URLs when leaving the editor
      DataManager.revokeMediaUrls();
    };
  }, [setNotification]);

  // Handle Editor Commands from Extensions
  useEffect(() => {
    const handleEditorCommand = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail) {
        const { command, args } = customEvent.detail;
        if (command === 'insertBlock' && args && args[0]) {
          editor.chain().focus().insertBlock(args[0]).run();
        }
      }
    };
    window.addEventListener('editor-command', handleEditorCommand);
    return () => window.removeEventListener('editor-command', handleEditorCommand);
  }, [editor]);

  useEffect(() => {
    if (id) window.scrollTo(0, 0); // Scroll to top when opening a new page
  }, [id]);

  usePdfExport({ note, setNotification });
  
  // Expose current note state for extensions API
  useEffect(() => {
    if (note) {
      (window as any)._currentNoteState = {
        id: note.id,
        title: title,
        content: editor.blocks.map(b => b.content).join('\n'), // Simple plain text fallback or full state
        blocks: editor.blocks,
        description: description,
        tags: tags,
        emoji: emoji
      };
    }
  }, [note, title, editor.blocks, description, tags, emoji]);

  useEffect(() => {
    return () => {
      delete (window as any)._currentNoteState;
    };
  }, []);

  if (!editor || !note) {
    return <LoadingScreen />;
  }

  if (note.isLocked && !isUnlocked) {
    return (
      <EditorLockScreen
        note={note}
        isLight={isLight}
        setIsUnlocked={setIsUnlocked}
        navigate={navigate}
        notification={notification}
        setNotification={setNotification}
      />
    );
  }

  const focusLastBlockOnVoidClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isReadOnly) {
      const blockId = editor.blocks[editor.blocks.length - 1]?.id;
      if (blockId) {
        // High Performance Ref focus without triggering layout reflow via document.getElementById
        const el = blocksRefs.current[blockId];
        if (el) {
          el.focus();
          editor.setActiveBlockId(blockId);
        }
      }
    }
  };

  const modalContextValue = {
    note,
    theme,
    editor,
    collabRoom,
    activePeers,
    collaborators,
    currentSubPages,
    showActionSheet,
    setShowActionSheet,
    showBlockMenu,
    setShowBlockMenu,
    showThemeSelector,
    setShowThemeSelector,
    subPageMode,
    setSubPageMode,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showLockPrompt,
    setShowLockPrompt,
    showTagPrompt,
    setShowTagPrompt,
    showExportModal,
    setShowExportModal,
    showLinkPanel,
    setShowLinkPanel,
    isUploading,
    setIsUploading,
    isReadOnly,
    setIsReadOnly,
    handleCopy,
    handleLock,
    handleDelete,
    handleTagSaveSubmit,
    handleThemeSelect,
    handleAddSubPage,
    handleStartCollab,
    handleKickCollaborator,
    handleLinkPageSelect,
    noteRef,
  };

  return (
    <EditorModalProvider value={modalContextValue}>
      <div className={cn(
        "min-h-screen selection:bg-blue-500/30 font-sans transition-colors duration-300 overflow-x-hidden",
        isLight ? "bg-[#F1F1EF] text-[#37352F]" : "bg-[#1a1a1a] text-white"
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
          editor={editor}
          onNavigateToNote={(noteId) => {
            const collabParam = collabRoom ? `?collab=${collabRoom}` : '';
            navigate(`/editor/${noteId}${collabParam}`);
          }}
        />

        <main 
          className={cn(
            "pt-14 pb-48 max-w-4xl mx-auto min-h-screen transition-colors duration-300 mb-20",
            isLight ? "bg-white shadow-[0_0_80px_rgba(0,0,0,0.03)] border-x border-black/5" : "bg-[#1a1a1a]"
          )}
          onClick={focusLastBlockOnVoidClick}
        >
          <div className="px-6 md:px-20 pt-10 h-full min-h-[80vh] flex flex-col" onClick={focusLastBlockOnVoidClick}>
            {/* Title Area & Metadata Customizers */}
            <div className="flex flex-col mb-10 items-start w-full gap-4">
              <div className="relative group/emoji">
                <button
                  onClick={() => setShowPageEmojiPicker(!showPageEmojiPicker)}
                  className="text-5xl hover:scale-105 active:scale-95 transition-transform p-1.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer leading-none"
                  title="Change Emoji"
                >
                  {emoji || '📄'}
                </button>
                {showPageEmojiPicker && (
                  <div className="absolute top-16 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                    <div className="bg-[#1f1f1f] p-2 flex justify-end border-b border-white/5">
                      <button 
                        onClick={() => setShowPageEmojiPicker(false)}
                        className="p-1 hover:bg-white/10 rounded-lg text-white/50"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <EmojiPicker 
                      onEmojiClick={(emojiData) => {
                        updateEmoji(emojiData.emoji);
                        setShowPageEmojiPicker(false);
                      }}
                      theme={EmojiTheme.DARK}
                      width={320}
                      height={400}
                    />
                  </div>
                )}
              </div>

              <textarea
                autoFocus
                value={title}
                onFocus={() => setIsTitleFocused(true)}
                onBlur={() => setIsTitleFocused(false)}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="শিরোনামহীন"
                rows={1}
                className={cn(
                  "w-full bg-transparent text-4xl sm:text-5xl font-black focus:outline-none border-none ring-0 focus:ring-0 shadow-none tracking-tight resize-none leading-tight transition-colors",
                  isLight ? "text-gray-900 placeholder:text-gray-200" : "text-white placeholder:text-white/[0.05]"
                )}
              />

              <input
                type="text"
                value={description}
                onChange={(e) => updateDescription(e.target.value)}
                placeholder="পৃষ্ঠার বিবরণী লিখুন (Write page description...)"
                className={cn(
                  "w-full bg-transparent text-sm font-medium focus:outline-none border-none outline-none ring-0 focus:ring-0 shadow-none -mt-2 placeholder:opacity-30",
                  isLight ? "text-gray-500 placeholder:text-gray-400" : "text-white/60 placeholder:text-white/40"
                )}
              />
            </div>

            {/* Interactive Block-Editor Workspace */}
            <div 
              className={cn("relative pb-48 min-h-[70vh] transition-all flex border-0", themeClass)}
              data-darkreader-ignore={themeClass ? "true" : undefined}
              onClick={focusLastBlockOnVoidClick}
            >
              <CustomBlockEditor 
                editor={editor} 
                blocksRefs={blocksRefs}
                className={cn(
                  "prose max-w-none focus:outline-none pb-20 w-full",
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
          isTitleFocused={isTitleFocused}
        />

        <EditorModals />

        {notification && (
          <motion.div initial={{ y: -50 }} animate={{ y: 20 }} exit={{ y: -50 }} className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-full bg-white text-black text-xs font-black uppercase">
            {notification.message}
          </motion.div>
        )}
      </div>
    </EditorModalProvider>
  );
}
