/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Peer, { DataConnection } from 'peerjs';
import { ConnectionState } from './types';

export type TransportEvent = 
  | { type: 'open'; roomId: string }
  | { type: 'peer-open'; peerId: string }
  | { type: 'peer-close'; peerId: string }
  | { type: 'data'; peerId: string; payload: any }
  | { type: 'error'; message: string }
  | { type: 'state'; state: ConnectionState };

export class PeerTransport {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private listeners: Set<(ev: TransportEvent) => void> = new Set();
  private state: ConnectionState = 'idle';
  private reconnectAttempts = 0;
  private manuallyClosed = false;

  private readonly STUN_SERVERS = [
    'stun.l.google.com:19302',
    'stun1.l.google.com:19302',
    'stun2.l.google.com:19302',
    'stun3.l.google.com:19302',
    'stun4.l.google.com:19302'
  ];

  constructor(private roomId: string, private role: 'host' | 'guest') {}

  public on(fn: (ev: TransportEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(ev: TransportEvent) {
    if (ev.type === 'state') this.state = ev.state;
    this.listeners.forEach(fn => fn(ev));
  }

  public start() {
    this.manuallyClosed = false;
    this.reconnectAttempts = 0;
    this.initPeer();
  }

  private initPeer() {
    if (this.peer) {
      this.peer.destroy();
    }

    const peerId = this.role === 'host' ? this.roomId : undefined;
    
    this.peer = new Peer(peerId!, {
      config: {
        iceServers: this.STUN_SERVERS.map(url => ({ urls: `stun:${url}` })),
        sdpSemantics: 'unified-plan'
      },
      debug: 1
    });

    this.peer.on('open', (id) => {
      this.reconnectAttempts = 0;
      this.emit({ type: 'state', state: 'connected' });
      this.emit({ type: 'open', roomId: id });

      if (this.role === 'guest') {
        this.connectToHost();
      }
    });

    this.peer.on('connection', (conn) => {
      if (this.role === 'host') {
        this.setupConnection(conn);
      }
    });

    this.peer.on('disconnected', () => {
      if (!this.manuallyClosed) {
        this.handleReconnect();
      }
    });

    this.peer.on('error', (err) => {
      console.error('PeerTransport: Peer Error:', err);
      this.emit({ type: 'error', message: err.message });
      
      // If fatal error like ID already taken, don't auto-reconnect blindly
      if (err.type === 'unavailable-id') {
        this.emit({ type: 'state', state: 'error' });
        return;
      }

      this.handleReconnect();
    });
  }

  private connectToHost() {
    if (!this.peer || this.role !== 'guest') return;
    const conn = this.peer.connect(this.roomId, {
      reliable: true
    });
    this.setupConnection(conn);
  }

  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.emit({ type: 'peer-open', peerId: conn.peer });
    });

    conn.on('data', (data) => {
      this.emit({ type: 'data', peerId: conn.peer, payload: data });
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.emit({ type: 'peer-close', peerId: conn.peer });
      
      if (this.role === 'guest' && !this.manuallyClosed) {
        this.handleReconnect();
      }
    });

    conn.on('error', (err) => {
      console.error('PeerTransport: Connection Error:', err);
      this.emit({ type: 'error', message: err.message });
    });
  }

  private handleReconnect() {
    if (this.manuallyClosed || this.state === 'reconnecting') return;

    this.emit({ type: 'state', state: 'reconnecting' });
    
    const BASE = 1000;
    const MAX = 30000;
    const delay = Math.min(BASE * Math.pow(2, this.reconnectAttempts), MAX);
    
    this.reconnectAttempts++;
    
    setTimeout(() => {
      if (this.manuallyClosed) return;
      
      if (this.peer && !this.peer.destroyed) {
        if (this.peer.disconnected) {
          this.peer.reconnect();
        } else if (this.role === 'guest' && this.connections.size === 0) {
          this.connectToHost();
        }
      } else {
        this.initPeer();
      }
    }, delay);
  }

  public broadcast(payload: any, excludeId?: string) {
    this.connections.forEach((conn, id) => {
      if (id !== excludeId && conn.open) {
        try {
          conn.send(payload);
        } catch (e) {
          console.error(`PeerTransport: Send to ${id} failed`, e);
        }
      }
    });
  }

  public send(peerId: string, payload: any) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      try {
        conn.send(payload);
      } catch (e) {
        console.error(`PeerTransport: Send to ${peerId} failed`, e);
      }
    }
  }

  public closePeer(peerId: string) {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.close();
      this.connections.delete(peerId);
    }
  }

  public getPeerIds(): string[] {
    return Array.from(this.connections.keys());
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public isConnected(): boolean {
    return this.state === 'connected';
  }

  public destroy() {
    this.manuallyClosed = true;
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.emit({ type: 'state', state: 'disconnected' });
  }
}
