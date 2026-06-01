/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

import { ThemeMetadata } from '../../pages/Editor/themes/types';
import { THEME_METADATA } from '../../pages/Editor/themes/ThemeRegistry';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (themeId: string) => void;
  currentTheme?: string;
}

export function ThemeSelectorModal({ isOpen, onClose, onSelect, currentTheme }: ThemeSelectorModalProps) {
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
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">নোট থিম নির্বাচন করুন</h2>
                <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest mt-1">Select your preferred writing canvas</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto pr-2 custom-scrollbar">
              {THEME_METADATA.map((theme) => (
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
                    "w-full h-20 sm:h-24 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 relative overflow-hidden flex items-center justify-center border",
                    theme.previewClassName
                  )}>
                     {theme.id === 'yellow-ruled' && (
                       <div className="absolute left-6 h-full w-[2px] bg-red-200/50" />
                     )}
                     <span className="text-[10px] uppercase font-black tracking-widest opacity-20 transform -rotate-12">Preview</span>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white text-sm">{theme.name}</h3>
                      <p className="text-white/40 text-[10px] mt-0.5">{theme.description}</p>
                    </div>
                    {currentTheme === theme.id && (
                      <div className="bg-blue-600 p-1.5 rounded-xl text-white">
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
