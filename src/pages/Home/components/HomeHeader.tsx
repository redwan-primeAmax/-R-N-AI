/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Menu, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../utils/cn';

interface HomeHeaderProps {
  currentWorkspaceName: string;
  activeTasksCount: number;
  onOpenWorkspace: () => void;
  onOpenMenu: () => void;
  onSearchQueryChange?: (query: string, isAccurate: boolean) => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ 
  currentWorkspaceName, 
  activeTasksCount, 
  onOpenWorkspace,
  onOpenMenu,
  onSearchQueryChange
}) => {
  const navigate = useNavigate();
  const [isAccurateMode, setIsAccurateMode] = useState(false);
  const [query, setQuery] = useState('');

  const handleToggleAccurate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isAccurateMode;
    setIsAccurateMode(nextState);
    if (onSearchQueryChange) onSearchQueryChange(query, nextState);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (onSearchQueryChange) onSearchQueryChange(val, isAccurateMode);
  };

  return (
    <div className="px-4 pt-1.5 pb-2 sticky top-0 bg-[var(--bg-main)]/95 backdrop-blur-xl z-40 border-b border-white/[0.04]">
      {/* Android Material 3 Pill Top App Bar with minimal gap */}
      <div className="flex items-center gap-2 bg-[#262422]/90 hover:bg-[#2c2a27] border border-white/[0.08] shadow-md rounded-full px-2.5 py-1 transition-all">
        {/* Android Navigation Drawer Button (Hamburger Menu) */}
        <button 
          onClick={onOpenMenu}
          id="android-menu-drawer-btn"
          className="w-9 h-9 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-90 transition-all shrink-0"
          aria-label="মেইন ড্রয়ার খুলুন"
        >
          <Menu size={19} strokeWidth={2.2} />
        </button>

        {/* Central Search Bar Touch Target */}
        <div className="flex-1 flex items-center gap-2 text-left py-1 px-1 text-white/50">
          <button
            onClick={handleToggleAccurate}
            title={isAccurateMode ? "Accurate Search ON (Prefix Match)" : "Fuzzy Search (Default)"}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-90",
              isAccurateMode ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/30" : "text-neutral-400 hover:text-white"
            )}
          >
            <Search size={16} />
          </button>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (window.location.hash !== '#/search' && window.location.pathname !== '/search') {
                navigate('/search', { state: { query, isAccurateMode } });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate('/search', { state: { query, isAccurateMode } });
              }
            }}
            placeholder={isAccurateMode ? "Accurate Search ON" : "Type..."}
            className={cn(
              "bg-transparent text-[13px] font-medium outline-none border-none w-full text-white transition-all",
              isAccurateMode ? "placeholder:text-emerald-500/60" : "placeholder:text-neutral-400/60"
            )}
          />
        </div>

        {/* Right Side: Active task indicator & Workspace Avatar Chip */}
        <div className="flex items-center gap-1.5 shrink-0">
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
    </div>
  );
};
