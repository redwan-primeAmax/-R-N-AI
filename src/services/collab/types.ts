/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EditorBlock } from '../../utils/blockParser';

export type SessionRole = 'idle' | 'host' | 'guest';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursorBlockId: string | null;
  lastSeen: number;
}

export interface SessionInfo {
  noteId: string;
  roomId: string;
  role: SessionRole;
  connection: ConnectionState;
  peerCount: number;
  collaborators: Collaborator[];
  hasPassword?: boolean;
  memberLimit?: number;
}

export interface SyncSnapshot {
  noteId: string;
  title: string;
  emoji: string;
  theme: string;
  blocks: EditorBlock[];
  parentId?: string | null;
  subPages?: SubPageSnapshot[];
}

export interface SubPageSnapshot {
  id: string;
  title: string;
  emoji: string;
  theme: string;
  parentId: string | null;
  workspaceId: string;
  updatedAt: number;
  createdAt: number;
  isTrashed: boolean;
}

export interface HostOptions {
  roomId?: string;
  password?: string;
  memberLimit?: number;
}

export interface JoinOptions {
  password?: string;
  targetNoteId?: string;
  timeoutMs?: number;
}

export interface StatusEvent {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: number;
}

export type ManagerEvent = 
  | { type: 'state'; noteId: string; snapshot: SyncSnapshot }
  | { type: 'session'; noteId: string; info: SessionInfo }
  | { type: 'status'; noteId: string; status: StatusEvent }
  | { type: 'auth-required'; noteId: string; roomId: string };
