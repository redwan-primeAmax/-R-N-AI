/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Note } from '../../../utils/DataManager';

interface InputAreaProps {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  handleSend: () => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showMentions: boolean;
  filteredMentions: Note[];
  selectMention: (note: Note) => void;
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
  selectMention
}) => {
  return (
    <div className="p-4 bg-[#191919] border-t border-white/5 pb-28">
      <div className="relative max-w-2xl mx-auto">
        <AnimatePresence>
          {showMentions && filteredMentions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-0 right-0 mb-3 bg-[#1c1c1c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
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

        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="AI-কে জিজ্ঞাসা করুন অথবা @ টাইপ করে পেজ লিঙ্ক করুন..."
              className="w-full pl-6 pr-12 py-4 bg-white/5 border border-white/5 rounded-2xl outline-none font-medium text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/10 transition-all shadow-inner"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center disabled:opacity-20 transition-all active:scale-90 shadow-lg"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
