/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { collabManager, SessionInfo, SessionRole, ConnectionState, Collaborator, SyncSnapshot } from '../../../services/collab';
import { DataManager, Note } from '../../../services/storage/DataManager';
import { blocksToHtml } from '../../../utils/blockParser';

interface UseCollaborationParams {
  id: string | undefined;
  note: Note | null;
  editor: any;
  title: string;
  emoji: string;
  theme: string;
  setNote: (note: Note) => void;
  setTitle: (title: string) => void;
  setEmoji: (emoji: string) => void;
  setTheme: (theme: string) => void;
  setNotification: (notif: { message: string; type: 'info' | 'success' | 'error' } | null) => void;
  location: any;
  navigate: any;
}

export function useCollaboration({
  id,
  note,
  editor,
  title,
  emoji,
  theme,
  setNote,
  setTitle,
  setEmoji,
  setTheme,
  setNotification,
  location,
  navigate,
}: UseCollaborationParams) {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const lastAppliedRemoteRef = useRef<string>('');
  const isApplyingRemoteRef = useRef(false);

  const getSignature = useCallback((snap: SyncSnapshot) => {
    const blocksSig = snap.blocks.map(b => b.id + b.content).join('|');
    return `${snap.title}::${snap.emoji}::${snap.theme}::${blocksSig}`;
  }, []);

  // Handle incoming manager events
  useEffect(() => {
    if (!id) return;

    collabManager.setActiveNoteId(id);

    const unsubscribe = collabManager.subscribe((ev) => {
      if (ev.noteId !== id) return;

      if (ev.type === 'state') {
        const signature = getSignature(ev.snapshot);
        if (signature === lastAppliedRemoteRef.current) return;

        isApplyingRemoteRef.current = true;
        
        // Apply remote state to React
        if (ev.snapshot.title !== title) setTitle(ev.snapshot.title);
        if (ev.snapshot.emoji !== emoji) setEmoji(ev.snapshot.emoji);
        if (ev.snapshot.theme !== theme) setTheme(ev.snapshot.theme);
        
        // Blocks reconciliation
        const currentBlocksSig = editor.blocks.map((b: any) => b.id + b.content).join('|');
        const remoteBlocksSig = ev.snapshot.blocks.map(b => b.id + b.content).join('|');
        if (currentBlocksSig !== remoteBlocksSig) {
          editor.setBlocks(ev.snapshot.blocks);
        }

        lastAppliedRemoteRef.current = signature;
        
        // Save to DB (fire and forget as manager also does debounced persist, 
        // but this ensures local UI is snappy and disk is somewhat synced)
        const html = blocksToHtml(ev.snapshot.blocks);
        DataManager.getNoteById(id).then(existing => {
          if (existing) {
            DataManager.saveNote({
              ...existing,
              title: ev.snapshot.title,
              emoji: ev.snapshot.emoji,
              theme: ev.snapshot.theme,
              content: html,
              updatedAt: Date.now()
            }).then(saved => setNote(saved));
          }
        });

        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 50);
      } else if (ev.type === 'session') {
        setSessionInfo(ev.info);
        setConnectionState(ev.info.connection);
      } else if (ev.type === 'status') {
        setNotification({ message: ev.status.text, type: ev.status.type === 'warning' ? 'info' : ev.status.type });
        setTimeout(() => setNotification(null), 3000);
      } else if (ev.type === 'auth-required') {
        const password = prompt('এই সেশনে জয়েন করতে পাসওয়ার্ড দিন (Enter session password):');
        if (password) {
          collabManager.joinSession(ev.roomId, { targetNoteId: ev.noteId, password }).catch(console.error);
        } else {
          setNotification({ message: 'Password required to join', type: 'error' });
          handleDisconnect();
        }
      }
    });

    return () => {
      unsubscribe();
      collabManager.setActiveNoteId(null);
    };
  }, [id, title, emoji, theme, editor.blocks, getSignature, setTitle, setEmoji, setTheme, editor.setBlocks, setNote, setNotification]);

  // Push local changes to manager
  useEffect(() => {
    if (!id || !sessionInfo || isApplyingRemoteRef.current) return;

    const snap: SyncSnapshot = {
      noteId: id,
      title,
      emoji,
      theme,
      blocks: editor.blocks,
      parentId: note?.parentId
    };

    const signature = getSignature(snap);
    if (signature === lastAppliedRemoteRef.current) return;

    lastAppliedRemoteRef.current = signature;
    collabManager.updateLocalState(snap);
  }, [id, title, emoji, theme, editor.blocks, note?.parentId, sessionInfo, getSignature]);

  // Auto-join from URL
  useEffect(() => {
    if (!id) return;
    const searchParams = new URLSearchParams(location.search);
    const urlRoomId = searchParams.get('collab');

    if (urlRoomId && (!sessionInfo || sessionInfo.roomId !== urlRoomId)) {
      collabManager.joinSession(urlRoomId, { targetNoteId: id }).catch(err => {
        console.error('Failed to auto-join:', err);
      });
    }
  }, [id, location.search, sessionInfo]);

  // Auto-host if note has roomId and not collaborated
  useEffect(() => {
    if (!id || !note || sessionInfo) return;

    if (!note.isCollaborated && note.collabRoomId) {
      collabManager.hostSession(id, { roomId: note.collabRoomId }).catch(err => {
        console.error('Auto-host failed:', err);
      });
    }
  }, [id, note, sessionInfo]);

  const handleStartCollab = async (opts?: { password?: string; memberLimit?: number }) => {
    if (!id) return;
    
    if (sessionInfo?.role === 'host') {
      const shareUrl = `${window.location.origin}${window.location.pathname}?collab=${sessionInfo.roomId}`;
      navigator.clipboard.writeText(shareUrl);
      setNotification({ message: 'Share link copied!', type: 'success' });
      return;
    }

    try {
      const roomId = await collabManager.hostSession(id, {
        roomId: note?.collabRoomId || undefined,
        password: opts?.password,
        memberLimit: opts?.memberLimit
      });

      // Save roomId to note
      if (note) {
        const updated = await DataManager.saveNote({
          ...note,
          collabRoomId: roomId,
          updatedAt: Date.now()
        });
        setNote(updated);
      }

      const shareUrl = `${window.location.origin}${window.location.pathname}?collab=${roomId}`;
      navigator.clipboard.writeText(shareUrl);
      
      // Update URL without reload
      const newUrl = `${window.location.pathname}?collab=${roomId}`;
      window.history.replaceState({}, '', newUrl);

      setNotification({ message: 'Live session started! Share link copied.', type: 'success' });
    } catch (err) {
      setNotification({ message: 'Failed to start session', type: 'error' });
    }
  };

  const handleKickCollaborator = (peerId: string) => {
    if (id) collabManager.kickCollaborator(id, peerId);
  };

  const handleDisconnect = () => {
    if (id) collabManager.disconnect(id);
    setSessionInfo(null);
    setConnectionState('idle');
    // Clear URL param
    window.history.replaceState({}, '', window.location.pathname);
  };

  return {
    collabRoom: sessionInfo?.roomId || null,
    activePeers: sessionInfo?.peerCount || 0,
    collaborators: sessionInfo?.collaborators || [],
    sessionRole: sessionInfo?.role || 'idle',
    connectionState,
    isHostOffline: sessionInfo?.role === 'guest' && connectionState === 'disconnected',
    handleStartCollab,
    handleKickCollaborator,
    handleDisconnect
  };
}
