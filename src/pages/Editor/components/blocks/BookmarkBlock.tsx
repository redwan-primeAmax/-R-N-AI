/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bookmark, Globe, X, Link2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../../utils/cn';

interface BookmarkBlockProps {
  block: any;
  setBlocks: any;
  isReadOnly?: boolean;
}

export const BookmarkBlock: React.FC<BookmarkBlockProps> = ({ block, setBlocks, isReadOnly }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleCreate = () => {
    if (!urlInput.trim()) return;
    // Basic validation
    let validUrl = urlInput.trim();
    if (!validUrl.startsWith('http')) validUrl = 'https://' + validUrl;
    
    setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { 
      ...b, 
      meta: { ...b.meta, url: validUrl, status: 'ready', title: new URL(validUrl).hostname } 
    } : b));
    setShowPopup(false);
  };

  const handleBlockClick = () => {
    if (isReadOnly) {
      if (block.meta?.url) window.open(block.meta.url, '_blank');
      return;
    }
    if (block.meta?.status === 'empty') {
      setShowPopup(true);
    } else {
      window.open(block.meta?.url, '_blank');
    }
  };

  return (
    <>
      <div 
        onClick={handleBlockClick}
        className={cn(
          "group relative flex items-center gap-4 p-4 my-2 border rounded-2xl cursor-pointer transition-all active:scale-[0.99]",
          block.meta?.status === 'empty' 
            ? "border-dashed border-gray-300 dark:border-white/10 hover:border-blue-500/50 bg-gray-50/50 dark:bg-white/[0.02]" 
            : "border-gray-200 dark:border-white/5 bg-white dark:bg-white/[0.03] hover:shadow-lg"
        )}
      >
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
          block.meta?.status === 'empty' ? "bg-gray-100 dark:bg-white/5 text-gray-400" : "bg-blue-500/10 text-blue-500"
        )}>
          {block.meta?.status === 'empty' ? <Bookmark size={22} /> : <Globe size={22} />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={cn(
            "text-sm font-bold truncate",
            block.meta?.status === 'empty' ? "text-gray-400" : "text-gray-900 dark:text-gray-100"
          )}>
            {block.meta?.status === 'empty' ? 'Web Link' : block.meta?.title}
          </div>
          <div className="text-[11px] text-gray-400 truncate font-medium">
            {block.meta?.status === 'empty' ? 'Click to add a web bookmark' : block.meta?.url}
          </div>
        </div>

        {block.meta?.status !== 'empty' && (
          <ExternalLink size={16} className="text-gray-300 dark:text-white/10 group-hover:text-blue-500 transition-colors" />
        )}
      </div>

      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
              onClick={() => setShowPopup(false)}
            />
            <motion.div 
              initial={{ y: '100%', opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: '100%', opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl pointer-events-auto border-t sm:border border-white/10"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                    <Link2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black dark:text-white italic tracking-tight">Add Bookmark</h3>
                    <p className="text-[11px] font-bold text-gray-400 dark:text-white/20 uppercase tracking-widest">Enter a valid URL to create</p>
                  </div>
                </div>
                <button onClick={() => setShowPopup(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <input 
                autoFocus
                type="text" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-mono focus:border-blue-500 outline-none placeholder:text-gray-300 dark:placeholder:text-white/10 text-gray-900 dark:text-white mb-8"
              />

              <button 
                onClick={handleCreate}
                disabled={!urlInput.trim()}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:grayscale text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-blue-500/20"
              >
                Create Bookmark
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
