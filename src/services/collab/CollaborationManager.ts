/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { YjsBridge } from './YjsBridge';
import { PeerTransport, TransportEvent } from './PeerTransport';
import { 
  SyncSnapshot, SessionInfo, SessionRole, ConnectionState, 
  Collaborator, ManagerEvent, HostOptions, JoinOptions, StatusEvent 
} from './types';
import { DataManager } from '../storage/DataManager';
import CryptoJS from 'crypto-js';

interface Session {
  noteId: string;
  bridge: YjsBridge;
  transport: PeerTransport;
  role: SessionRole;
  passwordHash?: string;
  memberLimit: number;
  authenticatedPeers: Set<string>;
  collaborators: Map<string, Collaborator>;
  lastPersistTime: number;
  persistTimer?: NodeJS.Timeout;
}

export class CollaborationManager {
  private sessions: Map<string, Session> = new Map();
  private listeners: Set<(ev: ManagerEvent) => void> = new Set();
  private activeNoteId: string | null = null;
  private presenceSweeper: NodeJS.Timeout | null = null;

  private readonly PERSIST_DEBOUNCE_MS = 1500;
  private readonly PRESENCE_TIMEOUT_MS = 30000;
  private readonly ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';

  constructor() {
    this.startPresenceSweeper();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushAll());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flushAll();
      });
    }
  }

  public subscribe(fn: (ev: ManagerEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(ev: ManagerEvent) {
    this.listeners.forEach(fn => fn(ev));
  }

  public setActiveNoteId(id: string | null) {
    this.activeNoteId = id;
  }

  private getOrCreateSession(noteId: string, role: SessionRole, roomId: string, opts: HostOptions | JoinOptions = {}): Session {
    const existing = this.sessions.get(noteId);
    if (existing) return existing;

    const bridge = new YjsBridge();
    const transport = new PeerTransport(roomId, role === 'host' ? 'host' : 'guest');
    
    const session: Session = {
      noteId,
      bridge,
      transport,
      role,
      memberLimit: (opts as HostOptions).memberLimit || 10,
      authenticatedPeers: new Set(),
      collaborators: new Map(),
      lastPersistTime: 0
    };

    if ((opts as HostOptions).password) {
      session.passwordHash = CryptoJS.SHA256((opts as HostOptions).password!).toString();
    }

    bridge.subscribe((snapshot) => {
      this.emit({ type: 'state', noteId, snapshot });
      this.schedulePersist(session);
    });

    transport.on((ev) => this.handleTransportEvent(session, ev));
    
    this.sessions.set(noteId, session);
    return session;
  }

  private handleTransportEvent(session: Session, ev: TransportEvent) {
    const { noteId, bridge, transport, role } = session;

    switch (ev.type) {
      case 'open':
        this.emitSessionInfo(session);
        break;
      
      case 'state':
        this.emitSessionInfo(session);
        break;

      case 'peer-open':
        if (role === 'host') {
          // Check member limit
          if (transport.getPeerIds().length > session.memberLimit) {
            transport.send(ev.peerId, { t: 'af', r: 'Session full' });
            transport.closePeer(ev.peerId);
            return;
          }

          if (session.passwordHash) {
            transport.send(ev.peerId, { t: 'aq' }); // Auth required
          } else {
            session.authenticatedPeers.add(ev.peerId);
            transport.send(ev.peerId, { t: 'sv', v: Array.from(bridge.getStateVector()) });
          }
        } else {
          // Guest joined
          transport.send(ev.peerId, { t: 'sv', v: Array.from(bridge.getStateVector()) });
        }
        break;

      case 'peer-close':
        session.authenticatedPeers.delete(ev.peerId);
        session.collaborators.delete(ev.peerId);
        this.emitSessionInfo(session);
        break;

      case 'data':
        this.handleProtocolMessage(session, ev.peerId, ev.payload);
        break;

      case 'error':
        this.emit({ 
          type: 'status', 
          noteId, 
          status: { text: ev.message, type: 'error', timestamp: Date.now() } 
        });
        break;
    }
  }

  private handleProtocolMessage(session: Session, peerId: string, msg: any) {
    const { role, bridge, transport, noteId } = session;

    // Auth gate for host
    if (role === 'host' && session.passwordHash && !session.authenticatedPeers.has(peerId) && msg.t !== 'ar') {
      return;
    }

    switch (msg.t) {
      case 'aq': // Auth required (sent to guest)
        this.emit({ type: 'auth-required', noteId, roomId: transport.getRoomId() });
        break;

      case 'ar': // Auth response (sent to host)
        if (role === 'host' && session.passwordHash) {
          if (msg.h === session.passwordHash) {
            session.authenticatedPeers.add(peerId);
            transport.send(peerId, { t: 'ao' });
            transport.send(peerId, { t: 'sv', v: Array.from(bridge.getStateVector()) });
          } else {
            transport.send(peerId, { t: 'af', r: 'Invalid password' });
            transport.closePeer(peerId);
          }
        }
        break;

      case 'ao': // Auth OK
        this.emit({ type: 'status', noteId, status: { text: 'Connected successfully', type: 'success', timestamp: Date.now() } });
        break;

      case 'af': // Auth fail
        this.emit({ type: 'status', noteId, status: { text: msg.r || 'Authentication failed', type: 'error', timestamp: Date.now() } });
        this.disconnect(noteId);
        break;

      case 'sv': // State vector request
        const update = bridge.getDiff(new Uint8Array(msg.v));
        transport.send(peerId, { t: 'su', u: Array.from(update) });
        break;

      case 'su': // State update
        bridge.applyUpdate(new Uint8Array(msg.u));
        if (role === 'host') {
          transport.broadcast(msg, peerId); // Relay to others
        }
        break;

      case 'aw': // Awareness / Cursor
        const collab = session.collaborators.get(peerId) || {
          id: peerId,
          name: msg.n || 'Anonymous',
          color: msg.c || '#CBD5E1',
          cursorBlockId: null,
          lastSeen: Date.now()
        };
        collab.cursorBlockId = msg.b;
        collab.lastSeen = Date.now();
        session.collaborators.set(peerId, collab);
        
        if (role === 'host') {
          transport.broadcast(msg, peerId); // Relay
        }
        this.emitSessionInfo(session);
        break;

      case 'kk': // Kick
        this.emit({ type: 'status', noteId, status: { text: 'Removed by host', type: 'warning', timestamp: Date.now() } });
        this.disconnect(noteId);
        break;
    }
  }

  private emitSessionInfo(session: Session) {
    const info: SessionInfo = {
      noteId: session.noteId,
      roomId: session.transport.getRoomId(),
      role: session.role,
      connection: (session.transport as any).state || 'idle', // Accessing private state safely for UI
      peerCount: session.transport.getPeerIds().length,
      collaborators: Array.from(session.collaborators.values()),
      hasPassword: !!session.passwordHash,
      memberLimit: session.memberLimit
    };
    this.emit({ type: 'session', noteId: session.noteId, info });
  }

  public async hostSession(noteId: string, opts: HostOptions = {}): Promise<string> {
    const roomId = opts.roomId || this.generateRoomId();
    const session = this.getOrCreateSession(noteId, 'host', roomId, opts);
    
    // If starting fresh, apply current local DB state to Yjs
    const note = await DataManager.getNoteById(noteId);
    if (note) {
      const snap: SyncSnapshot = {
        noteId: note.id,
        title: note.title || '',
        emoji: note.emoji || '📄',
        theme: note.theme || 'default',
        blocks: (window as any).htmlToBlocks ? (window as any).htmlToBlocks(note.content) : [],
        parentId: note.parentId
      };
      session.bridge.applyLocalState(snap);
    }

    session.transport.start();
    return roomId;
  }

  public async joinSession(roomId: string, opts: JoinOptions = {}): Promise<void> {
    const noteId = opts.targetNoteId || `remote_${roomId}`;
    const session = this.getOrCreateSession(noteId, 'guest', roomId, opts);
    
    if (opts.password) {
      const hash = CryptoJS.SHA256(opts.password).toString();
      session.transport.on((ev) => {
        if (ev.type === 'data' && ev.payload.t === 'aq') {
          session.transport.send(ev.peerId, { t: 'ar', h: hash });
        }
      });
    }

    session.transport.start();

    // Timeout logic
    const timeout = opts.timeoutMs || 15000;
    setTimeout(() => {
      const s = this.sessions.get(noteId);
      if (s && !s.transport.isConnected()) {
        this.emit({ type: 'status', noteId, status: { text: 'Connection timeout', type: 'error', timestamp: Date.now() } });
      }
    }, timeout);
  }

  public updateLocalState(snap: SyncSnapshot) {
    const session = this.sessions.get(snap.noteId);
    if (!session) return;
    
    session.bridge.applyLocalState(snap);
    
    // Host broadcasts updates to all
    if (session.role === 'host') {
      const update = session.bridge.getDocUpdate();
      session.transport.broadcast({ t: 'su', u: Array.from(update) });
    } else {
      const update = session.bridge.getDocUpdate();
      session.transport.broadcast({ t: 'su', u: Array.from(update) });
    }
  }

  public updateCursor(noteId: string, blockId: string | null) {
    const session = this.sessions.get(noteId);
    if (!session) return;

    const userName = localStorage.getItem('user_name') || 'Anonymous';
    const userColor = localStorage.getItem('user_color') || '#D97757';

    session.transport.broadcast({
      t: 'aw',
      b: blockId,
      n: userName,
      c: userColor
    });
  }

  public kickCollaborator(noteId: string, peerId: string) {
    const session = this.sessions.get(noteId);
    if (session && session.role === 'host') {
      session.transport.send(peerId, { t: 'kk' });
      session.transport.closePeer(peerId);
    }
  }

  public disconnect(noteId: string) {
    const session = this.sessions.get(noteId);
    if (session) {
      this.flushSession(session);
      session.transport.destroy();
      session.bridge.destroy();
      this.sessions.delete(noteId);
    }
  }

  private schedulePersist(session: Session) {
    if (session.persistTimer) clearTimeout(session.persistTimer);
    session.persistTimer = setTimeout(() => this.persist(session.noteId), this.PERSIST_DEBOUNCE_MS);
  }

  private async persist(noteId: string) {
    const session = this.sessions.get(noteId);
    if (!session) return;

    const snap = session.bridge.snapshot();
    const existing = await DataManager.getNoteById(noteId);
    
    // Check if content/metadata changed compared to what we have in DB
    const content = (window as any).blocksToHtml ? (window as any).blocksToHtml(snap.blocks) : '';
    
    const hasChanges = !existing || 
      existing.title !== snap.title ||
      existing.emoji !== snap.emoji ||
      existing.theme !== snap.theme ||
      existing.content !== content;

    if (hasChanges) {
      await DataManager.saveNote({
        ...(existing || { id: noteId, createdAt: Date.now(), workspaceId: 'default' }),
        title: snap.title,
        emoji: snap.emoji,
        theme: snap.theme,
        content,
        parentId: snap.parentId || undefined,
        updatedAt: Date.now()
      });
      session.lastPersistTime = Date.now();
    }
  }

  private flushAll() {
    this.sessions.forEach(s => this.flushSession(s));
  }

  private flushSession(session: Session) {
    if (session.persistTimer) clearTimeout(session.persistTimer);
    this.persist(session.noteId);
  }

  private startPresenceSweeper() {
    this.presenceSweeper = setInterval(() => {
      const now = Date.now();
      this.sessions.forEach(session => {
        let changed = false;
        session.collaborators.forEach((c, id) => {
          if (now - c.lastSeen > this.PRESENCE_TIMEOUT_MS) {
            session.collaborators.delete(id);
            changed = true;
          }
        });
        if (changed) this.emitSessionInfo(session);
      });
    }, 15000);
  }

  private generateRoomId(): string {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    let id = '';
    for (let i = 0; i < 10; i++) {
      id += this.ALPHABET[bytes[i] % this.ALPHABET.length];
    }
    return id;
  }

  public getSessionInfo(noteId: string): SessionInfo | null {
    const session = this.sessions.get(noteId);
    if (!session) return null;
    return {
      noteId: session.noteId,
      roomId: session.transport.getRoomId(),
      role: session.role,
      connection: (session.transport as any).state || 'idle',
      peerCount: session.transport.getPeerIds().length,
      collaborators: Array.from(session.collaborators.values()),
      hasPassword: !!session.passwordHash,
      memberLimit: session.memberLimit
    };
  }

  public getSnapshot(noteId: string): SyncSnapshot | null {
    const session = this.sessions.get(noteId);
    return session ? session.bridge.snapshot() : null;
  }
}

export const collabManager = new CollaborationManager();
