/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectionBarProps {
  isVisible: boolean;
  selectedCount: number;
  onCancel: () => void;
  onDelete: () => void;
}

export const SelectionBar: React.FC<SelectionBarProps> = ({ 
  isVisible, 
  selectedCount, 
  onCancel, 
  onDelete 
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: 100 }} 
          animate={{ y: 0 }} 
          exit={{ y: 100 }} 
          className="fixed bottom-28 left-6 right-6 z-50 bg-[#222]/90 backdrop-blur-xl p-4 rounded-3xl flex justify-between items-center border border-white/10 shadow-2xl"
        >
          <div className="flex items-center gap-3 ml-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black">
              {selectedCount}
            </div>
            <span className="font-bold text-sm">Selected</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onCancel} 
              className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={onDelete} 
              className="px-4 py-2 bg-red-500 rounded-xl text-xs font-bold shadow-lg shadow-red-500/20"
            >
              Delete
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
