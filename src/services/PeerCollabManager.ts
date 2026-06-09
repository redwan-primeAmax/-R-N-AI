import * as Y from 'yjs';
import { Peer, DataConnection } from 'peerjs';
import { EditorBlock, blocksToHtml } from '../utils/blockParser';
import { DataManager } from './storage/DataManager';

// Helper to apply string diff to Y.Text in-place for atomic keyboard-stroke synchronization
export function applyStringDiff(yText: Y.Text, newStr: string) {
  const oldStr = yText.toString();
  if (oldStr === newStr) return;

  let start = 0;
  while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
    start++;
  }

  let oldEnd = oldStr.length - 1;
  let newEnd = newStr.length - 1;
  while (oldEnd >= start && newEnd >= start && oldStr[oldEnd] === newStr[oldEnd]) {
    oldEnd--;
    newEnd--;
  }

  if (oldEnd >= start) {
    yText.delete(start, oldEnd - start + 1);
  }
  if (newEnd >= start) {
    yText.insert(start, newStr.substring(start, newEnd + 1));
  }
}

export interface CollabMeta {
  title: string;
  emoji: string;
  description: string;
  theme: string;
}

export type CollabMessage =
  | { type: 'sync-vector'; vector: number[] }
  | { type: 'sync-update'; update: number[] }
  | { type: 'client-cursor'; userId: string; blockId: string | null; cursorIndex: number }
  | { type: 'sync-meta'; meta: CollabMeta }
  | { type: 'kick-peer'; targetId: string }
  | { type: 'auth-required'; method: 'password' }
  | { type: 'auth-response'; password?: string }
  | { type: 'auth-failed'; reason: string }
  | { type: 'session-info'; maxMembers: number; currentMembers: number };

interface SessionData {
  noteId: string;
  yDoc: Y.Doc;
  peer: Peer | null;
  connections: Map<string, DataConnection>;
  roomId: string | null;
  isHosting: boolean;
  password: string | null;
  memberLimit: number;
  authenticatedPeers: Set<string>;
  collaborators: Map<string, { id: string, name: string }>;
  isSeeded: boolean;
}

export class PeerCollabManager {
  private sessions: Map<string, SessionData> = new Map();
  public activeNoteId: string | null = null;
  
  private stateListeners: Set<(data: any) => void> = new Set();
  private statusListeners: Set<(msg: string, type: 'info' | 'success' | 'error') => void> = new Set();

  // Track debounced timeouts per session/noteId to prevent disk write loops
  private persistTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // A flag to prevent loop updates between React and Yjs
  public isApplyingRemoteUpdate: boolean = false;

  constructor() {}

  public setActiveNoteId(noteId: string) {
    this.activeNoteId = noteId;
    // When switching active note, immediately trigger a refresh
    this.triggerReactCallback();
  }

  private getSession(noteId: string): SessionData {
    let session = this.sessions.get(noteId);
    if (!session) {
      const yDoc = new Y.Doc();
      session = {
        noteId,
        yDoc,
        peer: null,
        connections: new Map(),
        roomId: null,
        isHosting: false,
        password: null,
        memberLimit: 10,
        authenticatedPeers: new Set(),
        collaborators: new Map(),
        isSeeded: false
      };
      this.sessions.set(noteId, session);
      this.setupYjsListeners(session);
    }
    return session;
  }

  private setupYjsListeners(session: SessionData) {
    session.yDoc.on('update', (update, origin) => {
      if (origin !== 'remote') {
        const updateArray = Array.from(update);
        this.broadcast(session, {
          type: 'sync-update',
          update: updateArray
        });
      }

      // Debounce disk persist triggers during fast collaborative keystroke events
      const noteId = session.noteId;
      if (this.persistTimeouts.has(noteId)) {
        clearTimeout(this.persistTimeouts.get(noteId));
      }
      const timeout = setTimeout(() => {
        this.persistToDisk(session);
        this.persistTimeouts.delete(noteId);
      }, 1500); // 1.5 seconds write barrier avoids thread choke
      this.persistTimeouts.set(noteId, timeout);
      
      if (this.activeNoteId === session.noteId) {
        this.triggerReactCallback();
      }
    });
  }

