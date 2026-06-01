import React from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Languages, History, FileText } from 'lucide-react';
import { Modal } from './Modal';
import { Note } from '../../services/storage/DataManager';

interface NoteInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  wordCount: number;
  charCount: number;
}

export function NoteInfoModal({ isOpen, onClose, note, wordCount, charCount }: NoteInfoModalProps) {
  if (!note) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="p-0 bg-transparent">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#111] border border-white/10 p-6 rounded-3xl w-[90vw] max-w-sm mx-auto shadow-2xl relative overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-bold mb-6 text-white pr-8">Note Information</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
            <div className="flex items-center gap-3 text-white/60">
              <Clock size={16} />
              <span className="text-sm font-medium">Created At</span>
            </div>
            <span className="text-sm font-bold text-white text-right">
              {new Date(note.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
            <div className="flex items-center gap-3 text-white/60">
              <History size={16} />
              <span className="text-sm font-medium">Last Modified</span>
            </div>
            <span className="text-sm font-bold text-white text-right">
              {note.updatedAt ? new Date(note.updatedAt).toLocaleString() : 'N/A'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white/5 rounded-2xl">
              <div className="flex items-center gap-2 text-white/40 mb-1">
                <Languages size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Words</span>
              </div>
              <p className="text-lg font-black text-white">{wordCount}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl">
              <div className="flex items-center gap-2 text-white/40 mb-1">
                <FileText size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Characters</span>
              </div>
              <p className="text-lg font-black text-white">{charCount}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
}
