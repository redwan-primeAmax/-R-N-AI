/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Check, Send, X, User } from 'lucide-react';
import { NoteComment } from '../../../types/note';
import { cn } from '../../../utils/cn';

interface BlockCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  blockId: string | null;
  comments: NoteComment[];
  onAddComment: (blockId: string, text: string) => void;
  onResolveComment: (commentId: string) => void;
}

export const BlockCommentsDrawer: React.FC<BlockCommentsDrawerProps> = ({
  isOpen,
  onClose,
  blockId,
  comments,
  onAddComment,
  onResolveComment
}) => {
  const [commentText, setCommentText] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  if (!isOpen || !blockId) return null;

  const filteredComments = comments.filter(c => c.blockId === blockId && (showResolved ? true : !c.resolved));

  const handleSend = () => {
    if (!commentText.trim()) return;
    onAddComment(blockId, commentText.trim());
    setCommentText('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex justify-end bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm bg-[#1a1a1c] h-full border-l border-white/10 flex flex-col text-white shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="text-blue-400 w-5 h-5" />
              <h3 className="font-bold text-sm">ব্লক কমেন্টসমূহ (Comments)</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg cursor-pointer">
              <X size={18} className="text-white/50" />
            </button>
          </div>

          {/* Comment Filters */}
          <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/50">{filteredComments.length} টি মন্তব্য</span>
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="text-blue-400 hover:underline cursor-pointer"
            >
              {showResolved ? 'সমাপ্তগুলো লুকান' : 'সমাপ্তগুলো দেখুন'}
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredComments.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/30 border border-dashed border-white/10 rounded-2xl">
                এই ব্লকে কোনো মন্তব্য নেই
              </div>
            ) : (
              filteredComments.map(c => (
                <div
                  key={c.id}
                  className={cn(
                    "p-3 rounded-2xl border text-xs space-y-2",
                    c.resolved ? "bg-white/5 border-white/5 opacity-50" : "bg-blue-500/10 border-blue-500/20"
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] text-white/40">
                    <div className="flex items-center gap-1.5 font-bold text-white/80">
                      <User size={12} className="text-blue-400" />
                      <span>{c.author || 'ব্যবহারকারী'}</span>
                    </div>
                    <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <p className="text-white/90 leading-relaxed font-medium">{c.text}</p>

                  {!c.resolved && (
                    <button
                      onClick={() => onResolveComment(c.id)}
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <Check size={12} />
                      <span>সমাধান হিসেবে চিহ্নিত করুন</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-white/10 bg-[#141416] flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="পরামর্শ বা মন্তব্য লিখুন..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-400"
            />
            <button
              onClick={handleSend}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
