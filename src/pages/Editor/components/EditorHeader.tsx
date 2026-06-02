/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreHorizontal, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Note } from '../../../services/storage/DataManager';
import { PublishIcon } from '../svg/PublishIcon';

interface EditorHeaderProps {
  onBack: () => void;
  workspaceName: string;
  parentNote: Note | null;
  title: string;
  activeTasksCount: number;
  onShowMenu: () => void;
  onExportPDF?: () => void;
  isCollaborating?: boolean;
  collabPeerCount?: number;
  onNavigateToNote?: (noteId: string) => void;
  onStartCollab?: () => void;
  editor?: any;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onBack,
  onShowMenu,
  onStartCollab,
  isCollaborating = false,
  collabPeerCount = 0,
  editor
}) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState({ results: 0, currentIndex: 0 });

  useEffect(() => {
    const handleOpenSearch = () => setIsSearchActive(true);
    window.addEventListener('editor-event-openSearch', handleOpenSearch);
    return () => window.removeEventListener('editor-event-openSearch', handleOpenSearch);
  }, []);

  useEffect(() => {
    if (!editor) return;
    const handleTransaction = () => {
      if (isSearchActive) {
        const searchStorage = editor.storage?.searchAndReplace || {};
        const results = searchStorage.results || [];
        const resultIndex = searchStorage.resultIndex != null ? searchStorage.resultIndex : 0;
        setSearchState({
          results: results.length,
          currentIndex: results.length > 0 ? resultIndex + 1 : 0
        });
      }
    };
    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor, isSearchActive]);

  useEffect(() => {
    if (editor && !isSearchActive) {
      if ((editor.commands as any)?.setSearchTerm) {
         (editor.commands as any).setSearchTerm('');
      }
      setSearchQuery('');
    }
  }, [isSearchActive, editor]);

  const scrollToCurrentResult = () => {
    setTimeout(() => {
      const activeMark = document.querySelector('mark.search-result-current') || document.querySelector('mark');
      if (activeMark) {
        activeMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        activeMark.classList.add('flash-highlight');
        setTimeout(() => activeMark.classList.remove('flash-highlight'), 1500);
      }
    }, 50);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if ((editor.commands as any)?.setSearchTerm) {
      (editor.commands as any).setSearchTerm(val);
      scrollToCurrentResult();
    }
  };

  const handleNext = () => {
    (editor.commands as any)?.nextSearchResult?.();
    scrollToCurrentResult();
  };

  const handlePrev = () => {
    (editor.commands as any)?.previousSearchResult?.();
    scrollToCurrentResult();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-transparent transition-colors px-4 h-14 flex items-center border-none">
      <AnimatePresence mode="wait">
        {isSearchActive ? (
          <motion.div 
            key="search"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between gap-2 w-full h-full max-w-4xl mx-auto"
          >
            <div className="flex-1 flex items-center bg-gray-500/10 rounded-full px-4 h-10 border border-gray-500/20 focus-within:border-blue-500/50 transition-colors">
              <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
              <input 
                autoFocus
                type="text" 
                placeholder="খুঁজুন..." 
                value={searchQuery}
                onChange={handleSearchChange}
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm placeholder:text-gray-400"
              />
              {searchState.results > 0 && (
                <span className="text-[10px] text-gray-400 font-mono ml-2 whitespace-nowrap">
                  {searchState.currentIndex} / {searchState.results}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handlePrev}
                disabled={searchState.results === 0}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-90 text-gray-500 hover:bg-gray-500/10 disabled:opacity-20 disabled:grayscale"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                disabled={searchState.results === 0}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-90 text-gray-500 hover:bg-gray-500/10 disabled:opacity-20 disabled:grayscale"
              >
                <ChevronRight size={18} />
              </button>
              <div className="w-[1px] h-4 bg-gray-300 mx-1 flex-shrink-0" />
              <button
                onClick={() => setIsSearchActive(false)}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-90 text-gray-500 hover:bg-gray-500/10"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between w-full h-full max-w-4xl mx-auto"
          >
            <div className="flex items-center">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={onBack} 
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Back"
              >
                <ArrowLeft size={22} strokeWidth={2.5} />
              </motion.button>
            </div>

            <div className="flex items-center gap-2">
               <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onStartCollab}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all flex items-center gap-1.5"
                title="Collaborate / Publish"
               >
                 <PublishIcon size={22} />
                 {isCollaborating && (
                   <span className="text-[10px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                     {collabPeerCount}
                   </span>
                 )}
               </motion.button>
               
               <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSearchActive(true)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-90"
                title="Search"
               >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
               </motion.button>

               <button 
                onClick={onShowMenu}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-90"
                title="More options"
               >
                <MoreHorizontal size={24} />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
