/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  FileText, 
  Trash2, 
  Search,
  Clock,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { DataManager, Note } from '../../utils/DataManager';
import FloatingHomeButton from '../../components/FloatingHomeButton';

const ToolsHistory: React.FC = () => {
  const navigate = useNavigate();
  const [savedResults, setSavedResults] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSavedResults = async () => {
      setIsLoading(true);
      const allNotes = await DataManager.getAllNotes();
      const results = allNotes.filter(n => n.title.startsWith('[Tool]') || n.content.includes('<!-- TOOL_RESULT -->'));
      setSavedResults(results.sort((a, b) => b.updatedAt - a.updatedAt));
      setIsLoading(false);
    };
    loadSavedResults();
  }, []);

  const handleDelete = async (id: string) => {
    await DataManager.deleteNote(id);
    setSavedResults(prev => prev.filter(n => n.id !== id));
  };

  const filteredResults = savedResults.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tools')} className="p-2 text-white/40 hover:text-white transition-all">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">সরঞ্জামাগার ইতিহাস</h1>
        </div>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input 
            type="text"
            placeholder="ইতিহাস খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-white/20 transition-all"
          />
        </div>

        {/* Results List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
              <p className="text-white/20 text-sm">লোড হচ্ছে...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-20 text-white/20 italic">
              {searchQuery ? 'কোনো ফলাফল পাওয়া যায়নি' : 'কোনো ইতিহাস নেই'}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredResults.map((result) => (
                <motion.div
                  key={result.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 flex items-center gap-4 group hover:bg-[#222] transition-all"
                >
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                    <FileText size={24} />
                  </div>
                  <div className="flex-grow min-w-0" onClick={() => navigate(`/editor/${result.id}`)}>
                    <h3 className="font-bold text-white/90 truncate">
                      {result.title.replace('[Tool] ', '') || 'Untitled Result'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-white/30 uppercase tracking-widest font-bold">
                      <Clock size={10} />
                      {new Date(result.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate(`/editor/${result.id}`)}
                      className="p-2 text-white/20 hover:text-white transition-all"
                    >
                      <ExternalLink size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(result.id)}
                      className="p-2 text-white/20 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>

      <FloatingHomeButton />
    </div>
  );
};

export default ToolsHistory;