  private async persistToDisk(session: SessionData) {
    if (!session.isSeeded) return;
    const state = this.getReactState(session.noteId);
    if (!state.noteId) return;

    try {
      const existing = await DataManager.getNoteById(state.noteId);
      if (existing) {
        const contentHtml = blocksToHtml(state.blocks);
        if (
          existing.content !== contentHtml || 
          existing.title !== state.title || 
          existing.emoji !== state.emoji ||
          existing.theme !== state.theme
        ) {
          await DataManager.saveNote({
            ...existing,
            title: state.title,
            emoji: state.emoji,
            description: state.description,
            theme: state.theme,
            content: contentHtml,
            updatedAt: Date.now()
          });
        }
      }
    } catch (err) {
      console.error('Background persistence failed', err);
    }
  }

  public registerCallbacks(
    onStateChanged: (data: any) => void,
    onStatusMessage: (msg: string, type: 'info' | 'success' | 'error') => void
  ) {
    this.stateListeners.add(onStateChanged);
    this.statusListeners.add(onStatusMessage);
    return () => {
      this.stateListeners.delete(onStateChanged);
      this.statusListeners.delete(onStatusMessage);
    };
  }

  public getReactState(noteId?: string) {
    const id = noteId || this.activeNoteId;
    if (!id) return { title: '', emoji: '📝', description: '', theme: 'default', blocks: [], noteId: '', parentId: '', syncedSubPages: [] };
    
    const session = this.getSession(id);

    const metaMap = session.yDoc.getMap<string>('metadata');
    const title = metaMap.get('title') || '';
    const emoji = metaMap.get('emoji') || '📝';
    const description = metaMap.get('description') || '';
    const theme = metaMap.get('theme') || 'default';
    const parentId = metaMap.get('parentId') || '';

    const orderArray = session.yDoc.getArray<string>('blocksOrder');
    const dataMap = session.yDoc.getMap<Y.Map<any>>('blocksData');

    const blocks: EditorBlock[] = [];
    orderArray.forEach((blockId) => {
      const bMap = dataMap.get(blockId);
      if (bMap) {
        const type = bMap.get('type') || 'paragraph';
        const yText = bMap.get('content') as Y.Text | undefined;
        const content = yText ? yText.toString() : (bMap.get('contentText') || '');
        const checked = bMap.get('checked') === true;
        const language = bMap.get('language') || 'javascript';
        const blockEmoji = bMap.get('emoji') || '💡';
        
        let tableData: string[][] | undefined = undefined;
        const tRaw = bMap.get('tableData');
        if (tRaw) {
          try { tableData = typeof tRaw === 'string' ? JSON.parse(tRaw) : tRaw; } catch (e) {}
        }

        let mediaData: any = undefined;
        const mRaw = bMap.get('mediaData');
        if (mRaw) {
          try { mediaData = typeof mRaw === 'string' ? JSON.parse(mRaw) : mRaw; } catch (e) {}
        }

        blocks.push({ id: blockId, type, content, checked, language, emoji: blockEmoji, tableData, mediaData });
      }
    });

    let syncedSubPages: any[] = [];
    const subpagesArray = session.yDoc.getArray<any>('subpages-list');
    syncedSubPages = subpagesArray.toArray();

    return { title, emoji, description, theme, blocks, noteId: id, parentId, syncedSubPages };
  }

  public triggerReactCallback(noteId?: string) {
    const id = noteId || this.activeNoteId;
    if (id) {
      const state = this.getReactState(id);
      this.stateListeners.forEach(listener => listener(state));
    }
  }

