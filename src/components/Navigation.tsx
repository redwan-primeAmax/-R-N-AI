/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Sparkles, Layout, Wrench } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navigation() {
  return (
    <nav className="bg-[#191919]/95 backdrop-blur-xl border-t border-white/5 pb-safe-area-inset-bottom">
      <div className="flex justify-between items-center max-w-lg mx-auto px-6 py-4">
        {/* Ask AI - Pill Shape */}
        <NavLink
          to="/ai-auto"
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

        {/* Home/Main */}
        <NavLink
          to="/main"
          className={({ isActive }) =>
            cn(
              "p-2 rounded-full transition-all",
              isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
            )
          }
        >
          <Layout size={24} strokeWidth={2} />
        </NavLink>

        {/* Tools */}
        <NavLink
          to="/tools"
          className={({ isActive }) =>
            cn(
              "p-2 rounded-full transition-all",
              isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
            )
          }
        >
          <Wrench size={24} strokeWidth={2} />
        </NavLink>
      </div>
    </nav>
  );
}
