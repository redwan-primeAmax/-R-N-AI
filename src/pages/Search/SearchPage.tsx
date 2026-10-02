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
import { PageIcon } from '../../components/PageIcon';
import { searchWithRSTParallel } from './RSTSearch/RSTSearch';
import Filter from './Filter';
import { cn } from '../../utils/cn';

function highlightText(text: string, queryWords: string[]) {
  if (!text) return '';
  if (!queryWords || queryWords.length === 0) return text;
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sortedWords = [...queryWords].sort((a, b) => b.length - a.length);
  const regexStr = sortedWords.map(word => escapeRegExp(word)).filter(word => word.length > 0).join('|');
  if (!regexStr) return text;
  try {
    const regex = new RegExp(`(${regexStr})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const isMatch = regex.test(part);
      return isMatch ? <mark key={i} className="bg-blue-500/30 text-blue-300 font-bold px-0.5 rounded">{part}</mark> : part;
    });
  } catch (e) { return text; }
}

export default function SearchPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchObserverTarget = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerSyncedRef = useRef(false);
  const latestRequestIdRef = useRef<number>(0);
  const activeListenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  // States
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAccurateMode, setIsAccurateMode] = useState(false);
  const [visibleSearchCount, setVisibleSearchCount] = useState<number>(20);
  const [renderedResults, setRenderedResults] = useState<Note[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [scanStats, setScanStats] = useState({ timeTaken: '0.00ms', docsScanned: 0, memoryEstimate: '0 KB' });

  // 1. Initial Load
  useEffect(() => {
    const stored = localStorage.getItem('recent_searches');
    if (stored) setRecentSearches(JSON.parse(stored));
    
    workerRef.current = new Worker(new URL('./SearchWorker.ts', import.meta.url), { type: 'module' });
    
    const loadTags = async () => {
      const allNotes = await DataManager.getAllNotes();
      const tags = new Set<string>();
      allNotes.forEach(n => n.tags?.forEach(t => tags.add(t)));
      const tagsRec = await db.key_value_pairs.get('system_tags');
      if (tagsRec?.value) tagsRec.value.forEach((t: string) => tags.add(t));
      setAllTags(Array.from(tags));
    };
    loadTags();

    return () => {
      if (activeListenerRef.current) workerRef.current?.removeEventListener('message', activeListenerRef.current);
      workerRef.current?.terminate();
    };
  }, []);

  // 2. Search Engine Logic
  const performSearch = useCallback(async (currentQuery: string, currentTags: string[], currentAccurateMode: boolean) => {
    if (currentQuery.trim() === '' && currentTags.length === 0) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const startTime = performance.now();

    try {
      let notes = await DataManager.getAllNotes(false);
      notes = notes.filter(n => !n.isTrashed && !n.isLocked);
      const totalAvailable = notes.length;

      if (currentTags.length > 0) {
        const filtered = notes.filter(n => currentTags.every(tag => n.tags?.includes(tag)));
        setResults(filtered as any);
        setVisibleSearchCount(20);
        setIsSearching(false);
        return;
      }

      const requestId = Date.now();
      latestRequestIdRef.current = requestId;

      if (workerRef.current) {
        if (!workerSyncedRef.current) {
          workerRef.current.postMessage({ type: 'SYNC', notes, requestId: requestId - 1 });
          workerSyncedRef.current = true;
        }

        if (activeListenerRef.current) workerRef.current.removeEventListener('message', activeListenerRef.current);

        const handleMessage = (e: MessageEvent) => {
          if (e.data.requestId === latestRequestIdRef.current && e.data.type === 'SEARCH_RESULTS') {
            const { results: searchResults, timeMs } = e.data;
            const memKb = ((totalAvailable * 44 + currentQuery.length * 2) / 1024).toFixed(1);
            setScanStats({ timeTaken: `${timeMs}ms`, docsScanned: totalAvailable, memoryEstimate: `${memKb} KB` });
            setResults(searchResults);
            setVisibleSearchCount(20);
            setIsSearching(false);
          }
        };
        activeListenerRef.current = handleMessage;
        workerRef.current.addEventListener('message', handleMessage);
        workerRef.current.postMessage({ type: 'SEARCH', query: currentQuery, isAccurateMode: currentAccurateMode, requestId });
      } else {
        const searchResults = await searchWithRSTParallel(notes as any, currentQuery, currentAccurateMode);
        const timeMs = (performance.now() - startTime).toFixed(2);
        const memKb = ((totalAvailable * 44 + currentQuery.length * 2) / 1024).toFixed(1);
        setScanStats({ timeTaken: `${timeMs}ms`, docsScanned: totalAvailable, memoryEstimate: `${memKb} KB` });
        setResults(searchResults as any);
        setVisibleSearchCount(20);
        setIsSearching(false);
      }
    } catch (err) {
      console.error(err);
      setIsSearching(false);
    }
  }, []);

  // 3. Effects for Querying
  useEffect(() => {
    if (!query.trim()) {
      if (selectedTags.length === 0) {
        setResults([]);
        setRenderedResults([]);
      }
      return;
    }
    const timer = setTimeout(() => {
      setSelectedTags([]); 
      performSearch(query, [], isAccurateMode);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, isAccurateMode, performSearch]);

  // 4. Progressive Rendering
  useEffect(() => {
    const targetResults = results.slice(0, visibleSearchCount);
    if (targetResults.length === 0) {
      setRenderedResults([]);
      return;
    }
    setRenderedResults(targetResults);
  }, [results, visibleSearchCount]);

  // 5. Handlers
  const handleToggleTag = (tag: string) => {
    const updatedTags = selectedTags.includes(tag) ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag];
    setSelectedTags(updatedTags);
    setQuery('');
    performSearch('', updatedTags, isAccurateMode);
  };

  const handleClearTags = () => { setSelectedTags([]); setResults([]); setRenderedResults([]); };
  const handleClearSearch = () => { setQuery(''); setSelectedTags([]); setResults([]); setRenderedResults([]); };

  const saveToHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(x => x.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      localStorage.setItem('recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-white">
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-36">
        <header className="mb-6 space-y-4">
          <div className="flex items-center justify-between px-2">
             <h1 className="text-2xl font-black tracking-tighter text-white/90">Search</h1>
             {isSearching && (
               <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/10 border-t-blue-500 rounded-full" />
             )}
          </div>

          <div className="flex gap-3">
            <div className="relative group flex-grow">
              <button
                onClick={() => setIsAccurateMode(!isAccurateMode)}
                title={isAccurateMode ? "Accurate Search ON (Word Prefix Match)" : "Fuzzy Search (Default)"}
                className={cn(
                  "absolute inset-y-0 left-3 my-auto h-9 w-9 rounded-full flex items-center justify-center transition-all z-10 active:scale-90",
                  isAccurateMode ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/30" : "text-neutral-400 hover:text-white bg-white/5"
                )}
              >
                <SearchIcon size={18} />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isAccurateMode ? "Accurate Search ON" : "Type..."}
                className={cn(
                  "w-full pl-14 pr-12 py-4 bg-white/[0.03] border border-white/5 rounded-[28px] outline-none text-[15px] font-bold transition-all",
                  isAccurateMode ? "focus:border-emerald-500/30 placeholder:text-emerald-500/50" : "focus:border-blue-500/20 placeholder:text-white/20"
                )}
              />
              {query && (
                <button onClick={handleClearSearch} className="absolute inset-y-0 right-4 flex items-center text-white/20 hover:text-white"><X size={20} /></button>
              )}
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsFilterOpen(true);
              }}
              className="w-[20%] sm:w-[15%] flex flex-col items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 rounded-[28px] transition-all cursor-pointer text-white/60 hover:text-white gap-1 p-2 flex-shrink-0"
            >
              <TagIcon size={18} className="text-blue-400" />
              <span className="text-[9px] font-black tracking-widest uppercase truncate max-w-full">
                {selectedTags.length > 0 ? `ট্যাগ (${selectedTags.length})` : 'ফিল্টার'}
              </span>
            </button>
          </div>
        </header>

        <div className="space-y-3 min-h-[400px]">
          {renderedResults.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                if (query) saveToHistory(query);
                navigate(`/editor/${note.id}`);
              }}
              className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.05] rounded-[32px] hover:bg-white/5 transition-all cursor-pointer group shadow-xl"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-3xl"><PageIcon emoji={note.emoji} className="text-3xl" fallback="📄" /></div>
              <div className="flex-grow min-w-0 font-sans">
                <h3 className="font-bold text-[14px] text-white/90 truncate">{highlightText(note.title || 'শিরোনামহীন', query.split(' '))}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  {note.tags && note.tags.length > 0 && <span className="text-[9px] text-blue-400 font-bold">#{note.tags[0]}</span>}
                </div>
              </div>
              <ChevronRight size={18} className="text-white/10 group-hover:text-blue-500 mr-1" />
            </motion.div>
          ))}

          {!query && selectedTags.length === 0 && results.length === 0 && !isSearching && (
            <div className="py-32 text-center">
               <div className="w-16 h-16 bg-[#111111] rounded-3xl flex items-center justify-center text-white/10 mx-auto mb-4"><Hash size={32} /></div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10">Search your notes</p>
            </div>
          )}
        </div>
      </div>
      
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
