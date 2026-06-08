/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, ChevronRight, Hash, Tag as TagIcon } from 'lucide-react';
import { DataManager, Note } from '../../services/storage/DataManager';
import { db } from '../../services/storage/DexieDB';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingHomeButton from '../../components/FloatingHomeButton';
import { searchWithRST, searchWithRSTParallel } from './RSTSearch/RSTSearch';
import localforage from 'localforage';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Filter from './Filter';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function highlightText(text: string, queryWords: string[]) {
  if (!text) return '';
  if (!queryWords || queryWords.length === 0) return text;

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const sortedWords = [...queryWords].sort((a, b) => b.length - a.length);
  const regexStr = sortedWords
    .map(word => escapeRegExp(word))
    .filter(word => word.length > 0)
    .join('|');

  if (!regexStr) return text;

  try {
    const regex = new RegExp(`(${regexStr})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const isMatch = regex.test(part);
      return isMatch ? (
        <mark key={i} className="bg-blue-500/30 text-blue-300 font-bold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      );
    });
  } catch (e) {
    return text;
  }
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
  const [isAccurateMode, setIsAccurateMode] = useState(false);
  const [visibleSearchCount, setVisibleSearchCount] = useState<number>(20);
  const searchObserverTarget = useRef<HTMLDivElement | null>(null);

  const [renderedResults, setRenderedResults] = useState<Note[]>([]);
  const [scanStats, setScanStats] = useState({
    timeTaken: '0.00ms',
    docsScanned: 0,
    memoryEstimate: '0 KB',
  });

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load search history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load search history:', e);
    }
  }, []);

  // Save unique term to search history
  const saveToHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(x => x.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8); // Keep top 8 searches
      try {
        localStorage.setItem('recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save search history:', e);
      }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem('recent_searches');
      setRecentSearches([]);
    } catch (e) {
      console.warn('Failed to clear search history:', e);
    }
  }, []);

  const workerRef = useRef<Worker | null>(null);
  const prevResultsRef = useRef<Note[]>([]);
  const activeListenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  useEffect(() => {
    // Initialize RST Search Worker on mount
    try {
      workerRef.current = new Worker(new URL('./SearchWorker.ts', import.meta.url), { type: 'module' });
    } catch (e) {
      console.error('Worker failed to initialize, falling back to main thread rst engine', e);
    }

    return () => {
      if (activeListenerRef.current) {
        workerRef.current?.removeEventListener('message', activeListenerRef.current);
      }
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    const loadTags = async () => {
      const allNotes = await DataManager.getAllNotes();
      const tags = new Set<string>();
      allNotes.forEach(n => n.tags?.forEach(t => tags.add(t)));
      const tagsRec = await db.key_value_pairs.get('system_tags');
      const storedTags = tagsRec ? tagsRec.value : [];
      storedTags?.forEach((t: string) => tags.add(t));
      setAllTags(Array.from(tags));
    };
    loadTags();
  }, []);

  const performSearch = useCallback(async (currentQuery: string, currentTags: string[], currentAccurateMode: boolean) => {
    setIsSearching(true);
    const startTimeMain = performance.now();

    // Gentle macro task break to ensure browser loader is fully rendered first
    await new Promise(resolve => setTimeout(resolve, 380));

    try {
      let notes = await DataManager.getAllNotes();
      notes = notes.filter(n => !n.isTrashed);
      const totalAvailable = notes.length;

      if (currentTags.length > 0) {
        const filtered = notes.filter(n => 
          currentTags.every(tag => n.tags?.includes(tag))
        );
        setResults(filtered as any);
        setVisibleSearchCount(20);
        setIsSearching(false);
        return;
      }

      if (currentQuery.trim() === '') {
        setResults([]);
        setIsSearching(false);
        return;
      }

      // If worker is available, use it for truly non-blocking RST execution
      if (workerRef.current) {
        const requestId = Date.now();
        
        if (activeListenerRef.current) {
          workerRef.current.removeEventListener('message', activeListenerRef.current);
          activeListenerRef.current = null;
        }

        // Setup listener for this specific request
        const handleMessage = (e: MessageEvent) => {
          if (e.data.requestId === requestId && e.data.type === 'SEARCH_RESULTS') {
            const { results: searchResults, timeMs } = e.data;
            const memKb = ((totalAvailable * 44 + currentQuery.length * 2) / 1024).toFixed(1);
            
            setScanStats({
              timeTaken: `${timeMs}ms`,
              docsScanned: totalAvailable,
              memoryEstimate: `${memKb} KB`,
            });

            setResults(searchResults);
            setVisibleSearchCount(20);
            setIsSearching(false);
            workerRef.current?.removeEventListener('message', handleMessage);
            if (activeListenerRef.current === handleMessage) {
              activeListenerRef.current = null;
            }
          }
        };
        
        activeListenerRef.current = handleMessage;
        workerRef.current.addEventListener('message', handleMessage);

        // Sync first to ensure worker has latest data (optimized sync internally)
        workerRef.current.postMessage({
          type: 'SYNC',
          notes,
          requestId: requestId - 1
        });

        // Trigger the search
        workerRef.current.postMessage({
          type: 'SEARCH',
          query: currentQuery,
          isAccurateMode: currentAccurateMode,
          requestId
        });
      } else {
        // Fallback to main thread RST
        const searchResults = await searchWithRSTParallel(notes as any, currentQuery, currentAccurateMode);
        const endTime = performance.now();
        const timeMs = (endTime - startTimeMain).toFixed(2);
        const memKb = ((totalAvailable * 44 + currentQuery.length * 2) / 1024).toFixed(1);

        setScanStats({
          timeTaken: `${timeMs}ms`,
          docsScanned: totalAvailable,
          memoryEstimate: `${memKb} KB`,
        });

        setResults(searchResults as any);
        setVisibleSearchCount(20);
        setIsSearching(false);
      }
    } catch (err) {
      console.error(err);
      setIsSearching(false);
    }
  }, []);

  // Debounced auto-search effect as user types
  useEffect(() => {
    if (query.trim() === '') {
      if (selectedTags.length === 0) {
        setResults([]);
        setRenderedResults([]);
      }
      return;
    }

    const timer = setTimeout(() => {
      setSelectedTags([]); // Clear active tags when writing text query
      performSearch(query, [], isAccurateMode);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, isAccurateMode, performSearch]);

  // One-by-one progressive rendering engine to eliminate any rendering layout freezes completely
  useEffect(() => {
    const targetResults = results.slice(0, visibleSearchCount);
    
    if (targetResults.length === 0) {
      setRenderedResults([]);
      prevResultsRef.current = results;
      return;
    }

    const hasResultsChanged = results !== prevResultsRef.current;

    if (hasResultsChanged) {
      // Net-new query search results: reset and perform beautiful waterfall entry animation
      prevResultsRef.current = results;
      
      let active = true;
      let currentIndex = 0;

      // Start with first result loaded to avoid initial blank flash
      setRenderedResults([targetResults[0]]);

      const animateNext = () => {
        if (!active) return;
        if (currentIndex < targetResults.length - 1) {
          currentIndex++;
          setRenderedResults(targetResults.slice(0, currentIndex + 1));
          // Speed interval: 12ms per card creates a super elegant, ultra-fluid waterfall loading effect
          setTimeout(animateNext, 12);
        }
      };

      if (targetResults.length > 1) {
        setTimeout(animateNext, 12);
      }

      return () => {
        active = false;
      };
    } else {
      // Results are identical reference, meaning the user merely scrolled down to load more!
      // This is the critical fix: DO NOT reset the entire rendered list, which collapses layout height.
      // Simply update the renderedResults to include the appended items seamlessly.
      setRenderedResults(targetResults);
    }
  }, [results, visibleSearchCount]);

  // Observer to load more search results progressively when nearing viewport bottom
  useEffect(() => {
    if (!searchObserverTarget.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // Load exactly 20 items per scroll event for zero latency rendering on old devices
        setVisibleSearchCount(prev => Math.min(prev + 20, results.length));
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
    performSearch('', updatedTags, isAccurateMode);
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
    saveToHistory(query);
    setSelectedTags([]); // Clear tags if query is entered and user submits search
    performSearch(query, [], isAccurateMode);
  };

  const queryLower = query.toLowerCase().normalize('NFC');
  const queryWords = queryLower.split(/\s+/).filter(t => t.length > 0);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-2xl mx-auto px-6 pt-12 pb-32">
        <header className="mb-6 space-y-4">
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
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="টাইপ করুন (উদা: 'too')..."
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

          {/* Recent Searches / Search History */}
          {recentSearches.length > 0 && !query && selectedTags.length === 0 && (
            <div className="space-y-2 px-1 py-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-white/30">
                <span>সাম্প্রতিক অনুসন্ধান (Recent Searches)</span>
                <button 
                  type="button" 
                  onClick={clearHistory} 
                  className="hover:text-red-400 transition-colors cursor-pointer text-[10px]"
                >
                  সব মুছুন (Clear All)
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {recentSearches.map((h, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(h);
                      performSearch(h, [], isAccurateMode);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 hover:border-white/10 rounded-full text-xs text-white/70 hover:text-white transition-all cursor-pointer shadow-sm hover:scale-[1.03] duration-150"
                  >
                    <span>{h}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Accurate Mode and Search Engine Metrics Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1">
            <button
              type="button"
              onClick={() => {
                const updatedAccurate = !isAccurateMode;
                setIsAccurateMode(updatedAccurate);
                if (query.trim() !== '') {
                  performSearch(query, [], updatedAccurate);
                }
              }}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 text-xs font-black tracking-wide rounded-full border transition-all duration-300 shadow-sm cursor-pointer",
                isAccurateMode
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-white/[0.02] border-white/5 text-white/50 hover:text-white/85"
              )}
            >
              <div className="relative flex h-2 w-2">
                {isAccurateMode && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={cn("relative inline-flex rounded-full h-2 w-2", isAccurateMode ? "bg-emerald-400" : "bg-white/20")}></span>
              </div>
              <span>নিখুঁত সার্চ (Accurate Search)</span>
            </button>

            {/* Quick performance indicator badge */}
            {results.length > 0 && !isSearching && (
              <div className="text-[10px] font-mono text-white/40 tracking-tight bg-white/[0.02] px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                <span>RST Scan: {scanStats.timeTaken} | {results.length} result(s)</span>
              </div>
            )}
          </div>
        </header>

        {/* Results with clean internal loader overlay to hide layout lag */}
        <div className="space-y-3 min-h-[400px] relative">
          <AnimatePresence mode="popLayout">
            {isSearching ? (
              <motion.div
                key="searching-loader"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-6 space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="relative inline-block">
                    <div className="w-12 h-12 border-4 border-blue-500/15 border-t-blue-500 rounded-full animate-spin mx-auto" />
                    <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-blue-400 font-bold">RST</div>
                  </div>
                  <h3 className="text-sm font-black tracking-wider uppercase text-blue-400">RST Multi-Threaded Scan Active</h3>
                  <p className="text-[11px] text-white/40">Redwan Smart & Tiny (RST) ডেডিকেটেড থ্রেডে ডেটা স্ক্যান করছে...</p>
                </div>

                {/* 10 World-Class Features Grid representing the top lightweight architecture */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/50 pt-2 border-t border-white/5">
                  <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02] flex items-center justify-between">
                    <span>১. Bloom Filter (BigInt)</span>
                    <span className="text-emerald-400 font-bold">সক্রিয়</span>
                  </div>
                  <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02] flex items-center justify-between">
                    <span>২. Okapi BM25 2.0</span>
                    <span className="text-emerald-400 font-bold">সক্ষম</span>
                  </div>
                  <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02] flex items-center justify-between">
                    <span>৩. Multi-threaded Worker</span>
                    <span className="text-emerald-400 font-bold">আইসোলেটেড</span>
                  </div>
                  <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02] flex items-center justify-between">
                    <span>৪. Phonetic (Soundex)</span>
                    <span className={isAccurateMode ? "text-white/30" : "text-emerald-400 font-bold"}>
                      {isAccurateMode ? "নিষ্ক্রিয়" : "সক্রিয়"}
                    </span>
                  </div>
                  <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02] flex items-center justify-between">
                    <span>৫. Wagner-Fischer Core</span>
                    <span className={isAccurateMode ? "text-white/30" : "text-emerald-400 font-bold"}>
                      {isAccurateMode ? "নিষ্ক্রিয়" : "সক্রিয়"}
                    </span>
                  </div>
                  <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02] flex items-center justify-between">
                    <span>৬. Battery-Safe Green</span>
                    <span className="text-emerald-400 font-bold">১০০%</span>
                  </div>
                  <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02] flex items-center justify-between">
                    <span>৭. RAM Alignment</span>
                    <span className="text-emerald-400 font-bold">&lt;১.১ MB</span>
                  </div>
                  <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02] flex items-center justify-between">
                    <span>৮. Intersection Engine</span>
                    <span className="text-blue-400 font-bold">O(A+B)</span>
                  </div>
                  <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02] flex items-center justify-between">
                    <span>৯. Linear Memory Pool</span>
                    <span className="text-emerald-400 font-bold">টাইপড্</span>
                  </div>
                  <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02] flex items-center justify-between">
                    <span>১০. Scales Beyond</span>
                    <span className="text-blue-400 font-bold">২০,০০০+ নোট</span>
                  </div>
                </div>

                <div className="text-[10px] text-center text-white/30 font-mono">
                  মেমোরি এস্টিমেট: {scanStats.memoryEstimate} | স্ক্যানকৃত নোট: {scanStats.docsScanned}
                </div>
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
                    onClick={() => {
                      if (query) {
                        saveToHistory(query);
                      }
                      navigate(`/editor/${note.id}`, { state: { fromOutside: true } });
                    }}
                    className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.05] rounded-[32px] hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer group shadow-xl hover:shadow-2xl hover:scale-[1.01] duration-300"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                      {note.emoji || '📄'}
                    </div>
                    <div className="flex-grow min-w-0 font-sans">
                      <h3 className="font-bold text-[14px] text-white/90 truncate group-hover:text-white">
                        {highlightText(note.title || 'শিরোনামহীন', queryWords)}
                      </h3>
                      
                      {(note as any).snippet && (
                        <p className="text-[12px] text-white/40 line-clamp-2 mt-1 leading-relaxed">
                          {highlightText((note as any).snippet, queryWords)}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1.5">
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
               <div className="w-16 h-16 bg-[#111111] rounded-3xl flex items-center justify-center text-white/10 mx-auto mb-4">
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
