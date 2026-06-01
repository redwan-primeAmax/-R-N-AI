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
  password?: string;
  publishedCode?: string;
  lastPublishedContent?: string;
  mediaRefs?: { localId: string; type: string }[];
  lastSyncedAt?: number;
  lastOpenedAt?: number;
  description?: string;
  tags?: string[];
  theme?: string;
  isCollaborated?: boolean;
  collabRoomId?: string;
  // Compatibility with older/other areas
  category?: string;
  wordCount?: number;
  subPages?: string[];
  color?: string;
  hasMedia?: boolean;
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
