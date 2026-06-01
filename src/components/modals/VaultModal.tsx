import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from './Modal';
import { Lock, Search, FileText, X } from 'lucide-react';
import { DataManager, Note } from '../../services/storage/DataManager';
import { useNavigate } from 'react-router-dom';
import { InputDialog } from './CustomDialogs';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VaultModal({ isOpen, onClose }: VaultModalProps) {
  const [lockedNotes, setLockedNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadLockedNotes();
      setSelectedNote(null);
      setShowPasswordPrompt(false);
      setError('');
    }
  }, [isOpen]);

  const loadLockedNotes = async () => {
    const allNotes = await DataManager.getAllNotes();
    setLockedNotes(allNotes.filter(n => n.isLocked && !n.isTrashed));
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setError('');
    setShowPasswordPrompt(true);
  };

  const handleUnlock = (password: string) => {
    if (selectedNote?.password === password) {
      setShowPasswordPrompt(false);
      onClose();
      navigate(`/editor/${selectedNote.id}`, { state: { authorized: true } });
    } else {
      setError('ভুল পাসওয়ার্ড (Incorrect password)');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="নিরাপদ ভল্ট (Secure Vault)" className="p-0">
        <div className="min-h-[40vh] py-6 px-4">
          <div className="space-y-4">
             {lockedNotes.length === 0 ? (
               <div className="text-center py-12">
                 <Lock className="mx-auto text-white/10 mb-4" size={48} />
                 <p className="text-white/40 font-bold">কোনো লক করা নোট পাওয়া যায়নি</p>
               </div>
             ) : (
               lockedNotes.map(note => (
                 <motion.button 
                    key={note.id}
                    onClick={() => handleNoteClick(note)}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center gap-4 transition-all text-left group"
                 >
                    <div className="text-3xl bg-black/20 p-2 rounded-xl group-hover:scale-110 transition-transform">{note.emoji || '📄'}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg truncate group-hover:text-blue-400 transition-colors">{note.title || 'শিরোনামহীন'}</h4>
                      <p className="text-xs text-white/40">{new Date(note.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <Lock size={16} className="text-white/20 group-hover:text-blue-500" />
                 </motion.button>
               ))
             )}
          </div>
        </div>
      </Modal>

      <InputDialog
        isOpen={showPasswordPrompt}
        onClose={() => setShowPasswordPrompt(false)}
        onConfirm={handleUnlock}
        title="নোট আনলক করুন"
        placeholder="পাসওয়ার্ড লিখুন..."
        type="password"
        confirmText="আনলক"
      />
      
      {/* Error notification */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl z-[9999]"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
