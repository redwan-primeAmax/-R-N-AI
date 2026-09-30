/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Collaborator } from '../../../services/collab';
import { X, User } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface CollaboratorListProps {
  collaborators: Collaborator[];
  isHost: boolean;
  onKick: (peerId: string) => void;
}

export const CollaboratorList: React.FC<CollaboratorListProps> = ({
  collaborators,
  isHost,
  onKick
}) => {
  if (collaborators.length === 0) {
    return (
      <div className="py-8 text-center">
        <Users size={32} className="mx-auto mb-2 text-white/10" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Waiting for members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[200px] overflow-y-auto no-scrollbar">
      {collaborators.map((peer) => (
        <div 
          key={peer.id}
          className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-black shadow-sm"
                style={{ backgroundColor: peer.color }}
              >
                <User size={14} />
              </div>
              <div 
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a1a1a]" 
                style={{ backgroundColor: peer.color }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{peer.name}</span>
              <span className="text-[9px] text-white/40 font-mono truncate uppercase tracking-tighter">ID: {peer.id.slice(0, 8)}...</span>
            </div>
          </div>

          {isHost && (
            <button
              onClick={() => onKick(peer.id)}
              className="p-1.5 hover:bg-red-500/10 hover:text-red-400 text-white/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Remove member"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

import { Users } from 'lucide-react';
