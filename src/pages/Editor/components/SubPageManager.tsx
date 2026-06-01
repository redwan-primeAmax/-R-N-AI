/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, ChevronRight, Plus } from 'lucide-react';
import { DataManager, Note } from '../../../services/storage/DataManager';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../utils/cn';

interface SubPageManagerProps {
  currentNote: Note;
  onClose: () => void;
  type: 'attach' | 'create';
}

export const SubPageManager: React.FC<SubPageManagerProps> = ({ currentNote, onClose, type }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAvailableNotes = useCallback(async () => {
    setLoading(true);
    const allNotes = await DataManager.getAllNotes();
    // Filter out current note, its child notes, and already sub-pages
    const alreadySubPages = allNotes.filter(n => n.parentId === currentNote.id).map(n => n.id);
    const filtered = allNotes.filter(n => 
      n.id !== currentNote.id && 
      !n.isTrashed && 
      !alreadySubPages.includes(n.id) &&
      n.workspaceId === currentNote.workspaceId
    );
    setAvailableNotes(filtered);
    setLoading(false);
  }, [currentNote.id, currentNote.workspaceId]);

  useEffect(() => {
    if (type === 'attach') loadAvailableNotes();
    if (type === 'create') handleCreate();
  }, [type, loadAvailableNotes]);

  const handleCreate = async () => {
    const allNotes = await DataManager.getAllNotes();
    const untitledCount = allNotes.filter(n => n.title.startsWith('শিরোনামহীন')).length;
    const title = untitledCount === 0 ? 'শিরোনামহীন' : `শিরোনামহীন ${untitledCount + 1}`;
    
    const newNote = await DataManager.createNote(currentNote.workspaceId || 'default', currentNote.id);
    await DataManager.saveNote({ ...newNote, title });
    navigate(`/editor/${newNote.id}`);
    onClose();
  };

  const handleAttach = async (noteToAttach: Note) => {
    await DataManager.saveNote({ ...noteToAttach, parentId: currentNote.id });
    onClose();
    window.location.reload(); // Refresh to show subpages
  };

  if (type === 'create') return null; // Handled by handleCreate

  const filtered = availableNotes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-[#181818] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-bottom border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight text-white/90">পেজ সংযুক্ত করুন</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="পেজ খুঁজুন..."
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-blue-500/50 transition-all font-medium"
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto px-4 pb-6 space-y-2 no-scrollbar">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.slice(0, 40).map(note => (
              <button
                key={note.id}
                onClick={() => handleAttach(note)}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all text-left group"
              >
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-500/10 transition-colors">
                  {note.emoji || '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white/80 truncate">{note.title || 'শিরোনামহীন'}</div>
                  <div className="text-[10px] text-white/20 uppercase font-black tracking-widest mt-0.5">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/10 group-hover:text-blue-500" />
              </button>
            ))
          ) : (
            <div className="py-20 text-center">
              <FileText size={48} className="mx-auto text-white/5 mb-4" />
              <p className="text-sm text-white/20 font-medium">কোথাও কোনো পেজ খুঁজে পাওয়া যায়নি</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
