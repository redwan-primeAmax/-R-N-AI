/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, Share, Link, Copy, 
  Trash2, FileText, 
  MoveRight, Check, X, ClipboardCopy
} from 'lucide-react';
import { Note, DataManager } from '../../../services/storage/DataManager';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';

interface ActionMenuProps {
  note: Note | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onCopy: (note: Note) => void;
  onDelete: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onEmojiSelect?: (id: string, emoji: string) => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ 
  note, 
  onClose, 
  onEdit, 
  onCopy, 
  onDelete,
  onToggleSelection,
  onEmojiSelect
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [copied, setCopied] = React.useState<'link' | 'content' | null>(null);

  React.useEffect(() => {
    if (note) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setShowEmojiPicker(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [note]);

  const handleCopyLink = () => {
    if (!note) return;
    const url = `${window.location.origin}/editor/${note.id}`;
    navigator.clipboard.writeText(url);
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyContent = () => {
    if (!note) return;
    const plainText = note.content.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(plainText);
    setCopied('content');
    setTimeout(() => setCopied(null), 2000);
  };

  const menuItems = [
    { 
      icon: <Star size={20} className={note?.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-white/70"} />, 
      label: note?.isFavorite ? "Remove from Favourites" : "Add to Favourites", 
      onClick: () => {
        if (note) {
          DataManager.toggleFavorite(note.id);
          onClose();
        }
      } 
    },
    { 
      icon: <Share size={20} className="text-white/70" />, 
      label: "Share", 
      onClick: () => {} 
    },
    { 
      icon: copied === 'link' ? <Check size={20} className="text-emerald-500" /> : <Link size={20} className="text-white/70" />, 
      label: "Copy link", 
      onClick: handleCopyLink 
    },
    { 
      icon: copied === 'content' ? <Check size={20} className="text-emerald-500" /> : <ClipboardCopy size={20} className="text-white/70" />, 
      label: "Copy page contents", 
      onClick: handleCopyContent 
    },
    { 
      icon: <Copy size={20} className="text-white/70" />, 
      label: "Duplicate", 
      onClick: () => { if (note) onCopy(note); onClose(); } 
    },
    { 
      icon: <MoveRight size={20} className="text-white/70" />, 
      label: "Move to", 
      onClick: () => {} 
    },
  ];

  return (
    <AnimatePresence>
      {note && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]" 
          />
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-white/[0.08] rounded-t-[32px] overflow-hidden z-[101] shadow-[0_-20px_50px_rgba(0,0,0,0.8)]"
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-4" />
            
            <div className="px-6 pb-8">
              {/* Note Header Info */}
              <div className="flex items-center gap-4 mb-6 p-2">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-16 h-16 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl flex items-center justify-center text-4xl transition-all active:scale-95 border border-white/5"
                >
                  {note.emoji || '📄'}
                </button>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-xl truncate text-white/90">{note.title || 'শিরোনামহীন চিন্তা'}</h3>
                  <p className="text-[11px] text-white/30 font-medium tracking-tight uppercase">
                    Modified: {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/30">
                  <X size={20} />
                </button>
              </div>

              {showEmojiPicker ? (
                <div className="h-[350px] overflow-hidden rounded-2xl border border-white/5 bg-[#1a1a1a]">
                  <EmojiPicker 
                    onEmojiClick={(emoji) => {
                      if (onEmojiSelect) onEmojiSelect(note.id, emoji.emoji);
                      setShowEmojiPicker(false);
                    }}
                    theme={EmojiTheme.DARK}
                    width="100%"
                    height={350}
                    lazyLoadEmojis={true}
                  />
                </div>
              ) : (
                <div className="flex flex-col">
                  {menuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-4 py-2.5 px-2 hover:bg-white/[0.03] transition-all group active:bg-white/[0.06] border-b border-white/[0.04] last:border-0"
                    >
                      <div className="w-6 flex justify-center group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <span className="font-medium text-[16px] text-white/80 group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                    </button>
                  ))}

                  <div className="mt-4 pt-4 border-t border-white/[0.08] grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { onEdit(note.id); onClose(); }}
                      className="flex items-center justify-center gap-2 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-sm text-white/90 transition-all active:scale-95"
                    >
                      <FileText size={18} className="text-blue-400" />
                      Edit Note
                    </button>
                     <button 
                      onClick={async () => { 
                        await onDelete(note.id); 
                        onClose(); 
                      }}
                      className="flex items-center justify-center gap-2 py-3.5 bg-red-500/10 hover:bg-red-500/20 rounded-2xl font-bold text-sm text-red-500 transition-all active:scale-95"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
