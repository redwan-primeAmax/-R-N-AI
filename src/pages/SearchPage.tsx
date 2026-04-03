/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, ChevronRight } from 'lucide-react';
import { DataManager, Note } from '../utils/DataManager';
import { motion, AnimatePresence } from 'motion/react';

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
    <div className="max-w-2xl mx-auto px-6 pt-12 pb-24">
      <header className="mb-8">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
            <SearchIcon size={20} />
          </div>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, content, everything..."
            className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent focus:border-black/5 rounded-2xl outline-none text-lg font-medium placeholder:text-gray-300"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-black transition-colors"
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
              className="text-center py-20 text-gray-400"
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
                className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-black/10 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl">
                  {note.emoji}
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {note.title || 'Untitled'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                    {note.content.replace(/<[^>]*>/g, '') || 'No content'}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
