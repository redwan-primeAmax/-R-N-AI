/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, ChevronLeft, ChevronRight, Slash, X,
  RefreshCw, AlertCircle, FileText, Plus, Link2, Palette, Tag, Share2, Trash2
} from 'lucide-react';
import { Note } from '../../../services/storage/DataManager';
import { PageIcon } from '../../../components/PageIcon';
import { cn } from '../../../utils/cn';
import { useLanguage } from '../../../utils/translator';
import { useEditorModal } from '../context/EditorModalContext';

interface EditorHeaderProps {
  onBack: () => void;
  workspaceName?: string;
  parentNote: Note | null;
  title: string;
  activeTasksCount: number;
  onNavigateToNote?: (noteId: string) => void;
  editor?: any;
  isSaving?: boolean;
  saveError?: string | null;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onBack,
  parentNote,
  title,
  onNavigateToNote,
  editor,
  isSaving = false,
  saveError = null
}) => {
  const { t } = useLanguage();
  const {
    currentSubPages,
    handleAddSubPage,
    setSubPageMode,
    setShowThemeSelector,
    setShowTagPrompt,
    setShowExportModal,
    setShowDeleteConfirm,
  } = useEditorModal();

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

  const subPages = currentSubPages || [];

  const headerActionClass = "w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 shrink-0";

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white/85 dark:bg-[#1a1a1a]/85 backdrop-blur-xl transition-colors border-b border-black/5 dark:border-white/5">
      <AnimatePresence mode="wait">
        {isSearchActive ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between gap-2 w-full h-14 max-w-4xl mx-auto overflow-hidden px-4"
          >
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0 pr-1">
                <div className="flex-1 min-w-[140px] flex items-center bg-gray-500/10 rounded-full px-4 h-10 border border-gray-500/20 focus-within:border-blue-500/50 transition-colors">
                  <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder={t('editor.searchPlaceholder')}
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
            className="w-full max-w-4xl mx-auto px-4"
          >
            {/* Row 1: back · breadcrumb [Current] / [Parent] · status · search */}
            <div className="flex items-center justify-between w-full h-14">
              <div className="flex items-center min-w-0 flex-1 mr-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onBack}
                  className="p-1.5 -ml-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
                  title={t('common.back')}
                  aria-label={t('common.back')}
                >
                  <ArrowLeft size={20} strokeWidth={2.2} />
                </motion.button>

                {/* Breadcrumb: [Current Page] / [Parent Page] — the parent
                    segment (and its slash) is omitted for main pages. */}
                <nav aria-label="breadcrumb" className="flex items-center min-w-0 ml-1.5 overflow-hidden text-[13px]">
                  <span className="font-bold text-gray-900 dark:text-white truncate min-w-0" title={title || t('nav.untitled')}>
                    {title || t('nav.untitled')}
                  </span>
                  {parentNote && (
                    <>
                      <Slash size={12} className="text-gray-400/50 mx-1.5 shrink-0 -rotate-12" />
                      <button
                        onClick={() => onNavigateToNote?.(parentNote.id)}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 truncate font-medium transition-colors min-w-0"
                        title={parentNote.title || t('nav.untitled')}
                      >
                        <PageIcon emoji={parentNote.emoji} className="shrink-0 text-sm" />
                        <span className="truncate">{parentNote.title || t('nav.untitled')}</span>
                      </button>
                    </>
                  )}
                </nav>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                 {saveError ? (
                   <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-bold animate-pulse border border-red-500/20">
                     <AlertCircle size={12} /> {t('editor.saveFailed')}
                   </div>
                 ) : isSaving ? (
                   <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-bold border border-blue-500/20">
                     <RefreshCw size={12} className="animate-spin" /> {t('editor.saving')}
                   </div>
                 ) : null}

                 <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSearchActive(true)}
                  className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-90"
                  title={t('nav.search')}
                 >
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                 </motion.button>
              </div>
            </div>

            {/* Row 2: sub-page navigation lives directly in the header.
                Chips scroll horizontally (swipe) when space runs out —
                nothing ever overflows the header. */}
            <div className="flex items-center gap-2 pb-2.5 -mt-0.5">
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400/70 dark:text-white/30 shrink-0 hidden min-[400px]:block">
                {t('editor.subpages')}
              </span>

              <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar py-0.5 pr-1">
                {subPages.length === 0 && (
                  <span className="text-[11px] font-medium text-gray-400/60 dark:text-white/25 whitespace-nowrap">
                    {t('editor.noSubpages')}
                  </span>
                )}
                {subPages.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => onNavigateToNote?.(sub.id)}
                    className="flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border border-black/[0.04] dark:border-white/[0.06] text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 shrink-0 max-w-[150px]"
                    title={sub.title || t('nav.untitled')}
                  >
                    {sub.emoji
                      ? <PageIcon emoji={sub.emoji} className="shrink-0 text-[13px]" />
                      : <FileText size={12} className="shrink-0 opacity-60" />}
                    <span className="text-[11px] font-bold truncate">{sub.title || t('nav.untitled')}</span>
                  </button>
                ))}

                <button
                  onClick={() => handleAddSubPage()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-500 dark:text-blue-400 transition-all active:scale-95 shrink-0"
                  title={t('editor.addSubpage')}
                >
                  <Plus size={12} strokeWidth={3} />
                  <span className="text-[11px] font-black whitespace-nowrap">{t('editor.addSubpage')}</span>
                </button>
                <button
                  onClick={() => setSubPageMode('attach')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border border-black/[0.04] dark:border-white/[0.06] text-gray-500 dark:text-white/60 transition-all active:scale-95 shrink-0"
                  title={t('editor.attachSubpage')}
                >
                  <Link2 size={12} />
                  <span className="text-[11px] font-bold whitespace-nowrap">{t('editor.attachSubpage')}</span>
                </button>
              </div>

              {/* Page actions that used to hide behind the three-dot menu,
                  now direct icon buttons in the header. */}
              <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-black/[0.06] dark:border-white/[0.08]">
                <button onClick={() => setShowThemeSelector(true)} className={headerActionClass} title={t('editor.theme')} aria-label={t('editor.theme')}>
                  <Palette size={16} />
                </button>
                <button onClick={() => setShowTagPrompt(true)} className={headerActionClass} title={t('editor.tags')} aria-label={t('editor.tags')}>
                  <Tag size={16} />
                </button>
                <button onClick={() => setShowExportModal(true)} className={headerActionClass} title={t('editor.export')} aria-label={t('editor.export')}>
                  <Share2 size={16} />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={cn(headerActionClass, "hover:!text-red-500 hover:!bg-red-500/10")}
                  title={t('editor.delete')}
                  aria-label={t('editor.delete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
