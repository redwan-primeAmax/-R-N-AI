/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import CustomBlockEditor from './components/CustomBlockEditor';
import { X } from 'lucide-react';

import { IconChange } from '../../components/icon/IconChange';
import { PageIcon } from '../../components/PageIcon';

import { useEditorState } from './hooks/useEditorState';
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
    editor, note, setNote, title, setTitle, emoji, setEmoji,
    tags, setTags, theme, setTheme, isSaving, saveError,
    activeTasksCount, workspaceName, parentNote, currentSubPages, setCurrentSubPages,
    notification, setNotification, isReadOnly, setIsReadOnly, isUnlocked, setIsUnlocked,
    saveNote, titleRef, emojiRef, noteRef, themeRef, blocksRef, isDeletingRef
  } = useEditorState(id, blocksRefs as any);

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
    showBookmarkModal, setShowBookmarkModal,
    isLight, themeClass,
    showLinkPanel, setShowLinkPanel,
    isTitleFocused, setIsTitleFocused,
    isUploading, setIsUploading,
    showPageEmojiPicker, setShowPageEmojiPicker,
    handleLinkPageSelect, handleBack,
    updateTitle, updateEmoji,
    handleDelete, handleCopy, handleLock,
    handleTagSaveSubmit, handleThemeSelect, handleAddSubPage
  } = useEditorHandlers({
    id, note, editor, title, emoji, theme, tags, currentSubPages,
    setNote, setTitle, setEmoji, setTags, setTheme, setNotification,
    setIsReadOnly, isReadOnly, saveNote, titleRef, emojiRef, noteRef, themeRef, blocksRef,
    isDeletingRef
  });

  // Additional event sync & listening setup with throttling guard to prevent DOM flooding
  useEffect(() => {
    return () => {
      // Bug 10 Cleanup: Revoke all object URLs when leaving the editor
      DataManager.revokeMediaUrls();
    };
  }, []);

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
        tags: tags,
        emoji: emoji
      };
    }
  }, [note, title, editor.blocks, tags, emoji]);

  useEffect(() => {
    return () => {
      delete (window as any)._currentNoteState;
    };
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, [title]);

  const handleToggleWidth = async () => {
    if (!note) return;
    const nextWidth = note.pageWidth === 'full' ? 'default' : 'full';
    const updated = { ...note, pageWidth: nextWidth as any };
    setNote(updated);
    await DataManager.saveNote(updated);
  };

  const modalContextValue = useMemo(() => ({
    note,
    theme,
    editor,
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
    showBookmarkModal,
    setShowBookmarkModal,
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
    handleLinkPageSelect,
    noteRef
  }), [
    note, theme, editor, currentSubPages,
    showActionSheet, showBlockMenu, showThemeSelector, subPageMode, showDeleteConfirm,
    showLockPrompt, showTagPrompt, showExportModal, showBookmarkModal, showLinkPanel,
    isUploading, isReadOnly, handleCopy, handleLock, handleDelete, handleTagSaveSubmit,
    handleThemeSelect, handleAddSubPage,
    handleLinkPageSelect, noteRef
  ]);

  const anyModalOpen = showActionSheet || showBlockMenu || showThemeSelector || 
                       showDeleteConfirm || showLockPrompt || showTagPrompt || 
                       showExportModal || showBookmarkModal || showLinkPanel;

  if (note?.isLocked && !isUnlocked) {
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
      const blockId = editor?.blocks[editor.blocks.length - 1]?.id;
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

  return (
    <EditorModalProvider value={modalContextValue}>
      <div className={cn(
        "min-h-screen selection:bg-blue-500/30 font-sans transition-colors duration-300",
        isLight ? "bg-[#F1F1EF] text-[#37352F]" : "bg-[#1a1a1a] text-white"
      )}>
        <EditorHeader 
          onBack={handleBack}
          workspaceName={workspaceName}
          parentNote={parentNote}
          title={title}
          activeTasksCount={activeTasksCount}
          onShowMenu={() => setShowActionSheet(true)}
          editor={editor}
          isSaving={isSaving}
          saveError={saveError}
          onNavigateToNote={(noteId) => {
            navigate(`/editor/${noteId}`);
          }}
        />

        <main 
          className={cn(
            "pt-14 max-w-4xl mx-auto min-h-screen transition-colors duration-300",
            isLight ? "bg-white shadow-[0_0_80px_rgba(0,0,0,0.03)] border-x border-black/5" : "bg-[#1a1a1a]"
          )}
          style={{ paddingBottom: 'calc(14rem + var(--kb-offset, 0px))' }}
          onClick={focusLastBlockOnVoidClick}
        >
          <div className="px-6 md:px-20 pt-10 h-full min-h-[80vh] flex flex-col" onClick={focusLastBlockOnVoidClick}>
            {!editor || !note ? (
              <div className="flex flex-col gap-6 animate-pulse">
                <div className="w-16 h-16 bg-white/5 rounded-2xl" />
                <div className="h-12 w-3/4 bg-white/5 rounded-xl" />
                <div className="space-y-3 mt-8">
                  <div className="h-4 bg-white/5 rounded w-full" />
                  <div className="h-4 bg-white/5 rounded w-5/6" />
                  <div className="h-4 bg-white/5 rounded w-4/6" />
                </div>
              </div>
            ) : (
              <>
                {/* Title Area & Metadata Customizers */}
                <div className="flex flex-col mb-10 items-start w-full gap-4">
                  <div className="relative group/emoji">
                    <button
                      onClick={() => setShowPageEmojiPicker(!showPageEmojiPicker)}
                      className="text-5xl hover:scale-105 active:scale-95 transition-transform p-1.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer leading-none flex items-center justify-center"
                      title="Change Icon"
                    >
                      <PageIcon emoji={emoji} className="text-5xl" fallback="📄" />
                    </button>
                    <IconChange 
                      isOpen={showPageEmojiPicker}
                      onClose={() => setShowPageEmojiPicker(false)}
                      onSelectIcon={(svg) => {
                        updateEmoji(svg);
                      }}
                      currentIcon={emoji}
                    />
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={title}
                    onFocus={() => {
                      setIsTitleFocused(true);
                    }}
                    onBlur={() => setIsTitleFocused(false)}
                    onChange={(e) => updateTitle(e.target.value)}
                    placeholder="শিরোনামহীন"
                    rows={1}
                    className={cn(
                      "w-full bg-transparent text-4xl sm:text-5xl font-black focus:outline-none border-none ring-0 focus:ring-0 shadow-none tracking-tight resize-none leading-tight transition-colors overflow-hidden",
                      isLight ? "text-gray-900 placeholder:text-gray-200" : "text-white placeholder:text-white/[0.05]"
                    )}
                  />
                </div>

                {/* Interactive Block-Editor Workspace */}
                <div 
                  className={cn("relative min-h-[70vh] transition-all flex flex-col w-full border-0", themeClass)}
                  data-darkreader-ignore={themeClass ? "true" : undefined}
                  onClick={focusLastBlockOnVoidClick}
                >
                  <CustomBlockEditor 
                    editor={editor} 
                    blocksRefs={blocksRefs}
                    noteId={id}
                    className={cn(
                      "prose max-w-none focus:outline-none pb-20 w-full",
                      !isLight && "prose-invert",
                      isReadOnly && "select-none text-muted-foreground"
                    )} 
                  />
                </div>
              </>
            )}
          </div>
        </main>

        {editor && (
          <EditorToolbar 
            editor={editor}
            onPlusClick={() => setShowBlockMenu(true)}
            isReadOnly={isReadOnly}
            isLight={isLight}
            isTitleFocused={isTitleFocused}
          />
        )}

        {anyModalOpen && <EditorModals />}

        {notification && (
          <motion.div initial={{ y: -50 }} animate={{ y: 20 }} exit={{ y: -50 }} className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-full bg-white text-black text-xs font-black uppercase">
            {notification.message}
          </motion.div>
        )}
      </div>
    </EditorModalProvider>
  );
}
