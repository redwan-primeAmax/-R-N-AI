/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from './Modal';
import { Loader2 } from 'lucide-react';

interface UserNamePopupProps {
  onSave: (name: string, workspaceName: string) => void;
}

export const UserNamePopup = React.forwardRef<HTMLDivElement, UserNamePopupProps>(({ onSave }, ref) => {
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedWorkspace = workspaceName.trim();

    if (!trimmedName || !trimmedWorkspace) {
      setError('দয়া করে আপনার নাম এবং ওয়ার্কস্পেস নাম দিন।');
      return;
    }

    if (trimmedName.length < 2 || trimmedWorkspace.length < 2) {
      setError('নাম অন্তত ২ অক্ষরের হতে হবে।');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave(trimmedName, trimmedWorkspace);
    } catch (err) {
      setError('কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal ref={ref} isOpen={true} showCloseButton={false} id="setup-modal">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Redwan Assistant</h2>
          <p className="text-white/40 text-xs">অ্যাপটি পার্সোনালাইজ করতে আপনার তথ্য দিন।</p>
        </div>
        
        <div className="space-y-4">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-4" htmlFor="name-input">আপনার নাম</label>
            <input 
              id="name-input"
              type="text"
              placeholder="আপনার নাম..."
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold placeholder:text-white/20 dark:bg-white/5 bg-gray-100 dark:text-white text-gray-900 shadow-inner"
              disabled={isSubmitting}
              autoFocus
              aria-required="true"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-4" htmlFor="workspace-input">ওয়ার্কস্পেস নাম</label>
            <input 
              id="workspace-input"
              type="text"
              placeholder="ওয়ার্কস্পেস নাম..."
              value={workspaceName}
              maxLength={30}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold placeholder:text-white/20 dark:bg-white/5 bg-gray-100 dark:text-white text-gray-900 shadow-inner"
              disabled={isSubmitting}
              aria-required="true"
            />
          </div>

          <button 
            type="submit"
            disabled={!name.trim() || !workspaceName.trim() || isSubmitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            aria-label="Get Started"
            id="start-app-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              'Get Started (শুরু করুন)'
            )}
          </button>
          
          <button 
            type="button"
            onClick={() => onSave('Tester', 'My Workspace')}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/40 rounded-2xl font-bold text-xs transition-all uppercase tracking-widest border border-white/5"
          >
            Skip for now
          </button>
        </div>
      </form>
    </Modal>
  );
});
