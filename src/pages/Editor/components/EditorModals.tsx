/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Note } from '../../../services/storage/DataManager';
import { BlockMenu } from './BlockMenu';
import { LinkPageList } from './LinkPageList';
import { SubPageManager } from './SubPageManager';
import { EditorActionSheet } from './EditorActionSheet';
import { ConfirmDialog, InputDialog } from '../../../components/modals/CustomDialogs';
import { TagManagerModal } from '../../../components/modals/TagManagerModal';
import { ThemeSelectorModal } from '../../../components/modals/ThemeSelectorModal';
import { NoteExportModal } from '../../../components/modals/NoteExportModal';
import LoadingScreen from '../../../components/LoadingScreen';

interface EditorModalsProps {
  note: Note;
  theme: string;
  editor: any;
  collabRoom: string | null;
  activePeers: number;
  collaborators: any[];
  currentSubPages: Note[];
  
  showActionSheet: boolean;
  setShowActionSheet: (val: boolean) => void;
  showBlockMenu: boolean;
  setShowBlockMenu: (val: boolean) => void;
  showThemeSelector: boolean;
  setShowThemeSelector: (val: boolean) => void;
  subPageMode: 'attach' | 'create' | null;
  setSubPageMode: (val: 'attach' | 'create' | null) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (val: boolean) => void;
  showLockPrompt: boolean;
  setShowLockPrompt: (val: boolean) => void;
  showTagPrompt: boolean;
  setShowTagPrompt: (val: boolean) => void;
  showExportModal: boolean;
  setShowExportModal: (val: boolean) => void;
  showLinkPanel: boolean;
  setShowLinkPanel: (val: boolean) => void;
  isUploading: boolean;
  setIsUploading: (val: boolean) => void;
  isReadOnly: boolean;
  setIsReadOnly: (val: boolean) => void;

  handleCopy: () => void;
  handleLock: (password: string) => void;
  handleDelete: () => void;
  handleTagSaveSubmit: (tags: string[]) => void;
  handleThemeSelect: (themeId: string) => void;
  handleAddSubPage: () => void;
  handleStartCollab: () => void;
  handleKickCollaborator: (peerId: string) => void;
  handleLinkPageSelect: (targetNote: any) => void;
  noteRef: React.MutableRefObject<Note | null>;
}

export const EditorModals: React.FC<EditorModalsProps> = ({
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
}) => {
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
