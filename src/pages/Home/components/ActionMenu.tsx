/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Copy, Trash2, CheckCircle2 } from 'lucide-react';
import { Note } from '../../../services/storage/DataManager';

interface ActionMenuProps {
  note: Note | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onCopy: (note: Note) => void;
  onDelete: (id: string) => void;
  onToggleSelection: (id: string) => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ 
  note, 
  onClose, 
  onEdit, 
  onCopy, 
  onDelete,
  onToggleSelection
}) => {
  const [iconsLoaded, setIconsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (note) {
      document.body.style.overflow = 'hidden';
      setIconsLoaded(false);
      const timer = setTimeout(() => {
        setIconsLoaded(true);
      }, 500);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      setIconsLoaded(false);
      document.body.style.overflow = '';
    }
  }, [note]);

  const IconPlaceholder = () => (
    <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center animate-pulse bg-white/5">
      <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
    </div>
  );

  return (
    <AnimatePresence>
      {note && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-[100]" 
          />
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.22 }}
            className="fixed bottom-0 left-0 right-0 bg-[#161616] border-t border-white/10 rounded-t-[32px] p-8 z-[101] shadow-2xl"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">{note.emoji}</div>
              <div>
                <h3 className="font-bold text-lg">{note.title || 'শিরোনামহীন চিন্তা'}</h3>
                <p className="text-xs text-white/40 font-medium">শেষ পরিবর্তন: {new Date(note.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => onEdit(note.id)}
                className="w-full flex items-center gap-4 p-5 hover:bg-white/5 rounded-2xl transition-colors text-white/80 active:scale-98"
              >
                {iconsLoaded ? (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center">
                    <Edit2 size={20} className="text-blue-400" />
                  </motion.div>
                ) : (
                  <IconPlaceholder />
                )}
                <span className="font-bold">নোট এডিট করুন</span>
              </button>
              <button 
                onClick={() => onCopy(note)}
                className="w-full flex items-center gap-4 p-5 hover:bg-white/5 rounded-2xl transition-colors text-white/80 active:scale-98"
              >
                {iconsLoaded ? (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center">
                    <Copy size={20} className="text-purple-400" />
                  </motion.div>
                ) : (
                  <IconPlaceholder />
                )}
                <span className="font-bold">অনুলিপি তৈরি করুন</span>
              </button>
              <button 
                onClick={() => {
                  onToggleSelection(note.id);
                  onClose();
                }}
                className="w-full flex items-center gap-4 p-5 hover:bg-white/5 rounded-2xl transition-colors text-white/80 active:scale-98"
              >
                {iconsLoaded ? (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  </motion.div>
                ) : (
                  <IconPlaceholder />
                )}
                <span className="font-bold">সিলেক্ট করুন</span>
              </button>
              <button 
                onClick={() => onDelete(note.id)}
                className="w-full flex items-center gap-4 p-5 hover:bg-red-500/10 rounded-2xl transition-colors text-red-500 active:scale-98"
              >
                {iconsLoaded ? (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center">
                    <Trash2 size={20} />
                  </motion.div>
                ) : (
                  <IconPlaceholder />
                )}
                <span className="font-bold">মুছে ফেলুন</span>
              </button>
            </div>
            <button 
              onClick={onClose}
              className="w-full mt-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all text-white/60"
            >
              বন্ধ করুন
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
