/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../../../components/modals/Modal';
import { Shield, Users, Zap } from 'lucide-react';

interface CollabSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (opts: { password?: string; memberLimit: number }) => void;
  isLoading?: boolean;
}

export const CollabSetupModal: React.FC<CollabSetupModalProps> = ({
  isOpen,
  onClose,
  onStart,
  isLoading
}) => {
  const [password, setPassword] = useState('');
  const [memberLimit, setMemberLimit] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    if (password && password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    setError(null);
    onStart({ password: password || undefined, memberLimit });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start Live Session">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-amber-200">Real-time Collaboration</div>
            <p className="text-[11px] text-amber-200/60 leading-relaxed">
              Anyone with the link can join and edit this note in real-time. 
              The session stops when you close the tab.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/40 mb-2 px-1">
              <Shield size={12} />
              Session Password (Optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 4 characters..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50 transition-all"
            />
            {error && <p className="text-[10px] text-red-400 mt-1.5 px-1 font-bold">{error}</p>}
          </div>

          <div>
            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/40 mb-2 px-1">
              <Users size={12} />
              Member Limit ({memberLimit})
            </label>
            <input
              type="range"
              min="2"
              max="50"
              step="1"
              value={memberLimit}
              onChange={(e) => setMemberLimit(parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-white/20 font-bold mt-1 px-1">
              <span>2</span>
              <span>50</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="flex-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? 'Starting...' : 'Start Live Session'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
