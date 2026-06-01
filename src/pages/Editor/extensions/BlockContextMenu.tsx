import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, Copy, Move, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface BlockContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
  position: { x: number; y: number };
}

export const BlockContextMenu: React.FC<BlockContextMenuProps> = ({
  isOpen,
  onClose,
  onAction,
  position
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div 
            key="context-menu-overlay"
            className="fixed inset-0 z-[200]" 
            onClick={onClose}
          />
          <motion.div
            key="context-menu-content"
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            style={{ left: position.x, top: position.y }}
            className="fixed z-[210] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[180px] backdrop-blur-xl"
          >
        <button
          onClick={() => onAction('ai')}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-blue-500/10 rounded-lg text-left group transition-all"
        >
          <div className="flex items-center gap-2 text-blue-400">
            <Sparkles size={16} />
            <span className="text-sm font-bold">Ask AI</span>
          </div>
          <ChevronRight size={14} className="opacity-20 group-hover:opacity-100" />
        </button>

        <div className="h-[1px] bg-white/5 my-1.5" />

        <button
          onClick={() => onAction('duplicate')}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg text-left text-white/60 transition-all"
        >
          <Copy size={16} />
          <span className="text-sm font-bold">Duplicate</span>
        </button>

        <button
          onClick={() => onAction('move')}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg text-left text-white/60 transition-all"
        >
          <Move size={16} />
          <span className="text-sm font-bold">Move to</span>
        </button>

        <div className="h-[1px] bg-white/5 my-1.5" />

        <button
          onClick={() => onAction('delete')}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-500/10 rounded-lg text-left text-red-500 transition-all"
        >
          <Trash2 size={16} />
          <span className="text-sm font-bold">Delete</span>
        </button>
      </motion.div>
      </>
    )}
    </AnimatePresence>
  );
};
