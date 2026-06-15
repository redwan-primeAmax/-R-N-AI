import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { DataManager } from '../../services/storage/DataManager';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  currentName: string;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  onClose,
  onRename,
  currentName
}) => {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName, isOpen]);

  const handleSubmit = () => {
    if (name.trim()) {
      onRename(name.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="নোট রিনেম করুন">
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">নতুন শিরোনাম</label>
          <input 
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="শিরোনাম লিখুন..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500/50 transition-all font-bold text-white placeholder:text-white/10"
          />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSubmit}
            className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-[11px] uppercase tracking-widest"
          >
            পরিবর্তন সেভ করুন
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/60 font-black rounded-2xl active:scale-95 transition-all text-[11px] uppercase tracking-widest"
          >
            বাতিল
          </button>
        </div>
      </div>
    </Modal>
  );
};
