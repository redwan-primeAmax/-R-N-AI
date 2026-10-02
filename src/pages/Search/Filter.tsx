/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag as TagIcon, X, Check } from 'lucide-react';

interface FilterProps {
  isOpen: boolean;
  onClose: () => void;
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

/**
 * Filter Component - Redesigned for absolute stability and zero ghosting.
 * Uses Portal-like logic with absolute fixed positioning and strict event containment.
 */
const Filter: React.FC<FilterProps> = ({
  isOpen,
  onClose,
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="filter-portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            // Only close if the background itself is clicked
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            key="filter-sheet"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 450 }}
            className="w-full max-w-sm bg-[#121212] border border-white/10 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col pointer-events-auto"
            onClick={(e) => e.stopPropagation()} // Stop click from reaching backdrop
          >
            {/* Header */}
            <div className="p-6 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                  <TagIcon size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ফিল্টার</h3>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">Filter by Tags</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-2 overflow-y-auto max-h-[350px] flex flex-wrap gap-2 no-scrollbar">
              {allTags.length > 0 ? (
                allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => onToggleTag(tag)}
                      className={`px-4 py-2.5 rounded-2xl text-[12px] font-bold transition-all border flex items-center gap-2 ${
                        isSelected
                          ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                          : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                      <span>#{tag}</span>
                    </button>
                  );
                })
              ) : (
                <div className="w-full py-12 text-center text-white/20 text-xs font-medium">
                  কোনো ট্যাগ পাওয়া যায়নি
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 mt-2 flex items-center justify-between bg-white/[0.02] border-t border-white/5">
              <button
                onClick={onClearTags}
                disabled={selectedTags.length === 0}
                className="text-[11px] font-black uppercase tracking-[0.15em] text-red-500 disabled:opacity-20 transition-all hover:opacity-100"
              >
                ক্লিয়ার ({selectedTags.length})
              </button>
              
              <button
                onClick={onClose}
                className="px-10 py-3.5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-transform active:scale-95 shadow-xl hover:bg-gray-100"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Filter;
