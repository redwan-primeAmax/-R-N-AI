/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, ChevronRight, Loader2 } from 'lucide-react';

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
  return (
    <div className="px-4 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-2xl z-40">
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <button 
        onClick={onOpenWorkspace}
        className="flex items-center gap-3 group active:scale-95 transition-all p-1 pr-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
      >
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-[12px] shadow-[0_4px_12px_rgba(37,99,235,0.3)] uppercase tracking-tighter text-white">
          {currentWorkspaceName?.substring(0, 2) || 'WS'}
        </div>
        <div className="flex flex-col items-start -space-y-1">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Workspace</span>
          <div className="flex items-center gap-1">
            <span className="font-bold text-[13px] tracking-tight text-white/90 group-hover:text-white">
              {currentWorkspaceName || 'Workspace'}
            </span>
            <ChevronRight size={12} className="text-white/20 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </button>
      
      <div className="flex items-center gap-2">
        {activeTasksCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mr-2">
            <Loader2 size={10} className="animate-spin text-blue-400" />
            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap">Working</span>
          </div>
        )}
        <button 
          onClick={onOpenMenu}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/80 active:scale-95 border border-white/5 shadow-xl"
          aria-label="মেইন মেনু"
        >
          <Menu size={20} />
        </button>
      </div>
    </div>
  );
};
