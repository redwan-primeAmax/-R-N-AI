/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NoteSnapshot {
  id: string;
  timestamp: number;
  content: string;
}

export interface NoteCommentReply {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

export interface NoteComment {
  id: string;
  blockId?: string;
  author: string;
  text: string;
  resolved: boolean;
  createdAt: number;
  replies?: NoteCommentReply[];
}

export interface ReminderItem {
  id: string;
  at: number;
  message: string;
  sent: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  emoji: string;
  createdAt: number;
  updatedAt: number;
  workspaceId?: string;
  parentId?: string;
  fontFamily?: string;
  isFavorite?: boolean;
  isTrashed?: boolean;
  isLocked?: boolean;
  isPinned?: boolean;
  isBookmarked?: boolean;
  bookmarkFolderId?: string;
  password?: string;
  publishedCode?: string;
  lastPublishedContent?: string;
  mediaRefs?: { localId: string; type: string }[];
  lastSyncedAt?: number;
  lastOpenedAt?: number;
  tags?: string[];
  theme?: string;
  isCollaborated?: boolean;
  collabRoomId?: string;
  category?: string;
  wordCount?: number;
  subPages?: string[];
  color?: string;
  hasMedia?: boolean;

  // New features
  coverImage?: string;
  coverPosition?: number; // 0-100
  pageWidth?: 'default' | 'full';
  reminders?: ReminderItem[];
  comments?: NoteComment[];
  snapshots?: NoteSnapshot[];
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt?: number;
  noteIds?: string[];
  description?: string;
  icon?: string;
  logoSvg?: string;
}

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  content: string;
  emoji: string;
  version: string;
  createdAt: number;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: number;
}

// Database Block Extended Types
export interface DatabaseFilter {
  columnId: string;
  operator: '=' | 'not-equal' | 'contains' | 'greater' | 'less' | 'empty';
  value: string;
}

export interface DatabaseSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface DatabaseView {
  id: string;
  name: string;
  type: 'table' | 'board' | 'list';
  filters?: DatabaseFilter[];
  sorts?: DatabaseSort[];
  groupBy?: string;
}

export interface RollupConfig {
  relationColumn: string;
  targetProperty: string;
  aggregate: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

export interface DatabaseRelation {
  fromColumn: string;
  toDatabaseId: string;
  toColumn: string;
}
