/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, ChevronRight } from 'lucide-react';
import { DataManager, Note } from '../utils/DataManager';
import { motion, AnimatePresence } from 'motion/react';
import FloatingHomeButton from '../components/FloatingHomeButton';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const performSearch = async () => {
      if (query.trim() === '') {
        setResults([]);
        return;
      }
      const searchResults = await DataManager.searchNotes(query);
      setResults(searchResults);
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="min-h-screen bg-[#191919] text-white">
      <div className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        <header className="mb-8">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/40 group-focus-within:text-white transition-colors">
              <SearchIcon size={20} />
            </div>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, content, everything..."
              className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 focus:border-white/20 rounded-2xl outline-none text-lg font-medium placeholder:text-white/20 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-4 flex items-center text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </header>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {query && results.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 text-white/20"
              >
                No results found for "{query}"
              </motion.div>
            ) : (
              results.map((note) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  onClick={() => navigate(`/editor/${note.id}`)}
                  className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {note.emoji}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-bold text-white/90 truncate">
                      {note.title || 'Untitled'}
                    </h3>
                    <p className="text-xs text-white/40 mt-1 line-clamp-1">
                      {note.content.replace(/<[^>]*>/g, '') || 'No content'}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-white/20 group-hover:text-white/60 transition-colors" />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
      <FloatingHomeButton />
    </div>
  );
}
