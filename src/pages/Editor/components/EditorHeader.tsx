/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreVertical, Search, ChevronLeft, ChevronRight, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Note } from '../../../services/storage/DataManager';
import { PublishIcon } from '../svg/PublishIcon';
import { PageIcon } from '../../../components/PageIcon';
import { cn } from '../../../utils/cn';

interface EditorHeaderProps {
  onBack: () => void;
  workspaceName: string;
  parentNote: Note | null;
  parentTrail?: Note[];
  title: string;
  activeTasksCount: number;
  onShowMenu: () => void;
  onExportPDF?: () => void;
  onNavigateToNote?: (noteId: string) => void;
  editor?: any;
  isSaving?: boolean;
  saveError?: string | null;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onBack,
  workspaceName,
  parentNote,
  parentTrail = [],
  title,
  activeTasksCount,
  onShowMenu,
  onExportPDF,
  onNavigateToNote,
  editor,
  isSaving = false,
  saveError = null
}) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState({ results: 0, currentIndex: 0 });
  const [isProgressiveMounted, setIsProgressiveMounted] = useState(false);

  // Progressive loading optimization: Header container renders first, then child components mount smoothly
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsProgressiveMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

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
      if (searchQuery !== '') {
        if ((editor.commands as any)?.setSearchTerm) {
           (editor.commands as any).setSearchTerm('');
        }
        setSearchQuery('');
      }
    }
  }, [isSearchActive, editor, searchQuery]);

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

  const debouncedSetSearch = useMemo(() => {
    let timeout: any;
    return (val: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if ((editor.commands as any)?.setSearchTerm) {
          (editor.commands as any).setSearchTerm(val);
          scrollToCurrentResult();
        }
      }, 300);
    };
  }, [editor]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    debouncedSetSearch(val);
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
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-xl transition-colors px-4 h-14 flex items-center border-b border-black/5 dark:border-white/5">
      <AnimatePresence mode="wait">
        {isSearchActive ? (
          <motion.div 
            key="search"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between gap-2 w-full h-full max-w-4xl mx-auto overflow-hidden"
          >
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0 pr-1">
                <div className="flex-1 min-w-[140px] flex items-center bg-gray-500/10 rounded-full px-4 h-10 border border-gray-500/20 focus-within:border-blue-500/50 transition-colors">
                  <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="খুঁজুন..." 
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm placeholder:text-gray-400 min-w-[80px]"
                  />
                  {searchState.results > 0 && (
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest ml-2 whitespace-nowrap bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md">
                      {searchState.currentIndex} / {searchState.results}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0 bg-gray-500/5 rounded-full p-1 border border-gray-500/10">
                  <button
                    onClick={handlePrev}
                    disabled={searchState.results === 0}
                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-90 text-gray-500 hover:bg-gray-500/10 disabled:opacity-10"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={searchState.results === 0}
                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-90 text-gray-500 hover:bg-gray-500/10 disabled:opacity-10"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-1">
                <div className="w-[1px] h-6 bg-gray-300 dark:bg-white/10 mx-1 flex-shrink-0" />
                <button
                  onClick={() => setIsSearchActive(false)}
                  className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-2xl transition-all active:scale-90 bg-red-500/10 text-red-500 border border-red-500/10 hover:bg-red-500/20 shadow-lg shadow-red-500/5"
                >
                  <X size={20} />
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
            <div className="flex items-center min-w-0 flex-1 mr-2">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={onBack} 
                className="p-1.5 -ml-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
                title="Back"
                aria-label="ফিরে যান"
              >
                <ArrowLeft size={20} strokeWidth={2.2} />
              </motion.button>

              {/* Notion-style Hierarchical Breadcrumb Trail: Current Page / Parent / [...] / Workspace */}
              {isProgressiveMounted && (
                <div className="flex items-center min-w-0 ml-1.5 overflow-hidden text-xs gap-0.5">
                  {/* 1. Current Page Name */}
                  <span 
                    className="font-bold text-gray-900 dark:text-white truncate shrink-0 max-w-[130px] sm:max-w-[160px]"
                    title={title || 'Untitled'}
                  >
                    {title || 'Untitled'}
                  </span>

                  {/* 2. Parent Page / Note */}
                  {parentNote && (
                    <div className="flex items-center shrink-0 min-w-0 max-w-[130px]">
                      <span className="text-gray-400/50 mx-1 shrink-0 font-medium select-none">/</span>
                      <button 
                        onClick={() => onNavigateToNote?.(parentNote.id)}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white truncate font-medium transition-colors"
                        title={parentNote.title || 'Parent Note'}
                      >
                        <PageIcon emoji={parentNote.emoji} className="shrink-0 text-xs" />
                        <span className="truncate">{parentNote.title || 'Untitled'}</span>
                      </button>
                    </div>
                  )}

                  {/* 3. Deep Ancestor Pages indicator if nested deeper */}
                  {parentTrail && parentTrail.length > 1 && (
                    <div className="flex items-center shrink-0">
                      <span className="text-gray-400/50 mx-1 shrink-0 font-medium select-none">/</span>
                      <button 
                        onClick={() => onNavigateToNote?.(parentTrail[1].id)}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-1 py-0.5 rounded text-[10px] font-bold tracking-widest shrink-0 transition-colors bg-black/5 dark:bg-white/5"
                        title={parentTrail.slice(1).map(p => p.title || 'Untitled').join(' > ')}
                      >
                        ...
                      </button>
                    </div>
                  )}

                  {/* 4. Workspace Name */}
                  {workspaceName && (
                    <div className="flex items-center shrink-0 min-w-0 max-w-[110px]">
                      <span className="text-gray-400/50 mx-1 shrink-0 font-medium select-none">/</span>
                      <span 
                        onClick={onBack}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 truncate cursor-pointer font-medium"
                        title={workspaceName}
                      >
                        {workspaceName}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isProgressiveMounted && (
              <div className="flex items-center gap-2">
                 {saveError ? (
                   <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-bold animate-pulse border border-red-500/20">
                     <AlertCircle size={12} /> সংরক্ষণ ব্যর্থ
                   </div>
                 ) : isSaving ? (
                   <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-bold border border-blue-500/20">
                     <RefreshCw size={12} className="animate-spin" /> সংরক্ষিত হচ্ছে...
                   </div>
                 ) : null}

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
                  aria-label="আরও অপশন"
                 >
                  <MoreVertical size={22} />
                 </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
