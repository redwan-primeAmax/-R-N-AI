/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, X, CornerDownRight, SquareArrowOutUpRight } from 'lucide-react';
import { DataManager, Note } from '../../../services/storage/DataManager';
import { cn } from '../../../utils/cn';

interface LinkPageListProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (note: Note) => void;
  workspaceId: string;
}

export const LinkPageList: React.FC<LinkPageListProps> = ({ isOpen, onClose, onSelect, workspaceId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNotes();
    }
  }, [isOpen]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const all = await DataManager.getAllNotes();
      // Filters for notes in the same workspace or just all accessible
      setNotes(all.filter(n => !n.isTrashed));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = notes.filter(n => (n.title || 'শিরোনামহীন').toLowerCase().includes(search.toLowerCase()));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md bg-[#181818] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[70vh]"
          >
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-black italic tracking-tight text-white uppercase">Link to Page</h3>
                 <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40">
                    <X size={20} />
                 </button>
               </div>
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                 <input 
                  autoFocus
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="সার্চ করুন..."
                  className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-blue-500/50 outline-none text-white placeholder:text-white/10"
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loading ? (
                <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px] animate-pulse">লোড হচ্ছে...</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">কোনো পেজ পাওয়া যায়নি</div>
              ) : (
                <div className="space-y-1.5">
                  {filtered.map(note => (
                    <button
                      key={note.id}
                      onClick={() => onSelect(note)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all active:scale-[0.98] text-left group"
                    >
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-all">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-white group-hover:text-blue-500 transition-colors truncate">
                          {note.title || 'শিরোনামহীন'}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-tighter text-white/20 truncate">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <SquareArrowOutUpRight size={16} className="text-white/5 group-hover:text-white/40 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
