/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, ChevronRight, Plus } from 'lucide-react';
import { DataManager, Note } from '../../../services/storage/DataManager';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../utils/cn';

interface SubPageManagerProps {
  currentNote: Note;
  onClose: () => void;
  type: 'attach' | 'create';
  editor?: any;
}

export const SubPageManager: React.FC<SubPageManagerProps> = ({ currentNote, onClose, type, editor }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const hasCreatedActive = useRef(false);

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
    if (hasCreatedActive.current) return;
    hasCreatedActive.current = true;

    const newNote = await DataManager.createNote(currentNote.workspaceId || 'default', currentNote.id);
    
    if (editor && editor.setBlocks) {
      const activeId = document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id') || editor.activeBlockId;
      const newBlock = {
        id: crypto.randomUUID(),
        type: 'page_link' as any,
        content: newNote.title || 'Untitled Page',
        subPageId: newNote.id
      };
      
      editor.setBlocks((prev: any[]) => {
        const idx = prev.findIndex(b => b.id === activeId);
        if (idx > -1) {
          const res = [...prev];
          res.splice(idx + 1, 0, newBlock);
          return res;
        }
        return [...prev, newBlock];
      });

      // Navigate immediately as requested!
      setTimeout(() => {
        navigate(`/editor/${newNote.id}`, { state: { fromParent: true } });
      }, 100);
    } else {
      navigate(`/editor/${newNote.id}`, { state: { fromParent: true } });
    }
    
    onClose();
  };

  const handleAttach = async (noteToAttach: Note) => {
    await DataManager.saveNote({ ...noteToAttach, parentId: currentNote.id });
    
    if (editor && editor.setBlocks) {
      const activeId = document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id') || editor.activeBlockId;
      const newBlock = {
        id: crypto.randomUUID(),
        type: 'page_link' as any,
        content: noteToAttach.title || 'Untitled Page',
        subPageId: noteToAttach.id
      };
      editor.setBlocks((prev: any[]) => {
        const idx = prev.findIndex(b => b.id === activeId);
        if (idx > -1) {
          const res = [...prev];
          res.splice(idx + 1, 0, newBlock);
          return res;
        }
        return [...prev, newBlock];
      });
    } else {
      window.location.reload(); // Fallback reload
    }
    
    onClose();
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
        className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 30 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        className="relative w-full max-w-lg bg-[#111111] border border-white/5 rounded-[40px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
      >
        <div className="p-8 border-b border-white/[0.03] flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                <Plus size={22} />
             </div>
             <div>
                <h2 className="text-xl font-black tracking-tight text-white/95">পেজ সংযুক্ত করুন</h2>
                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">Connect existing workspace pages</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 pb-4">
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-blue-500 transition-colors">
               <Search size={20} />
            </div>
            <input 
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="সার্চ করে পেজটি খুঁজুন..."
              className="w-full bg-white/[0.02] border border-white/[0.05] focus:border-blue-500/30 rounded-[2rem] py-5 pl-14 pr-6 text-sm focus:bg-white/[0.04] transition-all font-bold placeholder:text-white/5"
            />
          </div>
        </div>

        <div className="max-h-[450px] overflow-y-auto px-6 pb-10 space-y-2 no-scrollbar">
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">নোটগুলো খোঁজা হচ্ছে...</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-1">
              {filtered.slice(0, 40).map(note => (
                <button
                  key={note.id}
                  onClick={() => handleAttach(note)}
                  className="w-full flex items-center gap-5 p-5 bg-transparent hover:bg-white/[0.03] border border-transparent hover:border-white/5 rounded-3xl transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-white/[0.03] group-hover:bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl transition-all shadow-inner">
                    {note.emoji || '📄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-white/80 group-hover:text-white transition-colors truncate">{note.title || 'শিরোনামহীন'}</div>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[9px] text-white/20 uppercase font-black tracking-widest bg-white/5 px-2 py-0.5 rounded-md">Updated</span>
                       <span className="text-[9px] text-white/30 font-bold">{new Date(note.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-blue-500 group-hover:text-white transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                    <Plus size={18} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center space-y-4">
              <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto opacity-10">
                 <FileText size={40} />
              </div>
              <p className="text-xs text-white/20 font-bold uppercase tracking-widest">কোথাও কোনো পেজ খুঁজে পাওয়া যায়নি</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
