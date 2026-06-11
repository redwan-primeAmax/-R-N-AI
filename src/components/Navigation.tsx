/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Plus, Sparkles, Boxes } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DataManager, Note } from '../services/storage/DataManager';
import { useState, useEffect } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navigation() {
  const navigate = useNavigate();
  const [isOverLimit, setIsOverLimit] = useState(false);

  useEffect(() => {
    const checkLimit = async () => {
      try {
        const activeId = await DataManager.getActiveWorkspaceId();
        const counts = await DataManager.getNoteCountForWorkspaces();
        const count = counts[activeId] || 0;
        setIsOverLimit(count >= 10000);
      } catch (err) {
        console.error(err);
      }
    };

    checkLimit();

    window.addEventListener('workspace-notes-changed', checkLimit);
    return () => {
      window.removeEventListener('workspace-notes-changed', checkLimit);
    };
  }, []);

  const createQuickNote = async () => {
    try {
      const newNote = await DataManager.createNote(await DataManager.getActiveWorkspaceId());
      navigate(`/editor/${newNote.id}`);
    } catch (err: any) {
      alert(err.message || 'Error creating note');
    }
  };

  if (isOverLimit) {
    return (
      <div className="fixed bottom-8 right-8 z-[100] pointer-events-none">
        <nav className="bg-[#1c1c1c]/90 backdrop-blur-3xl border-2 border-red-500/30 p-2 rounded-full flex items-center shadow-2xl shadow-red-500/5 pointer-events-auto">
          <NavLink
            to="/search"
            title="Search Notes"
            className={({ isActive }) =>
              cn(
                "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300",
                isActive ? "bg-white text-black shadow-lg shadow-white/10" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
              )
            }
          >
            <Search size={20} />
          </NavLink>
        </nav>
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none">
      <nav className="relative overflow-hidden bg-[#1a1a1a]/95 backdrop-blur-3xl border border-white/10 border-b-[4px] border-r-[1.5px] p-2 rounded-[32px] flex items-center gap-2 shadow-2xl shadow-black/90 pointer-events-auto">
        {/* Texture Overlay - Strategic layering for high quality visual finish */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay"
          style={{ 
            backgroundImage: "url('/textures/navbar_icon.png')",
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
        
        {/* Search */}
        <NavLink
          to="/search"
          className={({ isActive }) =>
            cn(
              "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 border",
              isActive 
                ? "bg-white text-black border-white border-b-[3px] border-r-[1px] shadow-lg shadow-white/10" 
                : "bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white hover:border-white/5"
            )
          }
        >
          <Search size={20} className={cn("transition-opacity", "opacity-40")} />
        </NavLink>

        {/* Quick Note */}
        <button
          onClick={createQuickNote}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white hover:border-white/5 transition-all duration-300 active:scale-95 active:translate-y-0.5"
        >
          <Plus size={22} className="opacity-40" />
        </button>

        {/* Ask AI */}
        <NavLink
          to="/ai-auto"
          className={({ isActive }) =>
            cn(
              "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 border",
              isActive 
                ? "bg-white text-black border-white border-b-[3px] border-r-[1px] shadow-lg shadow-white/10" 
                : "bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white hover:border-white/5"
            )
          }
        >
          <Sparkles size={20} className={cn("transition-opacity", "opacity-40")} />
        </NavLink>
      </nav>
    </div>
  );
}
