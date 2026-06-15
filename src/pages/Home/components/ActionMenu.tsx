/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, Share, Link, Copy, Bookmark, Edit, Info,
  Trash2, FileText, Lock,
  MoveRight, Check, X, ClipboardCopy
} from 'lucide-react';
import { Note, DataManager } from '../../../services/storage/DataManager';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { RenameModal } from '../../../components/modals/RenameModal';
import { MoveToBookmarkModal } from '../../../components/modals/MoveToBookmarkModal';
import { ConfirmDialog } from '../../../components/modals/CustomDialogs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const [showRenameModal, setShowRenameModal] = React.useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = React.useState(false);
  const [showShareError, setShowShareError] = React.useState(false);

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

  const handleShareMarkdown = async () => {
    if (!note) return;
    
    // Check for attached files (mediaRefs)
    const hasMedia = note.mediaRefs && note.mediaRefs.length > 0;
    if (hasMedia) {
      setShowShareError(true);
      return;
    }

    const plainText = note.content.replace(/<[^>]*>/g, '');
    const shareData = {
      title: note.title || 'Untitled',
      text: plainText,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleRename = async (newName: string) => {
    if (!note) return;
    await DataManager.saveNote({ ...note, title: newName });
    setShowRenameModal(false);
    onClose();
    // Force reload in home page via event
    window.dispatchEvent(new CustomEvent('workspace-notes-changed'));
  };

  const handleMoveToBookmark = async (folderId?: string) => {
    if (!note) return;
    await DataManager.addNoteToBookmark(note.id, folderId);
    setShowBookmarkModal(false);
    onClose();
    // Redirect to bookmarks page as requested
    window.location.hash = `/bookmarks${folderId ? `?folder=${folderId}` : ''}`;
  };

  const hasMedia = note?.mediaRefs && note.mediaRefs.length > 0;

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
      icon: <Lock size={20} className={note?.isLocked ? "text-amber-500" : "text-white/70"} />, 
      label: note?.isLocked ? "Unlock Page" : "Lock Page", 
      onClick: async () => {
        if (note) {
          await DataManager.toggleLock(note.id);
          onClose();
        }
      }
    },
    { 
      icon: <Bookmark size={20} className="text-white/70" />, 
      label: "Add to Bookmark", 
      onClick: () => setShowBookmarkModal(true)
    },
    { 
      icon: <Share size={20} className={hasMedia ? "text-gray-600" : "text-white/70"} />, 
      label: "Share (Markdown)", 
      disabled: hasMedia,
      showError: hasMedia,
      onClick: handleShareMarkdown 
    },
    { 
      icon: <Edit size={20} className="text-white/70" />, 
      label: "Rename", 
      onClick: () => setShowRenameModal(true)
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
                    <div key={index} className="relative">
                      <button
                        onClick={item.onClick}
                        disabled={(item as any).disabled}
                        className={cn(
                          "w-full flex items-center gap-4 py-2.5 px-2 transition-all group border-b border-white/[0.04] last:border-0",
                          (item as any).disabled ? "cursor-not-allowed opacity-50 bg-black/40" : "hover:bg-white/[0.03] active:bg-white/[0.06]"
                        )}
                      >
                        <div className="w-6 flex justify-center group-hover:scale-110 transition-transform">
                          {item.icon}
                        </div>
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <span className={cn(
                            "font-medium text-[16px] transition-colors",
                            (item as any).disabled ? "text-gray-600" : "text-white/80 group-hover:text-white"
                          )}>
                            {item.label}
                          </span>
                          {(item as any).showError && (
                            <span className="text-[9px] text-red-500 font-bold uppercase tracking-tighter">Markdown share not available for this note</span>
                          )}
                        </div>
                        {(item as any).showError && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowShareError(true); }}
                            className="p-2 text-white/20 hover:text-white"
                          >
                            <Info size={16} />
                          </button>
                        )}
                      </button>
                    </div>
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

          {/* Additional Modals */}
          <RenameModal 
            isOpen={showRenameModal}
            onClose={() => setShowRenameModal(false)}
            onRename={handleRename}
            currentName={note.title || ''}
          />
          <MoveToBookmarkModal 
            isOpen={showBookmarkModal}
            onClose={() => setShowBookmarkModal(false)}
            onMove={handleMoveToBookmark}
            noteTitle={note.title || 'Untitled'}
          />
          <ConfirmDialog 
            isOpen={showShareError}
            onClose={() => setShowShareError(false)}
            onConfirm={() => setShowShareError(false)}
            title="শেয়ার তথ্য"
            message="এই নোটটিতে ফাইল (Images/Files) এটাচড থাকায় শুধুমাত্র টেক্সট হিসেবে মার্কডাউন শেয়ার করা সম্ভব নয়। ফাইল রিমুভ করে পুনরায় চেষ্টা করুন।"
            confirmText="বুঝেছি"
            cancelText=""
            variant="primary"
          />
        </>
      )}
    </AnimatePresence>
  );
};
