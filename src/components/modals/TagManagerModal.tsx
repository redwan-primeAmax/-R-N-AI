import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from './Modal';
import { Tag as TagIcon, X, Plus } from 'lucide-react';
import { Note, DataManager } from '../../services/storage/DataManager';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  onTagsUpdated: (newTags: string[]) => void;
}

export function TagManagerModal({ isOpen, onClose, note, onTagsUpdated }: TagManagerModalProps) {
  const [newTagInput, setNewTagInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentTags, setCurrentTags] = useState<string[]>([]);

  React.useEffect(() => {
    if (note) {
      setCurrentTags(note.tags || []);
    }
  }, [note, isOpen]);

  if (!note) return null;

  const handleAddTag = async () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;

    // Split by commas optionally to support multiple tags at once
    const tagsToAdd = trimmed
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const updatedTags = Array.from(new Set([...currentTags, ...tagsToAdd]));
    setCurrentTags(updatedTags);

    // Update DB
    const updatedNote = { ...note, tags: updatedTags, updatedAt: Date.now() };
    await DataManager.saveNote(updatedNote);

    // Call callback to update parent state in real time
    onTagsUpdated(updatedTags);

    // Reset input without closing modal
    setNewTagInput('');
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    setCurrentTags(updatedTags);

    // Update DB
    const updatedNote = { ...note, tags: updatedTags, updatedAt: Date.now() };
    await DataManager.saveNote(updatedNote);

    // Call callback to update parent state in real time
    onTagsUpdated(updatedTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (newTagInput.trim()) {
      await handleAddTag();
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ট্যাগ ম্যানেজার (Tags)" maxWidth="max-w-md">
      <div className="space-y-8 pt-4 pb-4">
        <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl">
           <p className="text-[11px] text-blue-300/60 font-medium leading-relaxed">
             এই নোটটিকে বিভিন্ন ক্যাটাগরিতে ভাগ করতে ট্যাগ ব্যবহার করুন। ট্যাগ দিয়ে সার্চ করা আরও সহজ হয়।
           </p>
        </div>

        {/* Existing Tags Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
              ব্যবহৃত ট্যাগ সমূহ ({currentTags.length})
            </h4>
            {currentTags.length > 0 && (
               <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            )}
          </div>
          
          {currentTags.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-4 bg-white/[0.02] border border-white/[0.05] rounded-3xl no-scrollbar">
              {currentTags.map(tag => (
                <motion.div 
                  layout
                  key={tag}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#222222] hover:bg-[#2a2a2a] text-blue-200 text-[11px] font-black uppercase tracking-wider border border-white/5 rounded-xl transition-all group"
                >
                  <TagIcon size={12} className="text-blue-500/60 group-hover:text-blue-400" />
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 p-1 hover:bg-red-500/20 text-white/20 hover:text-red-400 rounded-lg transition-all"
                    title="মুছুন"
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center gap-3">
               <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/10">
                  <TagIcon size={24} />
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/20">কোনো ট্যাগ নেই</p>
            </div>
          )}
        </div>

        {/* Adding New Tag form */}
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-1">
            নতুন ট্যাগ যোগ করুন
          </label>
          <div className="relative group">
            <input
              type="text"
              placeholder="যেমন: অফিস, পার্সোনাল..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-blue-500/30 rounded-2xl py-4 px-5 text-sm focus:bg-white/[0.05] outline-none transition-all text-white font-bold placeholder:text-white/5"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTagInput.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 rounded-xl transition-all flex items-center justify-center text-white active:scale-90 shadow-lg shadow-blue-600/20"
              type="button"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-white/5">
           <AnimatePresence>
            {saveSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/5 py-3 rounded-xl border border-emerald-500/10 mb-4"
              >
                ✓ Tags Updated Successfully
              </motion.div>
            )}
           </AnimatePresence>
          
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all text-white active:scale-95 shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
              type="button"
            >
              <Plus size={16} strokeWidth={3} />
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all text-white/30 border border-white/5 active:scale-95"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
