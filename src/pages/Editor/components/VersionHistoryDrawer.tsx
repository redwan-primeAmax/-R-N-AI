/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, RotateCcw, Clock, ArrowRight, FileText } from 'lucide-react';
import { DataManager } from '../../../services/storage/DataManager';
import { Note, NoteSnapshot } from '../../../types/note';
import { cn } from '../../../utils/cn';

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  onRestore: (snapshotContent: string) => void;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  note,
  onRestore
}) => {
  const [snapshots, setSnapshots] = useState<NoteSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<NoteSnapshot | null>(null);

  useEffect(() => {
    if (isOpen && note) {
      setSnapshots(note.snapshots || []);
      if (note.snapshots && note.snapshots.length > 0) {
        setSelectedSnapshot(note.snapshots[note.snapshots.length - 1]);
      }
    }
  }, [isOpen, note]);

  if (!isOpen) return null;

  const currentText = note.content ? note.content.replace(/<[^>]*>/g, '') : '';
  const selectedText = selectedSnapshot?.content ? selectedSnapshot.content.replace(/<[^>]*>/g, '') : '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex justify-end bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-[#19191a] h-full border-l border-white/10 flex flex-col text-white shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="text-amber-400 w-5 h-5" />
              <h3 className="font-bold text-sm">ভার্সন হিস্ট্রি (Version History)</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg cursor-pointer">
              <X size={18} className="text-white/50" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Snapshots Timeline */}
            <div>
              <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">সংরক্ষিত স্ন্যাপশটসমূহ</h4>
              {snapshots.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/30 border border-dashed border-white/10 rounded-xl">
                  কোনো হিস্ট্রি স্ন্যাপশট পাওয়া যায়নি
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snap) => (
                    <button
                      key={snap.id}
                      onClick={() => setSelectedSnapshot(snap)}
                      className={cn(
                        "w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer",
                        selectedSnapshot?.id === snap.id
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                          : "bg-white/5 border-white/5 hover:bg-white/10 text-white/70"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-amber-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">{new Date(snap.timestamp).toLocaleString()}</div>
                          <div className="text-[10px] text-white/40 truncate max-w-[200px]">
                            {snap.content.replace(/<[^>]*>/g, '').substring(0, 40)}...
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={14} className="opacity-40" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content Preview & Restore */}
            {selectedSnapshot && (
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/70">নির্বাচিত স্ন্যাপশটের প্রিভিউ</span>
                  <button
                    onClick={() => {
                      onRestore(selectedSnapshot.content);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>পুনরুদ্ধার করুন (Restore)</span>
                  </button>
                </div>

                <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-xs max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed text-white/80">
                  {selectedText}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
