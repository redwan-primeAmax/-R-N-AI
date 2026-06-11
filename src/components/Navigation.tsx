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
      <nav className="relative overflow-hidden border border-white/10 border-b-[4px] border-r-[1.5px] rounded-[32px] flex items-center gap-2 shadow-2xl shadow-black/90 pointer-events-auto">
        {/* Layer 1: Solid Background */}
        <div className="absolute inset-0 bg-[#1a1a1a]/95 backdrop-blur-3xl" />
        
        {/* Layer 2: Texture Overlay - Locked at 100% visibility per developer instructions */}
        <div 
          className="absolute inset-0 opacity-100 pointer-events-none z-0"
          style={{ 
            backgroundImage: "url('/textures/navbar_icon.png')",
            backgroundSize: '180px auto',
            backgroundPosition: 'center',
            backgroundRepeat: 'repeat'
          }}
        />
        
        {/* Layer 3: Content (Buttons) */}
        <div className="relative z-10 flex items-center gap-2 p-2 focus-within:ring-2 ring-white/20 rounded-[32px]">
          {/* Search */}
          <NavLink
            to="/search"
            className={({ isActive }) =>
              cn(
                "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 border",
                isActive 
                  ? "bg-white text-black border-white border-b-[3px] border-r-[1px] shadow-lg shadow-white/20" 
                  : "bg-white/5 text-white/70 border-transparent hover:bg-white/10 hover:text-white hover:border-white/10"
              )
            }
          >
            <Search size={22} className="transition-transform group-hover:scale-110" />
          </NavLink>

          <div className="w-[1px] h-8 bg-white/10 mx-1" />

          {/* Quick Note */}
          <button
            onClick={createQuickNote}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white/80 border border-white/10 hover:bg-white/20 hover:text-white transition-all duration-300 active:scale-95 active:translate-y-0.5 shadow-lg"
          >
            <Plus size={24} />
          </button>

          <div className="w-[1px] h-8 bg-white/10 mx-1" />

          {/* Ask AI */}
          <NavLink
            to="/ai-auto"
            className={({ isActive }) =>
              cn(
                "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 border",
                isActive 
                  ? "bg-white text-black border-white border-b-[3px] border-r-[1px] shadow-lg shadow-white/20" 
                  : "bg-white/5 text-white/70 border-transparent hover:bg-white/10 hover:text-white hover:border-white/10"
              )
            }
          >
            <Sparkles size={22} className="transition-transform group-hover:scale-110" />
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
