/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search as SearchIcon, X, ChevronRight, Hash, Tag as TagIcon } from 'lucide-react';
import { DataManager, Note } from '../../services/storage/DataManager';
import { db } from '../../services/storage/DexieDB';
import { m as motion, AnimatePresence } from 'framer-motion';
import { PageIcon } from '../../components/PageIcon';
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
      const isMatch = i % 2 === 1;
      return isMatch ? <mark key={i} className="bg-blue-500/30 text-blue-300 font-bold px-0.5 rounded">{part}</mark> : part;
    });
  } catch (e) { return text; }
}

export default function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { query?: string; isAccurateMode?: boolean } | null;
  const initialQuery = locationState?.query || '';
  const initialAccurate = locationState?.isAccurateMode ?? false;

  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerDatasetRef = useRef<Note[] | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const activeListenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  // States
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAccurateMode, setIsAccurateMode] = useState(initialAccurate);
  const [visibleSearchCount, setVisibleSearchCount] = useState<number>(20);
  const [renderedResults, setRenderedResults] = useState<Note[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [scanStats, setScanStats] = useState({ timeTaken: '0.00ms', docsScanned: 0, memoryEstimate: '0 KB' });

  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('recent_searches') || '[]');
      if (Array.isArray(stored)) setRecentSearches(stored.filter(x => typeof x === 'string').slice(0, 8));
    } catch { /* Corrupt optional history must not crash search. */ }
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('./SearchWorker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onerror = () => {
        worker?.terminate();
        workerRef.current = null;
        workerDatasetRef.current = null;
        latestRequestIdRef.current++;
        setDataVersion(value => value + 1);
      };
    } catch { /* The lazy main-thread fallback also works without Web Workers. */ }
    let timer: ReturnType<typeof setTimeout>;
    const invalidate = () => {
      latestRequestIdRef.current++;
      workerDatasetRef.current = null;
      clearTimeout(timer);
      timer = setTimeout(() => setDataVersion(value => value + 1), 50);
    };
    window.addEventListener('workspace-notes-changed', invalidate);
    return () => {
      latestRequestIdRef.current++;
      clearTimeout(timer);
      window.removeEventListener('workspace-notes-changed', invalidate);
      worker?.terminate();
      workerRef.current = null;
      workerDatasetRef.current = null;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    void Promise.all([DataManager.getAllNotes(), db.key_value_pairs.get('system_tags')]).then(([notes, record]) => {
      if (disposed) return;
      const tags = new Set<string>();
      notes.filter(n => !n.isTrashed && !n.isLocked).forEach(n => n.tags?.forEach(t => tags.add(t)));
      if (Array.isArray(record?.value)) record.value.forEach(t => { if (typeof t === 'string') tags.add(t); });
      setAllTags([...tags]);
    }).catch(console.error);
    return () => { disposed = true; };
  }, [dataVersion]);

  const performSearch = useCallback(async (currentQuery: string, currentTags: string[], accurate: boolean) => {
    const requestId = ++latestRequestIdRef.current;
    if (!currentQuery.trim() && currentTags.length === 0) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const startTime = performance.now();
    try {
      const dataset = await DataManager.getAllNotes();
      if (requestId !== latestRequestIdRef.current) return;
      const notes = dataset.filter(n => !n.isTrashed && !n.isLocked);
      const finish = (results: Note[], timeMs: string) => {
        if (requestId !== latestRequestIdRef.current) return;
        setScanStats({ timeTaken: `${timeMs}ms`, docsScanned: notes.length, memoryEstimate: `${((notes.length * 44 + currentQuery.length * 2) / 1024).toFixed(1)} KB` });
        setResults(results);
        setVisibleSearchCount(20);
        setIsSearching(false);
      };
      if (currentTags.length) {
        finish(notes.filter(n => currentTags.every(tag => n.tags?.includes(tag))), (performance.now() - startTime).toFixed(2));
        return;
      }
      const fallback = async () => {
        const { searchWithRST } = await import('./RSTSearch/RSTSearch');
        if (requestId !== latestRequestIdRef.current) return;
        finish(searchWithRST(notes, currentQuery, accurate) as Note[], (performance.now() - startTime).toFixed(2));
      };
      const worker = workerRef.current;
      if (!worker) { await fallback(); return; }
      if (activeListenerRef.current) worker.removeEventListener('message', activeListenerRef.current);
      const listener = (e: MessageEvent) => {
        if (e.data.requestId !== requestId || requestId !== latestRequestIdRef.current) return;
        if (e.data.type === 'SEARCH_RESULTS') finish(e.data.results, e.data.timeMs);
        else if (e.data.type === 'ERROR') {
          worker.terminate();
          workerRef.current = null;
          workerDatasetRef.current = null;
          void fallback().catch(() => { if (requestId === latestRequestIdRef.current) setIsSearching(false); });
        }
      };
      activeListenerRef.current = listener;
      worker.addEventListener('message', listener);
      if (workerDatasetRef.current !== dataset) {
        worker.postMessage({ type: 'SYNC', notes, requestId });
        workerDatasetRef.current = dataset;
      }
      worker.postMessage({ type: 'SEARCH', query: currentQuery, isAccurateMode: accurate, requestId });
    } catch (error) {
      console.error(error);
      if (requestId === latestRequestIdRef.current) setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    ++latestRequestIdRef.current; // Invalidate now, not after the debounce window.
    if (!query.trim() && selectedTags.length === 0) {
      setResults([]);
      setRenderedResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => { void performSearch(query, selectedTags, isAccurateMode); }, query.trim() ? 250 : 0);
    return () => { clearTimeout(timer); ++latestRequestIdRef.current; };
  }, [query, selectedTags, isAccurateMode, dataVersion, performSearch]);

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
                onChange={(e) => { setSelectedTags([]); setQuery(e.target.value); }}
                aria-label="Search notes"
                placeholder={isAccurateMode ? "Accurate Search ON" : "Type..."}
                className={cn(
                  "w-full pl-14 pr-12 py-4 bg-white/[0.03] border border-white/5 rounded-[28px] outline-none text-[15px] font-bold transition-all",
                  isAccurateMode ? "focus:border-emerald-500/30 placeholder:text-emerald-500/50" : "focus:border-blue-500/20 placeholder:text-white/20"
                )}
              />
              {query && (
                <button aria-label="Clear search" onClick={handleClearSearch} className="absolute inset-y-0 right-4 flex items-center text-white/20 hover:text-white"><X size={20} /></button>
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
                  <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  {note.tags && note.tags.length > 0 && <span className="text-[9px] text-blue-400 font-bold">#{note.tags[0]}</span>}
                </div>
              </div>
              <ChevronRight size={18} className="text-white/10 group-hover:text-blue-500 mr-1" />
            </motion.div>
          ))}

          {results.length > visibleSearchCount && (
            <button onClick={() => setVisibleSearchCount(count => count + 20)} className="w-full py-3 rounded-xl bg-white/5 text-white/80">
              Load more results ({results.length - visibleSearchCount})
            </button>
          )}
          {(query || selectedTags.length > 0) && results.length === 0 && !isSearching && <p role="status" className="text-center py-8 text-white/60">No matching notes</p>}

          {!query && selectedTags.length === 0 && results.length === 0 && !isSearching && (
            <div className="py-32 text-center">
               <div className="w-16 h-16 bg-[#111111] rounded-3xl flex items-center justify-center text-white/10 mx-auto mb-4"><Hash size={32} /></div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Search your notes</p>
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
