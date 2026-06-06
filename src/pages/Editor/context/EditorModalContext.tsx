/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Note } from '../../../services/storage/DataManager';

export interface EditorModalContextType {
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

const EditorModalContext = createContext<EditorModalContextType | undefined>(undefined);

export function useEditorModal() {
  const context = useContext(EditorModalContext);
  if (!context) {
    throw new Error('useEditorModal must be used within an EditorModalProvider');
  }
  return context;
}

interface EditorModalProviderProps {
  children: ReactNode;
  value: EditorModalContextType;
}

export const EditorModalProvider: React.FC<EditorModalProviderProps> = ({ children, value }) => {
  return (
    <EditorModalContext.Provider value={value}>
      {children}
    </EditorModalContext.Provider>
  );
};
