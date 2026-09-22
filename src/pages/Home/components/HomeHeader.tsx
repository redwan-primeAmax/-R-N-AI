/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, Search, Loader2, Sparkles, Bookmark, Lock, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HomeHeaderProps {
  currentWorkspaceName: string;
  activeTasksCount: number;
  onOpenWorkspace: () => void;
  onOpenMenu: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ 
  currentWorkspaceName, 
  activeTasksCount, 
  onOpenWorkspace,
  onOpenMenu
}) => {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-3 pb-3 sticky top-0 bg-[var(--bg-main)]/95 backdrop-blur-xl z-40 border-b border-white/[0.04]">
      {/* Android Material 3 Pill Top App Bar (Google Keep style) */}
      <div className="flex items-center gap-2 bg-[#262422]/90 hover:bg-[#2c2a27] border border-white/[0.08] shadow-md hover:shadow-lg rounded-full px-2.5 py-1.5 transition-all">
        {/* Android Navigation Drawer Button (Hamburger Menu) */}
        <button 
          onClick={onOpenMenu}
          id="android-menu-drawer-btn"
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          aria-label="মেইন ড্রয়ার খুলুন"
        >
          <Menu size={20} strokeWidth={2.2} />
        </button>

        {/* Central Search Bar Touch Target */}
        <button
          onClick={() => navigate('/search')}
          id="android-header-search-bar"
          className="flex-1 flex items-center gap-2.5 text-left py-2 px-1 text-white/50 hover:text-white/80 active:scale-[0.99] transition-all"
        >
          <Search size={17} className="text-white/40" />
          <span className="text-[13px] font-medium tracking-tight truncate">
            নোট বা টাস্ক খুঁজুন...
          </span>
        </button>

        {/* Right Side: Active task indicator & Workspace Avatar Chip */}
        <div className="flex items-center gap-1.5">
          {activeTasksCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <Loader2 size={11} className="animate-spin text-amber-400" />
              <span className="text-[9px] font-bold text-amber-400">Syncing</span>
            </div>
          )}

          <button 
            onClick={onOpenWorkspace}
            id="android-workspace-chip"
            className="flex items-center gap-1.5 p-1 pr-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 active:scale-90 transition-all"
            title="ওয়ার্কস্পেস পরিবর্তন"
          >
            <div className="w-7 h-7 bg-gradient-to-tr from-amber-500 to-amber-400 text-black font-black text-[11px] rounded-full flex items-center justify-center shadow-sm">
              {currentWorkspaceName?.substring(0, 1) || 'W'}
            </div>
            <span className="text-[11px] font-bold text-white/90 max-w-[70px] truncate hidden xs:inline">
              {currentWorkspaceName || 'নোটস'}
            </span>
          </button>
        </div>
      </div>

      {/* Android Material 3 Quick Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 px-1">
        <button
          onClick={() => navigate('/main')}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-[#FFB03A] text-black text-[11px] font-black tracking-tight flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          সব নোট
        </button>
        <button
          onClick={() => navigate('/bookmarks')}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white/80 text-[11px] font-bold tracking-tight flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Bookmark size={12} className="text-amber-400" />
          বুকমার্ক
        </button>
        <button
          onClick={() => navigate('/vault')}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white/80 text-[11px] font-bold tracking-tight flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Lock size={12} className="text-amber-400" />
          সিকিউর ভল্ট
        </button>
        <button
          onClick={() => navigate('/tools')}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white/80 text-[11px] font-bold tracking-tight flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <LayoutGrid size={12} className="text-amber-400" />
          টুলস
        </button>
        <button
          onClick={() => navigate('/ai-auto')}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white/80 text-[11px] font-bold tracking-tight flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Sparkles size={12} className="text-amber-400" />
          AI সাহায্য
        </button>
      </div>
    </div>
  );
};
