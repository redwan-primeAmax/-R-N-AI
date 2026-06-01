import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Modal } from './Modal';
import { Lock, Check } from 'lucide-react';
import { DataManager } from '../../services/storage/DataManager';

interface LockNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLock: (passwordKey: string) => void;
}

export function LockNoteModal({ isOpen, onClose, onLock }: LockNoteModalProps) {
  const [useDefault, setUseDefault] = useState(true);
  const [customPassword, setCustomPassword] = useState('');
  const [hasDefaultConfigured, setHasDefaultConfigured] = useState(false);

  useEffect(() => {
    if (isOpen) {
      DataManager.getUserPreferences().then(prefs => {
        if (prefs.defaultPassword) {
          setHasDefaultConfigured(true);
          setUseDefault(true);
        } else {
          setHasDefaultConfigured(false);
          setUseDefault(false);
        }
      });
      setCustomPassword('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (useDefault) {
      DataManager.getUserPreferences().then(prefs => {
        if (prefs.defaultPassword) {
          // Send plain text password; in a real app, hash it properly
          // Right now we just set passwordHash to the password 
          onLock(prefs.defaultPassword);
        }
      });
    } else {
      if (customPassword.trim()) {
        onLock(customPassword);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="নোট লক করুন">
      <div className="space-y-6 py-4">
        <div className="flex gap-4 p-4 bg-white/5 rounded-2xl">
          <Lock className="text-blue-400 mt-1" size={20} />
          <div>
            <h3 className="font-bold mb-1">পাসওয়ার্ড সেটআপ</h3>
            <p className="text-xs text-white/50">এই নোটটি গোপন রাখতে একটি পাসওয়ার্ড সেট করুন।</p>
          </div>
        </div>

        {hasDefaultConfigured && (
          <div className="flex items-center gap-3">
            <input 
              type="radio" 
              checked={useDefault} 
              onChange={() => setUseDefault(true)}
              id="radio-default"
              className="accent-blue-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="radio-default" className="text-sm font-medium cursor-pointer">ডিফল্ট পাসওয়ার্ড ব্যবহার করুন</label>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input 
            type="radio" 
            checked={!useDefault}
            onChange={() => setUseDefault(false)}
            id="radio-custom"
            className="accent-blue-500 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="radio-custom" className="text-sm font-medium cursor-pointer">নতুন পাসওয়ার্ড দিন</label>
        </div>

        {!useDefault && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
            <input 
              type="text" 
              placeholder="পাসওয়ার্ড প্রবেশ করান"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:border-blue-500 outline-none"
            />
          </motion.div>
        )}

        <button 
          onClick={handleConfirm}
          disabled={!useDefault && !customPassword.trim()}
          className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
        >
          <Check size={18} />
          লক কনফার্ম করুন
        </button>
      </div>
    </Modal>
  );
}
