/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { globalCollabManager } from '../../../services/PeerCollabManager';
import { DataManager, Note } from '../../../services/storage/DataManager';
import { blocksToHtml } from '../components/CustomBlockEditor';

interface UseCollaborationParams {
  id: string | undefined;
  note: Note | null;
  editor: any;
  title: string;
  emoji: string;
  description: string;
  theme: string;
  currentSubPages: Note[];
  setNote: (note: Note) => void;
  setTitle: (title: string) => void;
  setEmoji: (emoji: string) => void;
  setDescription: (desc: string) => void;
  setTheme: (theme: string) => void;
  setCurrentSubPages: (subs: Note[]) => void;
  setNotification: (notif: { message: string; type: 'info' | 'success' | 'error' } | null) => void;
  location: any;
  navigate: any;
  titleRef: React.MutableRefObject<string>;
  emojiRef: React.MutableRefObject<string>;
  descriptionRef: React.MutableRefObject<string>;
  themeRef: React.MutableRefObject<string>;
  noteRef: React.MutableRefObject<Note | null>;
}

export function useCollaboration({
  id,
  note,
  editor,
  title,
  emoji,
  description,
  theme,
  currentSubPages,
  setNote,
  setTitle,
  setEmoji,
  setDescription,
  setTheme,
  setCurrentSubPages,
  setNotification,
  location,
  navigate,
  titleRef,
  emojiRef,
  descriptionRef,
  themeRef,
  noteRef,
}: UseCollaborationParams) {
  // Collaboration P2P States
  const [collabRoom, setCollabRoom] = useState<string | null>(globalCollabManager.getRoomId(id));
  const [activePeers, setActivePeers] = useState(0);
  const [isHostOffline, setIsHostOffline] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const lastSyncedStateRef = useRef<any>(null);

  // Read if we need to auto-join from URL parameter "collab" on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlCollabId = searchParams.get('collab');

    if (urlCollabId && urlCollabId !== collabRoom) {
      const autoJoin = async () => {
        try {
          if (id) globalCollabManager.setActiveNoteId(id);
          // Pre-seed local state to Yjs doc to preserve offline updates during sync
          globalCollabManager.updateFromLocalState({
            blocks: editor.blocks,
            title,
            emoji,
            description,
            theme,
            noteId: id,
            parentId: note?.parentId,
            subPages: currentSubPages,
          });

          setNotification({ message: 'Auto-joining collaborative session...', type: 'info' });
          await globalCollabManager.joinSession(urlCollabId, { targetNoteId: id });
          setCollabRoom(urlCollabId);

          // Mark as collaborated note on successful join
          if (id && note) {
            const updated = await DataManager.saveNote({
              ...note,
              isCollaborated: true,
              collabRoomId: urlCollabId,
              updatedAt: Date.now(),
            });
            setNote(updated);
            noteRef.current = updated;
          }

          setNotification({ message: 'P2P Session connected successfully!', type: 'success' });
          setTimeout(() => setNotification(null), 3000);
        } catch (err) {
          console.error(err);
          setNotification({ message: 'Failed to auto-join. Check Room ID.', type: 'error' });
          setTimeout(() => setNotification(null), 3000);
        }
      };
      autoJoin();
    }
  }, [location.search, id]);

  useEffect(() => {
    if (id) {
      globalCollabManager.setActiveNoteId(id);
    }
  }, [id]);

  // Periodic polling of connection status & Room ID to keep UI fresh
  useEffect(() => {
    const statsTimer = setInterval(() => {
      setCollabRoom(globalCollabManager.getRoomId(id));
      setActivePeers(globalCollabManager.getActivePeersCount(id));
      setIsHostOffline(globalCollabManager.getIsHostOffline(id));
      setCollaborators(globalCollabManager.getCollaborators(id));
    }, 1500);
    return () => clearInterval(statsTimer);
  }, [id]);

  // Auto-reconnect or Auto-host based on note metadata
  useEffect(() => {
    if (!id || !note) return;

    const performAutoConnection = async () => {
      // Auto-join if user joined this note before and room ID exists
      if (note.isCollaborated && note.collabRoomId && !collabRoom) {
        try {
          await globalCollabManager.joinSession(note.collabRoomId, { targetNoteId: id });
          setCollabRoom(note.collabRoomId);
        } catch (err) {
          console.warn('Auto-reconnect failed, host might be offline');
        }
      }

      // Auto-host if user was hosting this note before
      if (!note.isCollaborated && note.collabRoomId && !collabRoom) {
        try {
          const rid = await globalCollabManager.hostSession(id || '', { customRoomId: note.collabRoomId });
          setCollabRoom(rid);
        } catch (err) {
          console.error(err);
        }
      }
    };

    performAutoConnection();
  }, [id, note, collabRoom]);

  // Listen for 'kicked' event
  useEffect(() => {
    const handleKicked = async (e: any) => {
      if (e.detail?.noteId === id) {
        await DataManager.deleteNote(id);
        navigate('/');
      }
    };
    window.addEventListener('kicked-from-collab', handleKicked);
    return () => window.removeEventListener('kicked-from-collab', handleKicked);
  }, [id, navigate]);

  // Listen for remote Yjs updates and trigger authoritative local UI state updates
  useEffect(() => {
    if (!id || !note) return;

    const unregister = globalCollabManager.registerCallbacks(
      (syncedState) => {
        // Authoritative state reconciliation when applying remote updates
        if (globalCollabManager.isApplyingRemoteUpdate) {
          lastSyncedStateRef.current = syncedState;
          if (syncedState.title !== titleRef.current) {
            setTitle(syncedState.title);
            titleRef.current = syncedState.title;
          }
          if (syncedState.emoji !== emojiRef.current) {
            setEmoji(syncedState.emoji);
            emojiRef.current = syncedState.emoji;
          }
          if (syncedState.description !== descriptionRef.current) {
            setDescription(syncedState.description);
            descriptionRef.current = syncedState.description;
          }
          if (syncedState.theme !== themeRef.current) {
            setTheme(syncedState.theme);
            themeRef.current = syncedState.theme;
          }

          // Sync remote subpages to local DB and React state
          if (syncedState.syncedSubPages && syncedState.syncedSubPages.length > 0) {
            const subsPromises = syncedState.syncedSubPages.map(async (sub: any) => {
              const exists = await DataManager.getNoteById(sub.id);
              if (!exists || exists.updatedAt < sub.updatedAt) {
                await DataManager.saveNote({
                  ...sub,
                  content: exists?.content || '<p></p>',
                });
              }
            });
            Promise.all(subsPromises).then(() => {
              const activeSubs = syncedState.syncedSubPages!.filter((sub: any) => !sub.isTrashed);
              setCurrentSubPages(activeSubs);
            });
          }

          // Reconciliation: Compare blocks to prevent re-rendering when they align
          const currentBlocks = editor.blocks;
          let blocksChanged = currentBlocks.length !== syncedState.blocks.length;
          if (!blocksChanged) {
            for (let i = 0; i < currentBlocks.length; i++) {
              if (
                currentBlocks[i].id !== syncedState.blocks[i].id ||
                currentBlocks[i].content !== syncedState.blocks[i].content ||
                currentBlocks[i].type !== syncedState.blocks[i].type ||
                currentBlocks[i].checked !== syncedState.blocks[i].checked ||
                currentBlocks[i].language !== syncedState.blocks[i].language
              ) {
                blocksChanged = true;
                break;
              }
            }
          }

          if (blocksChanged) {
            editor.setBlocks(syncedState.blocks);
          }

          // Trigger local autosave with the newly arrived data to synchronize disk
          const updatedBlocksHtml = blocksToHtml(syncedState.blocks);
          DataManager.saveNote({
            ...note,
            title: syncedState.title,
            emoji: syncedState.emoji,
            description: syncedState.description,
            theme: syncedState.theme,
            content: updatedBlocksHtml,
            updatedAt: Date.now(),
          })
            .then((saved) => {
              setNote(saved);
              noteRef.current = saved;
            })
            .catch(console.error);
        }
      },
      (msg, type) => {
        setNotification({
          message: msg,
          type: type === 'info' ? 'info' : type === 'success' ? 'success' : 'error',
        });
        setTimeout(() => setNotification(null), 3500);
      }
    );

    // Initial setup if we are already hosting or joined
    if (globalCollabManager.getRoomId()) {
      globalCollabManager.updateFromLocalState({
        blocks: editor.blocks,
        title,
        emoji,
        description,
        theme,
        noteId: id,
        parentId: note?.parentId,
        subPages: currentSubPages,
      });
    }

    return unregister;
  }, [id, note]);

  // Synchronize local edits to the Yjs Doc (which broadcasts updates automatically to remote peers)
  useEffect(() => {
    if (!collabRoom) return;

    // Check if the current React state is identical to what we just got from the remote peer
    const lastSynced = lastSyncedStateRef.current;
    if (lastSynced) {
      const isIdentical =
        lastSynced.title === title &&
        lastSynced.emoji === emoji &&
        lastSynced.description === description &&
        lastSynced.theme === theme &&
        JSON.stringify(lastSynced.blocks) === JSON.stringify(editor.blocks);

      if (isIdentical) {
        // This is a remote update that React just got done rendering, do not echo it back.
        return;
      }
    }

    if (collabRoom && !globalCollabManager.isApplyingRemoteUpdate) {
      globalCollabManager.updateFromLocalState({
        blocks: editor.blocks,
        title,
        emoji,
        description,
        theme,
        noteId: id,
        parentId: note?.parentId,
        subPages: currentSubPages,
      });
    }
  }, [editor.blocks, title, emoji, description, theme, collabRoom, id, note?.parentId, currentSubPages]);

  const handleStartCollab = async (options?: { password?: string; memberLimit?: number }) => {
    if (collabRoom && !options) {
      // Re-copy Room ID to clipboard as requested
      navigator.clipboard.writeText(collabRoom);
      setNotification({ message: 'Room ID copied to Clipboard!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      setNotification({ message: 'Creating secure Peer server...', type: 'info' });
      // Use existing collabRoomId if available for persistence or use custom params
      const roomId = await globalCollabManager.hostSession(id || '', {
        customRoomId: note?.collabRoomId || undefined,
        password: options?.password,
        memberLimit: options?.memberLimit,
      });
      setCollabRoom(roomId);

      // Persist the room ID to the note so it can be auto-hosted later
      if (id && note) {
        const updated = await DataManager.saveNote({
          ...note,
          collabRoomId: roomId,
          updatedAt: Date.now(),
        });
        setNote(updated);
        noteRef.current = updated;
      }

      // Force-sync initial local state to Yjs document so the board is active
      globalCollabManager.updateFromLocalState({
        blocks: editor.blocks,
        title,
        emoji,
        description,
        theme,
        noteId: id,
        parentId: note?.parentId,
        subPages: currentSubPages,
      });

      navigator.clipboard.writeText(roomId);
      setNotification({ message: `Session active! Room ID copied to Clipboard.`, type: 'success' });
      setTimeout(() => setNotification(null), 4000);

      const queryUrl = `${window.location.pathname}?collab=${roomId}`;
      window.history.replaceState({ ...window.history.state }, '', queryUrl);
    } catch (err) {
      console.error('Hosting collaboration session failed', err);
      setNotification({ message: 'P2P setup failed. Check connection.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleKickCollaborator = (peerId: string) => {
    globalCollabManager.kickCollaborator(peerId, id);
  };

  return {
    collabRoom,
    activePeers,
    isHostOffline,
    collaborators,
    handleStartCollab,
    handleKickCollaborator,
  };
}
