/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Plus, Sparkles, FileText, LayoutGrid } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { DataManager } from '../services/storage/DataManager';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const isEditorPage = location.pathname.startsWith('/editor/');
  if (isEditorPage) return null;

  const navItems = [
    {
      to: '/main',
      label: 'নোটস',
      icon: FileText,
      isActive: location.pathname === '/' || location.pathname === '/main'
    },
    {
      to: '/search',
      label: 'সার্চ',
      icon: Search,
      isActive: location.pathname === '/search'
    },
    {
      to: '/ai-auto',
      label: 'AI সহকারী',
      icon: Sparkles,
      isActive: location.pathname.startsWith('/ai') || location.pathname === '/manual-control'
    },
    {
      to: '/tools',
      label: 'টুলস',
      icon: LayoutGrid,
      isActive: location.pathname === '/tools'
    }
  ];

  return (
    <>
      {/* Android Material 3 Floating Action Button (FAB) */}
      {!isOverLimit && (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 right-5 z-[80]"
        >
          <button
            onClick={createQuickNote}
            id="android-fab-new-note"
            aria-label="নতুন নোট তৈরি করুন"
            className="flex items-center gap-2 px-4 py-3.5 rounded-[22px] bg-gradient-to-r from-[#FFB03A] to-[#FFC966] text-black font-extrabold shadow-[0_10px_25px_rgba(255,176,58,0.4)] border border-amber-300/30 hover:shadow-[0_14px_30px_rgba(255,176,58,0.5)] active:scale-95 transition-all duration-150 group"
          >
            <Plus size={22} strokeWidth={2.6} className="group-hover:rotate-90 transition-transform duration-200" />
            <span className="text-[13px] tracking-tight font-black pr-1 hidden sm:inline">নতুন নোট</span>
          </button>
        </motion.div>
      )}

      {/* Android Material 3 Bottom Navigation Bar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[70] bg-[#1a1918]/95 backdrop-blur-xl border-t border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.6)] select-none"
        style={{ paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-md mx-auto px-3 pt-1.5 flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                id={`android-nav-${item.label}`}
                className="flex-1 flex flex-col items-center py-1 group active:scale-95 transition-transform"
              >
                <div 
                  className={cn(
                    "px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center",
                    active 
                      ? "bg-[#FFB03A]/20 text-[#FFB03A] shadow-inner" 
                      : "text-white/50 group-hover:text-white/80 group-hover:bg-white/[0.04]"
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
                </div>
                <span 
                  className={cn(
                    "text-[10px] font-semibold mt-0.5 tracking-tight transition-colors",
                    active ? "text-[#FFB03A] font-bold" : "text-white/50 group-hover:text-white/70"
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>

        {/* Android Gesture Navigation Indicator Pill */}
        <div className="w-28 h-1 bg-white/20 rounded-full mx-auto mt-1.5 mb-0.5 pointer-events-none" />
      </div>
    </>
  );
}
