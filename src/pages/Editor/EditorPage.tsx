/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import CustomBlockEditor, { blocksToHtml } from './components/CustomBlockEditor';

import { useEditorState } from './hooks/useEditorState';
import { useCollaboration } from './hooks/useCollaboration';
import { usePdfExport } from './hooks/usePdfExport';
import { useEditorHandlers } from './hooks/useEditorHandlers';

import { EditorHeader } from './components/EditorHeader';
import { EditorToolbar } from './components/EditorToolbar';
import { EditorLockScreen } from './components/EditorLockScreen';
import { EditorModals } from './components/EditorModals';
import LoadingScreen from '../../components/LoadingScreen';

import { cn } from '../../utils/cn';

export default function EditorPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <EditorPage id={id} />;
}

function EditorPage({ id }: { id: string | undefined }) {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    editor, note, setNote, title, setTitle, emoji, setEmoji, description, setDescription, 
    tags, setTags, theme, setTheme,
    activeTasksCount, workspaceName, parentNote, currentSubPages, setCurrentSubPages,
    notification, setNotification, isReadOnly, setIsReadOnly, isUnlocked, setIsUnlocked,
    saveNote, titleRef, emojiRef, descriptionRef, noteRef, themeRef, blocksRef
  } = useEditorState(id);

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

  // Additional event sync & listening setup
  useEffect(() => {
    const handleCollabNotif = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail) {
        setNotification({ message: customEvent.detail.message, type: customEvent.detail.type });
        setTimeout(() => setNotification(null), 3500);
      }
    };
    window.addEventListener('collab-notif', handleCollabNotif);
    return () => window.removeEventListener('collab-notif', handleCollabNotif);
  }, [setNotification]);

  useEffect(() => {
    if (id) window.scrollTo(0, 0); // Scroll to top when opening a new page
  }, [id]);

  usePdfExport({ note, setNotification });

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
        document.getElementById(blockId)?.focus();
        editor.setActiveBlockId(blockId);
      }
    }
  };

  return (
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
                <div className="absolute top-16 left-0 z-50 p-3 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl flex gap-1.5 flex-wrap w-64 backdrop-blur-lg">
                  {['📄', '📝', '📓', '💡', '📌', '🚀', '🎯', '⭐', '🎨', '🔥', '⚙️', '📂', '📅', '🧠', '💼'].map((em) => (
                    <button
                      key={em}
                      onClick={() => { updateEmoji(em); setShowPageEmojiPicker(false); }}
                      className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-xl transition-all active:scale-90"
                    >
                      {em}
                    </button>
                  ))}
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

      <EditorModals
        note={note}
        theme={theme}
        editor={editor}
        collabRoom={collabRoom}
        activePeers={activePeers}
        collaborators={collaborators}
        currentSubPages={currentSubPages}
        showActionSheet={showActionSheet}
        setShowActionSheet={setShowActionSheet}
        showBlockMenu={showBlockMenu}
        setShowBlockMenu={setShowBlockMenu}
        showThemeSelector={showThemeSelector}
        setShowThemeSelector={setShowThemeSelector}
        subPageMode={subPageMode}
        setSubPageMode={setSubPageMode}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        showLockPrompt={showLockPrompt}
        setShowLockPrompt={setShowLockPrompt}
        showTagPrompt={showTagPrompt}
        setShowTagPrompt={setShowTagPrompt}
        showExportModal={showExportModal}
        setShowExportModal={setShowExportModal}
        showLinkPanel={showLinkPanel}
        setShowLinkPanel={setShowLinkPanel}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        isReadOnly={isReadOnly}
        setIsReadOnly={setIsReadOnly}
        handleCopy={handleCopy}
        handleLock={handleLock}
        handleDelete={handleDelete}
        handleTagSaveSubmit={handleTagSaveSubmit}
        handleThemeSelect={handleThemeSelect}
        handleAddSubPage={handleAddSubPage}
        handleStartCollab={handleStartCollab}
        handleKickCollaborator={handleKickCollaborator}
        handleLinkPageSelect={handleLinkPageSelect}
        noteRef={noteRef}
      />

      {notification && (
        <motion.div initial={{ y: -50 }} animate={{ y: 20 }} exit={{ y: -50 }} className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-full bg-white text-black text-xs font-black uppercase">
          {notification.message}
        </motion.div>
      )}
    </div>
  );
}
