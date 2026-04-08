/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Send, Loader2, Search, Sparkles, FileEdit, Paperclip, X, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Note } from '../../../utils/DataManager';

console.log('ChatInput: File loaded');

interface InputAreaProps {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  handleSend: () => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showMentions: boolean;
  filteredMentions: Note[];
  selectMention: (note: Note) => void;
  notes: Note[];
  attachedNotes: Note[];
  setAttachedNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

/**
 * The input area component for the AI Chat.
 * Includes mention support and loading state.
 */
export const ChatInput: React.FC<InputAreaProps> = ({
  input,
  isLoading,
  handleSend,
  handleInputChange,
  showMentions,
  filteredMentions,
  selectMention,
  notes,
  attachedNotes,
  setAttachedNotes
}) => {
  console.log('ChatInput: Rendering ChatInput');
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAttachment = (note: Note) => {
    setAttachedNotes(prev => {
      const exists = prev.find(n => n.id === note.id);
      if (exists) {
        return prev.filter(n => n.id !== note.id);
      } else {
        return [...prev, note];
      }
    });
  };

  const removeAttachment = (id: string) => {
    setAttachedNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="p-4 bg-[#0d0d0d] border-t border-white/5 relative">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Attached Files List */}
        <AnimatePresence>
          {attachedNotes.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-wrap gap-2 pb-2"
            >
              {attachedNotes.map(note => (
                <div 
                  key={note.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400"
                >
                  <span className="text-xs">{note.emoji || '📄'}</span>
                  <span className="text-[11px] font-bold max-w-[120px] truncate">{note.title}</span>
                  <button 
                    onClick={() => removeAttachment(note.id)}
                    className="hover:text-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showMentions && filteredMentions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-0 right-0 mb-3 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              <div className="px-4 py-2 border-b border-white/5 bg-white/5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">পেজ লিঙ্ক করুন</span>
              </div>
              {filteredMentions.map(note => (
                <button
                  key={note.id}
                  onClick={() => selectMention(note)}
                  className="w-full px-4 py-3 text-left hover:bg-white/5 flex items-center gap-3 border-b border-white/5 last:border-0 transition-colors"
                >
                  <span className="text-lg">{note.emoji || '📄'}</span>
                  <span className="font-medium text-sm text-white/80">{note.title || 'শিরোনামহীন'}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Field */}
        <div className="relative group flex items-center gap-3">
          <button
            onClick={() => setShowFileSelector(true)}
            className="w-12 h-12 flex items-center justify-center bg-[#1a1a1a] border border-white/10 rounded-2xl text-white/40 hover:text-white hover:border-white/20 transition-all active:scale-95"
            title="ফাইল এটাচ করুন"
          >
            <Paperclip size={20} />
          </button>

          <div className="relative flex-grow">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask AI or type @ to link page"
              className="w-full pl-6 pr-14 py-4 bg-[#1a1a1a] border border-white/10 rounded-2xl outline-none font-medium text-white/90 placeholder:text-white/20 focus:bg-[#222] transition-all text-sm"
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachedNotes.length === 0) || isLoading}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 transition-all active:scale-90"
            >
              {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* File Selector Modal */}
      <AnimatePresence>
        {showFileSelector && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1c1c1c] border border-white/10 rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">নোট এটাচ করুন</h3>
                <button 
                  onClick={() => setShowFileSelector(false)}
                  className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input 
                    type="text"
                    placeholder="নোট খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl outline-none text-sm text-white focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-2 no-scrollbar">
                {filteredNotes.length > 0 ? (
                  filteredNotes.map(note => {
                    const isAttached = attachedNotes.some(an => an.id === note.id);
                    return (
                      <button
                        key={note.id}
                        onClick={() => toggleAttachment(note)}
                        className={`w-full p-4 flex items-center justify-between rounded-2xl transition-all mb-1 ${
                          isAttached ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{note.emoji || '📄'}</span>
                          <div className="text-left">
                            <div className={`text-sm font-bold ${isAttached ? 'text-blue-400' : 'text-white/80'}`}>
                              {note.title}
                            </div>
                            <div className="text-[10px] text-white/30 truncate max-w-[200px]">
                              {note.content.replace(/<[^>]*>/g, '').slice(0, 50)}...
                            </div>
                          </div>
                        </div>
                        {isAttached && <Check size={18} className="text-blue-400" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-white/20 text-sm">
                    কোনো নোট পাওয়া যায়নি
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5">
                <button
                  onClick={() => setShowFileSelector(false)}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  সম্পন্ন ({attachedNotes.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
