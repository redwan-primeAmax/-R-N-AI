/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from './Modal';
import { Users, Loader2 } from 'lucide-react';
import { globalCollabManager } from '../../services/PeerCollabManager';
import { blocksToHtml } from '../../pages/Editor/components/CustomBlockEditor';
import { DataManager } from '../../services/storage/DataManager';

interface JoinCollabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinCollabModal({ isOpen, onClose }: JoinCollabModalProps) {
  const navigate = useNavigate();
  const [collabIdInput, setCollabIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [collabStatus, setCollabStatus] = useState<string | null>(null);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const unregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (unregisterRef.current) {
        unregisterRef.current();
        unregisterRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsAuthRequired(false);
      setCollabError(null);
      setCollabStatus(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const authHandler = (e: any) => {
      setIsJoining(false);
      setCollabStatus('Password required to enter this session.');
      setIsAuthRequired(true);
    };

    window.addEventListener('collab-auth-required', authHandler);
    return () => window.removeEventListener('collab-auth-required', authHandler);
  }, []);

  const handleJoinCollab = async () => {
    const rawInput = collabIdInput.trim();
    if (!rawInput) return;

    let targetRoomId = rawInput;
    if (rawInput.includes('collab=')) {
      try {
        const urlParams = new URLSearchParams(rawInput.substring(rawInput.indexOf('?')));
        const collabId = urlParams.get('collab');
        if (collabId) targetRoomId = collabId;
      } catch (err) {
        console.error('Failed to parse pasted collab URL', err);
      }
    }

    setIsJoining(true);
    setCollabError(null);
    setCollabStatus('Searching and connecting to peer host...');

    let active = true;
    const timeoutId = setTimeout(() => {
      if (active) {
        active = false;
        globalCollabManager.disconnect();
        setIsJoining(false);
        setCollabStatus(null);
        setCollabError('Host offline or incorrect Room ID.');
      }
    }, 15000);

    try {
      if (unregisterRef.current) {
        unregisterRef.current();
      }
      globalCollabManager.disconnect();

      const unregister = globalCollabManager.registerCallbacks(async (syncedData) => {
        const noteId = syncedData.noteId;
        if (noteId && active) {
          active = false;
          clearTimeout(timeoutId);
          unregister();
          unregisterRef.current = null;
          
          let note = await DataManager.getNoteById(noteId);
          if (!note) {
            const blocksHtml = blocksToHtml(syncedData.blocks);
            note = {
              id: noteId,
              title: syncedData.title || 'P2P Synced Note',
              emoji: syncedData.emoji || '📝',
              description: syncedData.description || 'Synced via PeerJS',
              content: blocksHtml,
              theme: syncedData.theme || 'default',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              isTrashed: false,
              workspaceId: (await DataManager.getActiveWorkspaceId()) || 'default',
              isCollaborated: true,
              collabRoomId: targetRoomId
            };
            await DataManager.saveNote(note);
          } else {
            await DataManager.saveNote({
              ...note,
              isCollaborated: true,
              collabRoomId: targetRoomId,
              updatedAt: Date.now()
            });
          }
          setIsJoining(false);
          setCollabStatus(null);
          setCollabIdInput('');
          setPasswordInput('');
          onClose();
          navigate(`/editor/${noteId}?collab=${targetRoomId}`);
        }
      }, (msg, type) => {
        setCollabStatus(msg);
        if (type === 'error' && active) {
          active = false;
          clearTimeout(timeoutId);
          setCollabError(msg);
          setIsJoining(false);
          setCollabStatus(null);
        }
      });

      unregisterRef.current = unregister;

      await globalCollabManager.joinSession(targetRoomId, {
        password: passwordInput.trim() || undefined
      });

    } catch (err) {
      console.error('Failed to join collaboration', err);
      if (active) {
        active = false;
        clearTimeout(timeoutId);
        setIsJoining(false);
        setCollabStatus(null);
        setCollabError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="কোলাবোরেশন জয়েন">
      <div className="space-y-6 py-2 px-2">
        <div className="flex gap-4 p-4 bg-cyan-700/10 rounded-3xl border border-cyan-500/20">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-2xl flex items-center justify-center shrink-0">
            <Users className="text-cyan-400" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-cyan-400">Join Live Session</h3>
            <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
              Enter a Friend's Sync ID to collaborate. Peer-to-peer connection ensures zero-cost instant sync.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Host Session ID</label>
            <input
              type="text"
              placeholder="Friend's Room ID বা লিংক দিন..."
              value={collabIdInput}
              onChange={(e) => {
                setCollabIdInput(e.target.value);
                if (collabError) setCollabError(null);
              }}
              className="w-full bg-[#1C1C1D] text-white placeholder:text-white/10 px-5 py-4 rounded-3xl text-sm font-bold border border-white/5 focus:outline-none focus:border-cyan-500/30 transition-all text-center select-text"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Session Password (Optional)</label>
            <input
              type="password"
              placeholder="If the host set a password..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-[#1C1C1D] text-white placeholder:text-white/10 px-5 py-4 rounded-3xl text-sm font-bold border border-white/5 focus:outline-none focus:border-cyan-500/30 transition-all text-center select-text font-mono"
            />
          </div>

          <AnimatePresence>
            {collabStatus && !collabError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] text-cyan-400 font-bold px-4 py-3 bg-cyan-500/5 border border-cyan-500/15 rounded-2xl text-center flex items-center justify-center gap-2"
              >
                <Loader2 size={13} className="animate-spin" />
                <span>{collabStatus}</span>
              </motion.div>
            )}

            {collabError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[11px] text-red-400 font-medium px-4 py-4 bg-red-500/5 border border-red-500/15 rounded-2xl text-center"
              >
                ⚠️ {collabError}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleJoinCollab}
            disabled={!collabIdInput.trim() || isJoining}
            className="w-full flex items-center justify-center gap-3 py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-25 disabled:cursor-not-allowed text-white rounded-3xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-[0_10px_30px_rgba(6,182,212,0.2)] active:scale-95 mt-4"
          >
            {isJoining ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Joining Session...</span>
              </>
            ) : (
              <>
                <Users size={16} />
                <span>Establish Connect</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
