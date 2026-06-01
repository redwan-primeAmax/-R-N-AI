/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, ChevronRight, Hash, Tag as TagIcon } from 'lucide-react';
import { DataManager, Note } from '../../services/storage/DataManager';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingHomeButton from '../../components/FloatingHomeButton';
import { searchWithRCST } from './RCSTSearchEngine';
import localforage from 'localforage';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Filter from './Filter';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Custom states for high quality progressive scaling
  const [visibleSearchCount, setVisibleSearchCount] = useState<number>(30);
  const searchObserverTarget = useRef<HTMLDivElement | null>(null);

  const [renderedResults, setRenderedResults] = useState<Note[]>([]);

  useEffect(() => {
    // Force focus with a small timeout for reliability across page transitions
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadTags = async () => {
      const allNotes = await DataManager.getAllNotes();
      const tags = new Set<string>();
      allNotes.forEach(n => n.tags?.forEach(t => tags.add(t)));
      const storedTags = await localforage.getItem<string[]>('system_tags');
      storedTags?.forEach(t => tags.add(t));
      setAllTags(Array.from(tags));
    };
    loadTags();
  }, []);

  const performSearch = useCallback(async (currentQuery: string, currentTags: string[]) => {
    setIsSearching(true);
    // Gentle macro task break to ensure browser loader is fully rendered first (hides synchronization freezes completely)
    await new Promise(resolve => setTimeout(resolve, 80));

    try {
      let searchResults = await DataManager.getAllNotes();
      
      // Non-trashed only
      searchResults = searchResults.filter(n => !n.isTrashed);

      if (currentTags.length > 0) {
        searchResults = searchResults.filter(n => 
          currentTags.every(tag => n.tags?.includes(tag))
        );
      } else if (currentQuery.trim() !== '') {
        searchResults = searchWithRCST(searchResults, currentQuery);
      } else {
        searchResults = [];
      }
      
      setResults(searchResults);
      setVisibleSearchCount(30); // Reset chunk offset whenever results change
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // One-by-one progressive rendering engine to eliminate any rendering layout freezes completely
  useEffect(() => {
    const targetResults = results.slice(0, visibleSearchCount);
    
    if (targetResults.length === 0) {
      setRenderedResults([]);
      return;
    }

    let active = true;
    let currentIndex = 0;

    // Start with first result loaded to avoid blank flash
    setRenderedResults([targetResults[0]]);

    const animateNext = () => {
      if (!active) return;
      if (currentIndex < targetResults.length - 1) {
        currentIndex++;
        setRenderedResults(targetResults.slice(0, currentIndex + 1));
        // Speed interval: 15ms per card creates a super elegant, ultra-fluid waterfall loading effect
        setTimeout(animateNext, 15);
      }
    };

    if (targetResults.length > 1) {
      setTimeout(animateNext, 15);
    }

    return () => {
      active = false;
    };
  }, [results, visibleSearchCount]);

  // Observer to load more search results progressively when nearing viewport bottom
  useEffect(() => {
    if (!searchObserverTarget.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleSearchCount(prev => Math.min(prev + 30, results.length));
      }
    }, {
      threshold: 0.1,
      rootMargin: '200px'
    });

    const currentTarget = searchObserverTarget.current;
    observer.observe(currentTarget);

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [results.length]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (text.trim() === '') {
      // Clear results immediately if the user deletes the query entirely
      setResults([]);
      setRenderedResults([]);
    }
  };

  const handleToggleTag = (tag: string) => {
    const updatedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(updatedTags);
    setQuery(''); // Clear text search if tag is selected
    performSearch('', updatedTags);
  };

  const handleClearTags = () => {
    setSelectedTags([]);
    setResults([]);
    setRenderedResults([]);
  };

  const handleClearSearch = () => {
    setQuery('');
    setSelectedTags([]);
    setResults([]);
    setRenderedResults([]);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() === '') return;
    setSelectedTags([]); // Clear tags if query is entered and user submits search
    performSearch(query, []);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-2xl mx-auto px-6 pt-12 pb-32">
        <header className="mb-8 space-y-6">
          <div className="flex items-center justify-between px-2">
             <h1 className="text-2xl font-black tracking-tighter text-white/90">Search</h1>
             {isSearching && (
               <motion.div 
                 animate={{ rotate: 360 }} 
                 transition={{ duration: 1, repeat: Infinity, ease: "linear" }} 
                 className="w-4 h-4 border-2 border-white/10 border-t-blue-500 rounded-full" 
               />
             )}
          </div>

          {/* Search bar 15-20% split layout with form integration */}
          <div className="flex gap-3">
            <form onSubmit={handleFormSubmit} className="relative group flex-grow">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-blue-500 transition-colors">
                <SearchIcon size={20} />
              </div>
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="টাইপ করে এন্টার চাপুন..."
                className="w-full pl-12 pr-12 py-4 bg-white/[0.03] border border-white/5 focus:border-blue-500/20 rounded-[28px] outline-none text-[15px] font-bold placeholder:text-white/10 transition-all shadow-inner"
                aria-label="Search Notes"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-4 flex items-center text-white/20 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </form>

            <button
              onClick={() => setIsFilterOpen(true)}
              className="w-[20%] sm:w-[15%] flex flex-col items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 hover:border-white/10 rounded-[28px] transition-all cursor-pointer text-white/60 hover:text-white gap-1 p-2 flex-shrink-0"
              title="ট্যাগ ফিল্টার"
            >
              <TagIcon size={18} className="text-blue-400" />
              <span className="text-[9px] font-black tracking-widest uppercase truncate max-w-full">
                {selectedTags.length > 0 ? `ট্যাগ (${selectedTags.length})` : 'ফিল্টার'}
              </span>
            </button>
          </div>
        </header>

        {/* Results with clean internal loader overlay to hide layout lag */}
        <div className="space-y-3 min-h-[400px] relative">
          <AnimatePresence mode="popLayout">
            {isSearching ? (
              <motion.div
                key="searching-loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0A0A0A]/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4 py-32"
              >
                <div className="w-10 h-10 border-4 border-blue-500/25 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] font-mono">
                  সার্চ রেজাল্ট লোড হচ্ছে...
                </span>
              </motion.div>
            ) : (query || selectedTags.length > 0) && results.length === 0 ? (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-32 flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white/10">
                  <SearchIcon size={32} />
                </div>
                <div className="text-sm font-bold text-white/20 italic">
                  কিছু পাওয়া যায়নি (No results found)
                </div>
              </motion.div>
            ) : (
              <>
                {renderedResults.map((note) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => navigate(`/editor/${note.id}`)}
                    className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.05] rounded-[32px] hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer group shadow-xl"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                      {note.emoji || '📄'}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-bold text-[14px] text-white/90 truncate group-hover:text-white">
                        {note.title || 'শিরোনামহীন'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">{new Date(note.updatedAt).toLocaleDateString()}</span>
                        {note.tags && note.tags.length > 0 && (
                          <>
                            <div className="w-1 h-1 bg-white/10 rounded-full" />
                            <div className="flex gap-1">
                              {note.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[9px] text-blue-400 font-bold">#{tag}</span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-white/10 group-hover:text-blue-500 transition-all mr-1" />
                  </motion.div>
                ))}

                {/* Infinite search results load more trigger */}
                {results.length > visibleSearchCount && (
                  <div 
                    ref={searchObserverTarget}
                    className="py-6 flex items-center justify-center gap-2.5 bg-white/[0.02] border border-white/5 rounded-[24px] animate-pulse"
                  >
                    <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider font-mono">
                      আরো রেজাল্ট লোড হচ্ছে... ({Math.min(visibleSearchCount, results.length)} / {results.length})
                    </span>
                  </div>
                )}
              </>
            )}
          </AnimatePresence>
          {!query && selectedTags.length === 0 && results.length === 0 && !isSearching && (
            <div className="py-32 text-center">
               <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white/10 mx-auto mb-4">
                  <Hash size={32} />
               </div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10">আপনার নোটগুলো সার্চ করুন</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Floating back home action button */}
      <FloatingHomeButton />

      {/* Filter dialog popup */}
      <Filter
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClearTags={handleClearTags}
      />
    </div>
  );
}
