/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Palette } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useEffect, useState } from 'react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (themeId: string) => void;
  currentTheme?: string;
}

export function ThemeSelectorModal({ isOpen, onClose, onSelect, currentTheme }: ThemeSelectorModalProps) {
  const [themes, setThemes] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      return () => { };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-xl bg-[#1c1c1c] rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl p-6 sm:p-8 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-6 sm:mb-8 shrink-0">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">নোট থিম নির্বাচন করুন</h2>
                <p className="text-white/40 font-black uppercase text-[9px] tracking-[0.2em] mt-1">Select from your installed extension themes</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto pr-2 custom-scrollbar">
              {themes.length > 0 ? themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    onSelect(theme.id);
                    onClose();
                  }}
                  className={cn(
                    "flex flex-col p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border-2 transition-all text-left relative group",
                    currentTheme === theme.id 
                      ? "bg-blue-600/10 border-blue-600" 
                      : "bg-white/5 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className={cn(
                    "w-full h-20 sm:h-24 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 relative overflow-hidden flex items-center justify-center border border-white/5 bg-[#1a1a1a]",
                    theme.previewClassName
                  )}>
                     {theme.id === 'yellow-ruled' && (
                       <div className="absolute left-6 h-full w-[2px] bg-red-200/50" />
                     )}
                     <div className="bg-white/5 p-3 rounded-2xl">
                        <Palette size={24} className="text-white/20" />
                     </div>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm truncate">{theme.name}</h3>
                      <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-0.5 truncate">{theme.description || 'Extension Theme'}</p>
                    </div>
                    {currentTheme === theme.id && (
                      <div className="ml-2 bg-blue-600 p-1 rounded-lg text-white">
                        <Check size={10} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                </button>
              )) : (
                <div className="col-span-full py-16 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-white/5 rounded-[2rem]">
                  <Palette size={48} className="mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">কোন থিম এক্সটেনশন পাওয়া যায়নি</p>
                  <p className="text-[10px] mt-2 font-medium opacity-60">এক্সটেনশন স্টোর থেকে থিম ইনস্টল করুন</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
