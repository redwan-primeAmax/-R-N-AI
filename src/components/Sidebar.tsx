import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Cloud, FileInput, UploadCloud, Trash2, 
  Settings, Sun, Moon, Database, Info, 
  ArrowLeft, Check
} from 'lucide-react';
import { DataManager } from '../utils/DataManager';
import { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTrash: () => void;
  onOpenSettings: () => void;
  onSync: () => void;
  isCloudConnected: boolean;
}

export default function Sidebar({ 
  isOpen, 
  onClose, 
  onOpenTrash, 
  onOpenSettings, 
  onSync,
  isCloudConnected 
}: SidebarProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Sidebar Content */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-[#0A0A0A] border-r border-white/5 z-[101] flex flex-col p-6 overflow-y-auto no-scrollbar"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                  N
                </div>
                <span className="font-bold text-lg tracking-tight">মূল মেনু</span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1">
              {/* Cloud Sync - Primary Position */}
              <div className="mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3 ml-2">সঞ্চয়স্থান</h3>
                <button 
                  onClick={() => { onSync(); onClose(); }}
                  className="w-full flex items-center justify-between gap-4 px-4 py-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl transition-all text-blue-400 active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <Cloud size={20} />
                    <span className="font-bold text-sm">{isCloudConnected ? 'তথ্য সমন্বয় করুন' : 'ক্লাউড সংযোগ'}</span>
                  </div>
                  {isCloudConnected && <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />}
                </button>
              </div>

              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3 ml-2">সরঞ্জাম</h3>
              
              <button 
                onClick={() => { onOpenSettings(); onClose(); }}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl transition-colors text-white/60 active:scale-98"
              >
                <Database size={20} />
                <span className="font-medium text-sm">সেটিংস প্যানেল</span>
              </button>

              <button 
                onClick={() => { window.dispatchEvent(new CustomEvent('open-external-import')); onClose(); }}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl transition-colors text-white/60 active:scale-98"
              >
                <FileInput size={20} />
                <span className="font-medium text-sm">তথ্য আমদানি</span>
              </button>

              <button 
                onClick={() => { window.dispatchEvent(new CustomEvent('open-cloud-import')); onClose(); }}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl transition-colors text-white/60 active:scale-98"
              >
                <UploadCloud size={20} />
                <span className="font-medium text-sm">মেঘ-সংগ্রহস্থল</span>
              </button>

              <div className="h-px bg-white/5 my-4 mx-2" />

              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3 ml-2">সংগঠন</h3>

              <button 
                onClick={() => { onOpenTrash(); onClose(); }}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl transition-colors text-white/60 active:scale-98"
              >
                <Trash2 size={20} />
                <span className="font-medium text-sm">পুনরুদ্ধার বাক্স</span>
              </button>

              <div className="h-px bg-white/5 my-4 mx-2" />

              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3 ml-2">চেহারা</h3>

              <button 
                onClick={toggleTheme}
                className="w-full flex items-center justify-between gap-4 px-4 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white active:scale-98"
              >
                <div className="flex items-center gap-4">
                  {theme === 'dark' ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-yellow-400" />}
                  <span className="font-medium text-sm">{theme === 'dark' ? 'অন্ধকার মোড' : 'উজ্জ্বল মোড'}</span>
                </div>
                <div className={cn(
                  "w-10 h-5 rounded-full bg-white/10 relative transition-colors",
                  theme === 'dark' && "bg-blue-500"
                )}>
                  <div className={cn(
                    "absolute top-1 bottom-1 w-3 h-3 bg-white rounded-full transition-all",
                    theme === 'dark' ? "right-1" : "left-1"
                  )} />
                </div>
              </button>
            </div>

            <div className="mt-auto pt-8 flex flex-col gap-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[10px] text-white/20 leading-relaxed">
                App Version 2.0.4 - Premium Experience. Your data is encrypted and synced safely.
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
