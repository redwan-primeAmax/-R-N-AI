/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ContentSearchProps {
  editor: any;
  isSearchActive: boolean;
  setIsSearchActive: (active: boolean) => void;
}

export const ContentSearch: React.FC<ContentSearchProps> = ({
  editor,
  isSearchActive,
  setIsSearchActive
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState({ results: 0, currentIndex: 0 });

  useEffect(() => {
    if (!editor) return;
    const handleTransaction = () => {
      if (isSearchActive) {
        const searchStorage = editor.storage.searchAndReplace || {};
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
      if ((editor.commands as any).setSearchTerm) {
         (editor.commands as any).setSearchTerm('');
      }
      setSearchQuery('');
    }
  }, [isSearchActive, editor]);

  if (!editor || !isSearchActive) return null;

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
    if ((editor.commands as any).setSearchTerm) {
      (editor.commands as any).setSearchTerm(val);
      scrollToCurrentResult();
    }
  };

  const handleNext = () => {
    (editor.commands as any).nextSearchResult();
    scrollToCurrentResult();
  };

  const handlePrev = () => {
    (editor.commands as any).previousSearchResult();
    scrollToCurrentResult();
  };

  return (
    <div className="max-w-3xl mx-auto flex items-center justify-between h-14 px-3 gap-2 w-full animate-fade-in">
      <div className="flex-1 flex items-center bg-white/5 rounded-xl px-3 h-10 border border-white/5 focus-within:border-blue-500/50 transition-colors">
        <Search size={16} className="text-white/40 mr-2 flex-shrink-0" />
        <input 
          autoFocus
          type="text" 
          placeholder="নোটের মধ্যে খুঁজুন..." 
          value={searchQuery}
          onChange={handleSearchChange}
          className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/20"
        />
        {searchState.results > 0 && (
          <span className="text-[10px] text-white/40 font-mono ml-2 whitespace-nowrap">
            {searchState.currentIndex} / {searchState.results}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handlePrev}
          disabled={searchState.results === 0}
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 active:scale-90 text-white/60 hover:bg-white/5 disabled:opacity-20 disabled:grayscale"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={handleNext}
          disabled={searchState.results === 0}
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 active:scale-90 text-white/60 hover:bg-white/5 disabled:opacity-20 disabled:grayscale"
        >
          <ChevronRight size={18} />
        </button>
        <div className="w-[1px] h-6 bg-white/10 mx-1 flex-shrink-0" />
        <button
          onClick={() => setIsSearchActive(false)}
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 active:scale-90 text-red-400 bg-red-500/10 hover:bg-red-500/20"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
