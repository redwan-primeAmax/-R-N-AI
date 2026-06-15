/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { BlockMenu } from './BlockMenu';
import { LinkPageList } from './LinkPageList';
import { SubPageManager } from './SubPageManager';
import { EditorActionSheet } from './EditorActionSheet';
import { ConfirmDialog, InputDialog } from '../../../components/modals/CustomDialogs';
import { TagManagerModal } from '../../../components/modals/TagManagerModal';
import { ThemeSelectorModal } from '../../../components/modals/ThemeSelectorModal';
import { NoteExportModal } from '../../../components/modals/NoteExportModal';
import { MoveToBookmarkModal } from '../../../components/modals/MoveToBookmarkModal';
import LoadingScreen from '../../../components/LoadingScreen';
import { useEditorModal } from '../context/EditorModalContext';
import { DataManager } from '../../../services/storage/DataManager';

export const EditorModals: React.FC = () => {
  const {
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
    handleStartCollab,
    handleKickCollaborator,
    handleLinkPageSelect,
    noteRef,
  } = useEditorModal();

  const handleMoveToBookmark = async (folderId?: string) => {
    if (!note) return;
    await DataManager.addNoteToBookmark(note.id, folderId);
    setShowBookmarkModal(false);
    // Notify or redirect? The user said "if moved, hide from main screen", so we stay here or redirect to bookmarks
  };

  return (
    <>
      <BlockMenu 
        isOpen={showBlockMenu} 
        onClose={() => setShowBlockMenu(false)} 
        editor={editor}
        noteRef={noteRef}
        onUploadStart={() => setIsUploading(true)}
        onUploadComplete={() => setIsUploading(false)}
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
            currentNote={note} 
            type={subPageMode} 
            editor={editor}
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
        onBookmark={() => setShowBookmarkModal(true)}
        onExport={() => { setShowActionSheet(false); setShowExportModal(true); }}
        onTag={() => setShowTagPrompt(true)}
        onTheme={() => { setShowActionSheet(false); setShowThemeSelector(true); }}
        subPages={currentSubPages}
        onAddSubPage={handleAddSubPage}
        onStartCollab={handleStartCollab}
        isCollabActive={!!collabRoom}
        collabRoomId={collabRoom || undefined}
        collaborators={collaborators}
        onKickCollaborator={handleKickCollaborator}
        blocks={editor.blocks}
      />

      <MoveToBookmarkModal 
        isOpen={showBookmarkModal}
        onClose={() => setShowBookmarkModal(false)}
        onMove={handleMoveToBookmark}
        noteTitle={note?.title || 'Untitled'}
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

      <ThemeSelectorModal
        isOpen={showThemeSelector}
        onClose={() => setShowThemeSelector(false)}
        onSelect={handleThemeSelect}
        currentTheme={theme}
      />

      <NoteExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        note={note}
        onPdfExport={() => window.dispatchEvent(new CustomEvent('export-note-pdf'))}
      />

      {isUploading && <LoadingScreen />}
    </>
  );
};
