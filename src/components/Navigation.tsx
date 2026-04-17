/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Sparkles, Layout, Wrench, Plus, PenSquare } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DataManager } from '../utils/DataManager';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navigation() {
  const navigate = useNavigate();

  const handleQuickNote = async () => {
    const newNote = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      emoji: '📝',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      workspaceId: await DataManager.getCurrentWorkspaceId(),
      isFavorite: false
    };
    await DataManager.saveNote(newNote);
    navigate(`/editor/${newNote.id}`);
  };

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none">
      <nav className="bg-[#1c1c1c]/80 backdrop-blur-3xl border border-white/5 p-2 rounded-[32px] flex items-center gap-2 shadow-2xl shadow-black/80 pointer-events-auto">
        {/* Tools - Equals size to Ask AI (Circle) */}
        <NavLink
          to="/tools"
          className={({ isActive }) =>
            cn(
              "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300",
              isActive ? "bg-white text-black shadow-lg shadow-white/10" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
            )
          }
        >
          <Wrench size={20} />
        </NavLink>

        {/* Plus Button - Wider Pill (Primary Action) */}
        <button
          onClick={handleQuickNote}
          className="h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-[24px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-600/20 border border-blue-400/30"
        >
          <div className="flex items-center gap-2">
             <Plus size={22} strokeWidth={3} />
             <span className="text-[11px] font-black uppercase tracking-[0.15em]">New Note</span>
          </div>
        </button>

        {/* Ask AI - Equals size to Tools (Circle) */}
        <NavLink
          to="/ai-auto"
          className={({ isActive }) =>
            cn(
              "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300",
              isActive ? "bg-white text-black shadow-lg shadow-white/10" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
            )
          }
        >
          <Sparkles size={20} />
        </NavLink>
      </nav>
    </div>
  );
}
