/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import React, { useState } from 'react';
import { m as motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { Note, DataManager } from '../../../services/storage/DataManager';

interface EditorLockScreenProps {
  note: Note;
  isLight: boolean;
  setIsUnlocked: (unlocked: boolean) => void;
  onUnlocked: () => Promise<void>;
  navigate: any;
  notification: { message: string; type: 'info' | 'success' | 'error' } | null;
  setNotification: (notif: { message: string; type: 'info' | 'success' | 'error' } | null) => void;
}

export const EditorLockScreen: React.FC<EditorLockScreenProps> = ({
  note,
  isLight,
  setIsUnlocked,
  onUnlocked,
  navigate,
  notification,
  setNotification,
}) => {
  const [passwordInput, setPasswordInput] = useState('');

  const handleAuthSubmit = async () => {
    const trimmedInput = passwordInput.trim();
    if (!trimmedInput) return;

    try {
      if (await DataManager.authorizeNote(note.id, passwordInput)) {
        await onUnlocked();
        setIsUnlocked(true);
        setPasswordInput('');
      } else {
        setNotification({ message: 'ভুল পাসওয়ার্ড!', type: 'error' });
      }
    } catch {
      setNotification({ message: 'নোট আনলক করা যায়নি। আবার চেষ্টা করুন।', type: 'error' });
    }

  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center transition-colors duration-300 p-6",
      isLight ? "bg-gray-100 text-gray-900" : "bg-[#121212] text-white"
    )}>
      <div className="w-full max-w-md bg-[#191919] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mx-auto">
          <Lock size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black font-display tracking-tight text-white animate-fade-in">নোটটি লক করা আছে (Locked Node)</h2>
          <p className="text-xs text-white/40 font-bold uppercase tracking-wider">এই নোটের বিষয়বস্তু দেখতে পাসওয়ার্ড প্রবেশ করুন</p>
        </div>

        <div className="space-y-4 text-left">
          <input
            type="password" aria-label="নোটের পাসওয়ার্ড"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="পাসওয়ার্ড লিখুন..."
            onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-mono focus:border-blue-500 outline-none placeholder:text-white/20 text-center text-white"
            autoFocus
          />

          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all text-white/80 active:scale-95"
            >
              ফিরে যান (Back)
            </button>
            <button
              onClick={handleAuthSubmit}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all text-white active:scale-95 shadow-lg shadow-blue-500/20"
            >
              আনলক (Unlock)
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 20, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-6 py-3.5 rounded-full bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-xl"
        >
          {notification.message}
        </motion.div>
      )}
    </div>
  );
};
