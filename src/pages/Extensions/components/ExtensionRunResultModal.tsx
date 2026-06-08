
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Terminal } from 'lucide-react';

interface ExtensionRunResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  success: boolean;
  message: string;
  logs?: string[];
}

export function ExtensionRunResultModal({ isOpen, onClose, success, message, logs }: ExtensionRunResultModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className={`p-6 flex items-start gap-4 ${success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              {success ? (
                <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`text-lg font-bold ${success ? 'text-green-500' : 'text-red-500'}`}>
                  {success ? 'সফলভাবে রান হয়েছে' : 'রান হতে ব্যর্থ হয়েছে'}
                </h3>
                <p className="text-white/70 mt-1">{message}</p>
              </div>
              <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {logs && logs.length > 0 && (
              <div className="p-4 bg-black/40 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2 text-white/40 text-xs uppercase tracking-wider font-bold">
                  <Terminal className="w-3 h-3" /> Console Output
                </div>
                <div className="max-h-40 overflow-y-auto font-mono text-xs text-white/60 space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className="py-0.5 border-b border-white/5 last:border-0">{log}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-all"
              >
                বন্ধ করুন
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
