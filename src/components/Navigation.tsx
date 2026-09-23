/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText } from 'lucide-react';
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
    }
  ];

  return (
    <>
      {/* Android Material 3 Bottom Navigation Bar with Centered FAB */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[70] bg-[#1a1918]/95 backdrop-blur-xl border-t border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.6)] select-none"
        style={{ paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-md mx-auto px-3 pt-1.5 flex items-center justify-between relative">
          {/* Left item: Notes */}
          <NavLink
            to="/main"
            id="android-nav-Notes"
            className="flex-1 flex flex-col items-center py-1 group active:scale-95 transition-transform"
          >
            <div 
              className={cn(
                "px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center",
                (location.pathname === '/' || location.pathname === '/main') 
                  ? "bg-[#FFB03A]/20 text-[#FFB03A] shadow-inner" 
                  : "text-white/50 group-hover:text-white/80 group-hover:bg-white/[0.04]"
              )}
            >
              <FileText size={20} strokeWidth={(location.pathname === '/' || location.pathname === '/main') ? 2.4 : 1.9} />
            </div>
            <span 
              className={cn(
                "text-[10px] font-semibold mt-0.5 tracking-tight transition-colors",
                (location.pathname === '/' || location.pathname === '/main') ? "text-[#FFB03A] font-bold" : "text-white/50 group-hover:text-white/70"
              )}
            >
              নোটস
            </span>
          </NavLink>

          {/* Center item: Plus Action Button */}
          {!isOverLimit && (
            <div className="flex-1 flex flex-col items-center justify-center relative -top-3">
              <button
                onClick={createQuickNote}
                id="android-fab-new-note"
                aria-label="নতুন নোট তৈরি করুন"
                className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FFB03A] to-[#FFC966] text-black flex items-center justify-center shadow-[0_8px_20px_rgba(255,176,58,0.4)] border border-amber-300/40 hover:scale-105 active:scale-90 transition-all duration-150"
              >
                <Plus size={24} strokeWidth={2.8} />
              </button>
            </div>
          )}

          {/* Right item: Search */}
          <NavLink
            to="/search"
            id="android-nav-Search"
            className="flex-1 flex flex-col items-center py-1 group active:scale-95 transition-transform"
          >
            <div 
              className={cn(
                "px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center",
                location.pathname === '/search'
                  ? "bg-[#FFB03A]/20 text-[#FFB03A] shadow-inner" 
                  : "text-white/50 group-hover:text-white/80 group-hover:bg-white/[0.04]"
              )}
            >
              <Search size={20} strokeWidth={location.pathname === '/search' ? 2.4 : 1.9} />
            </div>
            <span 
              className={cn(
                "text-[10px] font-semibold mt-0.5 tracking-tight transition-colors",
                location.pathname === '/search' ? "text-[#FFB03A] font-bold" : "text-white/50 group-hover:text-white/70"
              )}
            >
              সার্চ
            </span>
          </NavLink>
        </div>

        {/* Android Gesture Navigation Indicator Pill */}
        <div className="w-28 h-1 bg-white/20 rounded-full mx-auto mt-1 mb-0.5 pointer-events-none" />
      </div>
    </>
  );
}
