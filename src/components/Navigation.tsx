/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Sparkles, SquarePen, Inbox } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DataManager } from '../utils/DataManager';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navigation() {
  const navigate = useNavigate();

  const handleCreateNote = async () => {
    const newNote = {
      id: `note-${Date.now()}`,
      title: '',
      content: '',
      emoji: '📄',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false
    };
    await DataManager.saveNote(newNote);
    navigate(`/editor/${newNote.id}`);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#191919]/95 backdrop-blur-xl border-t border-white/5 pb-safe-area-inset-bottom">
      <div className="flex justify-between items-center max-w-lg mx-auto px-6 py-4">
        {/* Search */}
        <NavLink
          to="/search"
          className={({ isActive }) =>
            cn(
              "p-2 rounded-full transition-all",
              isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
            )
          }
        >
          <Search size={24} strokeWidth={2} />
        </NavLink>

        {/* Inbox */}
        <NavLink
          to="/inbox"
          className={({ isActive }) =>
            cn(
              "p-2 rounded-full transition-all",
              isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
            )
          }
        >
          <Inbox size={24} strokeWidth={2} />
        </NavLink>

        {/* Ask AI - Pill Shape */}
        <NavLink
          to="/ai"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-full transition-all border border-white/10",
              isActive ? "bg-white text-black" : "bg-white/5 text-white/80 hover:bg-white/10"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Sparkles size={20} fill={isActive ? "black" : "none"} />
              <span className="text-sm font-medium">Ask AI</span>
            </>
          )}
        </NavLink>

        {/* New Note */}
        <button
          onClick={handleCreateNote}
          className="p-2 rounded-full text-white/60 hover:text-white transition-all"
        >
          <SquarePen size={24} strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
}