  public updateFromLocalState(data: {
    blocks: EditorBlock[];
    title: string;
    emoji: string;
    description: string;
    theme: string;
    noteId?: string;
    parentId?: string;
    subPages?: any[];
  }) {
    if (this.isApplyingRemoteUpdate) return;
    const noteId = data.noteId || this.activeNoteId;
    if (!noteId) return;

    const session = this.getSession(noteId);
    session.isSeeded = true;

    session.yDoc.transact(() => {
      const metaMap = session.yDoc.getMap<string>('metadata');
      if (metaMap.get('title') !== data.title) metaMap.set('title', data.title);
      if (metaMap.get('emoji') !== data.emoji) metaMap.set('emoji', data.emoji);
      if (metaMap.get('description') !== data.description) metaMap.set('description', data.description);
      if (metaMap.get('theme') !== data.theme) metaMap.set('theme', data.theme);
      if (metaMap.get('noteId') !== noteId) metaMap.set('noteId', noteId);
      if (data.parentId && metaMap.get('parentId') !== data.parentId) metaMap.set('parentId', data.parentId);

      if (data.subPages) {
        const subpagesArray = session.yDoc.getArray<any>('subpages-list');
        const currentSubRaw = data.subPages.map(sub => ({
          id: sub.id,
          title: sub.title || '',
          emoji: sub.emoji || '📄',
          description: sub.description || '',
          theme: sub.theme || 'default',
          parentId: sub.parentId || noteId,
          workspaceId: sub.workspaceId || 'default',
          updatedAt: sub.updatedAt || Date.now(),
          createdAt: sub.createdAt || Date.now(),
          isTrashed: !!sub.isTrashed
        }));
        const ySubList = subpagesArray.toArray();
        let subpagesChanged = currentSubRaw.length !== ySubList.length;
        if (!subpagesChanged) {
          for (let i = 0; i < currentSubRaw.length; i++) {
            if (currentSubRaw[i].id !== ySubList[i].id || currentSubRaw[i].title !== ySubList[i].title) {
              subpagesChanged = true; break;
            }
          }
        }
        if (subpagesChanged) {
          while (subpagesArray.length > 0) subpagesArray.delete(0, subpagesArray.length);
          subpagesArray.insert(0, currentSubRaw);
        }
      }

      const orderArray = session.yDoc.getArray<string>('blocksOrder');
      const dataMap = session.yDoc.getMap<Y.Map<any>>('blocksData');
      const currentIds = data.blocks.map(b => b.id);
      const yIds = orderArray.toArray();
      let orderChanged = currentIds.length !== yIds.length;
      if (!orderChanged) {
        for (let i = 0; i < currentIds.length; i++) {
          if (currentIds[i] !== yIds[i]) { orderChanged = true; break; }
        }
      }
      if (orderChanged) {
        while (orderArray.length > 0) orderArray.delete(0, orderArray.length);
        orderArray.insert(0, currentIds);
      }

      data.blocks.forEach((localBlock) => {
        let bMap = dataMap.get(localBlock.id);
        if (!bMap) { bMap = new Y.Map(); dataMap.set(localBlock.id, bMap); }
        if (bMap.get('type') !== localBlock.type) bMap.set('type', localBlock.type);
        let yText = bMap.get('content') as Y.Text | undefined;
        if (!yText) { yText = new Y.Text(); bMap.set('content', yText); }
        const localContent = localBlock.content || '';
        
        // Character level atomic diff application!
        applyStringDiff(yText, localContent);
        bMap.set('contentText', localContent);

        if (bMap.get('checked') !== localBlock.checked) bMap.set('checked', !!localBlock.checked);
        if (bMap.get('language') !== localBlock.language) bMap.set('language', localBlock.language || 'javascript');
        if (localBlock.emoji && bMap.get('emoji') !== localBlock.emoji) bMap.set('emoji', localBlock.emoji);
        if (localBlock.tableData) bMap.set('tableData', JSON.stringify(localBlock.tableData));
        if (localBlock.mediaData) bMap.set('mediaData', JSON.stringify(localBlock.mediaData));
      });
      const localIdsSet = new Set(currentIds);
      Array.from(dataMap.keys()).forEach(key => { if (!localIdsSet.has(key)) dataMap.delete(key); });
    }, 'local');
  }

  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public async hostSession(noteId: string, options: { customRoomId?: string, password?: string, memberLimit?: number } = {}): Promise<string> {
    const session = this.getSession(noteId);
    if (session.peer && (!options.customRoomId || session.roomId === options.customRoomId)) {
      return session.roomId!;
    }

    if (session.peer) this.disconnect(noteId);
    session.isHosting = true;
    session.password = options.password ? await this.hashPassword(options.password) : null;
    session.memberLimit = options.memberLimit || 10;

    session.peer = new Peer(options.customRoomId || undefined, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ]
      }
    });

    return new Promise((resolve, reject) => {
      if (!session.peer) return reject('Failed to create Peer instance');
      
      session.peer.on('open', (id) => {
        session.roomId = id;
        this.statusListeners.forEach(l => l(`Live P2P Session for Note started!`, 'success'));
        resolve(id);
      });

      session.peer.on('disconnected', () => {
        if (session.roomId === options.customRoomId) {
          console.warn('Host Peer lost connection to signaling server. Attempting to reconnect...');
          session.peer?.reconnect();
        }
      });

      session.peer.on('connection', (conn) => {
        if (session.connections.size >= session.memberLimit) {
          conn.on('open', () => {
            conn.send({ type: 'auth-failed', reason: 'Member limit reached for this session.' });
            setTimeout(() => conn.close(), 500);
          });
          return;
        }
        session.connections.set(conn.peer, conn);
        conn.on('open', () => {
          conn.send({ type: 'session-info', maxMembers: session.memberLimit, currentMembers: session.connections.size });
          if (session.password) conn.send({ type: 'auth-required', method: 'password' });
          else { 
            session.authenticatedPeers.add(conn.peer); 
            this.sendInitialSync(session, conn); 
          }
        });
        conn.on('data', (data: any) => this.handleIncomingMessage(session, conn.peer, data));
        conn.on('close', () => {
          session.connections.delete(conn.peer);
          session.authenticatedPeers.delete(conn.peer);
          session.collaborators.delete(conn.peer);
          this.triggerReactCallback();
        });
      });
      session.peer.on('error', (err) => { 
        this.statusListeners.forEach(l => l(`Host Error: ${err.message}`, 'error')); 
        reject(err); 
      });
    });
  }

  private sendInitialSync(session: SessionData, conn: DataConnection) {
    const localVector = Y.encodeStateVector(session.yDoc);
    conn.send({ type: 'sync-vector', vector: Array.from(localVector) });
    session.collaborators.set(conn.peer, { id: conn.peer, name: `User-${conn.peer.slice(0, 4)}` });
    this.triggerReactCallback();
  }

  public async joinSession(roomId: string, options: { targetNoteId?: string, password?: string } = {}): Promise<void> {
    const noteId = options.targetNoteId || `joining-${Date.now()}`;
    
    const session = this.getSession(noteId);
    if (session.roomId === roomId && session.connections.has(roomId)) return;

    if (session.peer) this.disconnect(noteId);
    session.isHosting = false;
    session.roomId = roomId;

    session.peer = new Peer({
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ]
      }
    });

    return new Promise((resolve, reject) => {
      if (!session.peer) return reject('Failed to create Peer instance');
      
      session.peer.on('disconnected', () => {
        if (session.roomId === roomId) {
          console.warn('Client Peer lost connection to signaling server. Attempting to reconnect...');
          session.peer?.reconnect();
        }
      });

      session.peer.on('open', () => {
        const conn = session.peer!.connect(roomId, { reliable: true });
        session.connections.set(roomId, conn);
        
        conn.on('open', async () => {
          if (options.password) {
            const hashed = await this.hashPassword(options.password);
            conn.send({ type: 'auth-response', password: hashed });
          } else {
            // No password required; send client's sync vector directly to establish 2-way sync
            const localVector = Y.encodeStateVector(session.yDoc);
            conn.send({ type: 'sync-vector', vector: Array.from(localVector) });
          }
          resolve();
        });
        
        conn.on('data', (data: any) => this.handleIncomingMessage(session, roomId, data));
        
        conn.on('close', () => {
          session.connections.delete(roomId);
          this.triggerReactCallback();
          
          if (session.roomId === roomId && !session.isHosting) {
            this.statusListeners.forEach(l => l(`Connection lost. Reconnecting in 3 seconds...`, 'info'));
            setTimeout(() => {
              if (session.roomId === roomId && !session.isHosting) {
                this.joinSession(roomId, options).catch(() => {});
              }
            }, 3000);
          }
        });
        
        conn.on('error', (err) => {
          session.connections.delete(roomId);
          if (session.roomId === roomId && !session.isHosting) {
            setTimeout(() => {
              if (session.roomId === roomId && !session.isHosting) {
                this.joinSession(roomId, options).catch(() => {});
              }
            }, 3000);
          }
          reject(err);
        });
      });
      
      session.peer.on('error', (err) => reject(err));
    });
  }

  private handleIncomingMessage(session: SessionData, senderId: string, msg: any) {
    if (msg.type === 'auth-failed') { 
      this.statusListeners.forEach(l => l(msg.reason, 'error')); 
      this.disconnect(session.noteId); 
      return; 
    }
    if (msg.type === 'auth-required') { 
      window.dispatchEvent(new CustomEvent('collab-auth-required', { detail: { senderId, noteId: session.noteId, method: msg.method } })); 
      return; 
    }
    if (msg.type === 'auth-success') {
      this.statusListeners.forEach(l => l('Authenticated successfully!', 'success'));
      const localVector = Y.encodeStateVector(session.yDoc);
      const conn = session.connections.get(session.roomId!);
      if (conn) {
        conn.send({ type: 'sync-vector', vector: Array.from(localVector) });
      }
      return;
    }

    if (session.isHosting) {
      if (msg.type === 'auth-response') {
        this.hashPassword(msg.password || '').then(hashed => {
          if (session.password && hashed !== session.password) {
            const conn = session.connections.get(senderId);
            if (conn) { conn.send({ type: 'auth-failed', reason: 'Incorrect password!' }); setTimeout(() => conn.close(), 500); }
          } else {
            session.authenticatedPeers.add(senderId);
            const conn = session.connections.get(senderId);
            if (conn) {
              this.sendInitialSync(session, conn);
              conn.send({ type: 'auth-success' });
            }
          }
        });
        return;
      }
      if (!session.authenticatedPeers.has(senderId)) return;
    }

    if (msg.type === 'session-info') { 
      session.memberLimit = msg.maxMembers; 
      window.dispatchEvent(new CustomEvent('collab-session-info', { detail: { ...msg, noteId: session.noteId } })); 
      return; 
    }
    if (msg.type === 'kick-peer') { 
      this.statusListeners.forEach(l => l('Kicked by host.', 'error')); 
      this.disconnect(session.noteId); 
      return; 
    }

    if (msg.type === 'sync-vector') {
      const vector = new Uint8Array(msg.vector);
      const responseUpdate = Y.encodeStateAsUpdate(session.yDoc, vector);
      const conn = session.connections.get(senderId);
      if (conn) conn.send({ type: 'sync-update', update: Array.from(responseUpdate) });
      return;
    }

    if (msg.type === 'sync-update') {
      const update = new Uint8Array(msg.update);
      session.isSeeded = true;
      this.isApplyingRemoteUpdate = true;
      try {
        Y.applyUpdate(session.yDoc, update, 'remote');
        this.triggerReactCallback(session.noteId);
      } catch (err) { 
        console.error('Sync update apply failed', err); 
      } finally { 
        this.isApplyingRemoteUpdate = false; 
      }
      if (session.isHosting) this.broadcast(session, msg, senderId);
    }
  }

  private broadcast(session: SessionData, msg: CollabMessage, excludeId?: string) {
    session.connections.forEach((conn, peerId) => { if (peerId !== excludeId && conn.open) conn.send(msg); });
  }

  public getRoomId(noteId?: string): string | null {
    const id = noteId || this.activeNoteId;
    return id ? this.sessions.get(id)?.roomId || null : null;
  }

  public getIsHosting(noteId?: string): boolean {
    const id = noteId || this.activeNoteId;
    return id ? this.sessions.get(id)?.isHosting || false : false;
  }

  public getIsHostOffline(noteId?: string): boolean {
    const id = noteId || this.activeNoteId;
    if (!id) return false;
    const session = this.sessions.get(id);
    return !!session && !session.isHosting && session.roomId !== null && !session.connections.has(session.roomId);
  }

  public getActivePeersCount(noteId?: string): number {
    const id = noteId || this.activeNoteId;
    return id ? this.sessions.get(id)?.connections.size || 0 : 0;
  }

  public getCollaborators(noteId?: string) {
    const id = noteId || this.activeNoteId;
    return id ? Array.from(this.sessions.get(id)?.collaborators.values() || []) : [];
  }

  public kickCollaborator(peerId: string, noteId?: string) {
    const id = noteId || this.activeNoteId;
    if (!id) return;
    const session = this.sessions.get(id);
    if (!session) return;

    const conn = session.connections.get(peerId);
    if (conn) {
      conn.send({ type: 'kick-peer', targetId: peerId });
      setTimeout(() => conn.close(), 500);
      session.collaborators.delete(peerId);
    }
  }

  public disconnect(noteId?: string) {
    const id = noteId || this.activeNoteId;
    if (!id) return;
    const session = this.sessions.get(id);
    if (!session) return;

    // Direct flush any unsaved debounce work before full session destruction
    const timeout = this.persistTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.persistTimeouts.delete(id);
      this.persistToDisk(session);
    }

    session.connections.forEach(conn => conn.close());
    session.connections.clear();
    if (session.peer) { session.peer.destroy(); session.peer = null; }
    session.yDoc.destroy();
    session.isHosting = false;
    session.roomId = null;
    this.sessions.delete(id);
  }
}

export const globalCollabManager = new PeerCollabManager();
