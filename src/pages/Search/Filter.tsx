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

export default function Filter({
  isOpen,
  onClose,
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags
}: FilterProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#000]/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md overflow-hidden bg-[#121212] border border-white/10 rounded-[32px] shadow-2xl p-6 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TagIcon size={18} className="text-blue-400" />
                <h3 className="text-base font-black tracking-tight text-white/90">
                  ট্যাগ দিয়ে ফিল্টার করুন
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 -m-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tags Grid / List */}
            <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-wrap gap-2.5 mb-6 custom-scrollbar">
              {allTags.length > 0 ? (
                allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => onToggleTag(tag)}
                      className={`px-4 py-2.5 rounded-2xl text-[12px] font-bold tracking-wide transition-all border flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                          : "bg-white/[0.03] border-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                      }`}
                    >
                      {isSelected && <Check size={12} className="text-white" />}
                      <span>#{tag}</span>
                    </button>
                  );
                })
              ) : (
                <div className="w-full text-center py-10 text-white/20 text-xs font-medium">
                  কোনো ট্যাগ পাওয়া যায়নি
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              {selectedTags.length > 0 ? (
                <button
                  onClick={onClearTags}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-red-400/80 hover:text-red-400 font-mono"
                >
                  ক্লিয়ার করুন ({selectedTags.length})
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-600/20"
              >
                সম্পূর্ণ (Done)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
