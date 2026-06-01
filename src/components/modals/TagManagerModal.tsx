import React, { useState } from 'react';
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
    <Modal isOpen={isOpen} onClose={onClose} title="ট্যাগ" maxWidth="max-w-md">
      <div className="space-y-6 pt-2">
        <p className="text-xs text-white/50">
          এই নোটটিকে বিভিন্ন গ্রুপ বা ক্যাটাগরিতে চিহ্নিত করতে ট্যাগ যুক্ত করুন।
        </p>

        {/* Existing Tags Section with scroll */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
            বর্তমান ট্যাগ সমূহ ({currentTags.length})
          </h4>
          
          {currentTags.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-2 border border-white/5 bg-black/20 rounded-xl no-scrollbar">
              {currentTags.map(tag => (
                <div 
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/10 rounded-lg transition-all"
                >
                  <TagIcon size={12} className="opacity-60" />
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="p-0.5 hover:bg-red-500/20 text-blue-300 hover:text-red-400 rounded-full transition-all"
                    title="মুছুন"
                    type="button"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center border border-dashed border-white/5 rounded-xl text-xs text-white/20 italic">
              কোনো ট্যাগ যুক্ত করা নেই
            </div>
          )}
        </div>

        {/* Adding New Tag form */}
        <div className="space-y-2 pt-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
            নতুন ট্যাগ যুক্ত করুন
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ট্যাগের নাম লিখুন বা কমা (,) দিয়ে গুচ্ছ দিন..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 hover:border-white/20 outline-none transition-all text-white"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTagInput.trim()}
              className="px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 rounded-xl transition-all flex items-center justify-center text-white active:scale-95"
              type="button"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Action Button that saves & stays open, or closes when user clicks cross */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          {saveSuccess && (
            <div className="text-center text-xs text-green-400 font-bold bg-green-500/10 py-1.5 rounded-lg border border-green-500/20 animate-fade-in">
              ✓ ট্যাগগুলো সফলভাবে সেভ করা হয়েছে!
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs tracking-wider transition-all text-white active:scale-95 shadow-lg shadow-blue-500/20"
              type="button"
            >
              সেভ করুন
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs tracking-wider transition-all text-white/50 active:scale-95"
              type="button"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
