import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from './Modal';
import { DataManager } from '../../services/storage/DataManager';
import { BookmarkFolder } from '../../types';
import { Folder, ChevronRight, Plus, Check } from 'lucide-react';

interface MoveToBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId?: string) => void;
  noteTitle: string;
}

export const MoveToBookmarkModal: React.FC<MoveToBookmarkModalProps> = ({
  isOpen,
  onClose,
  onMove,
  noteTitle
}) => {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<(string | undefined)[]>([]);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen, currentParentId]);

  const loadFolders = async () => {
    const all = await DataManager.getBookmarkFolders();
    setFolders(all.filter(f => f.parentId === currentParentId));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await DataManager.createBookmarkFolder(newFolderName.trim(), currentParentId);
    setNewFolderName('');
    setShowCreateInput(false);
    loadFolders();
  };

  const handleNavigate = (id: string) => {
    setHistory([...history, currentParentId]);
    setCurrentParentId(id);
  };

  const handleBack = () => {
    const prev = history.pop();
    setHistory([...history]);
    setCurrentParentId(prev);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="বুকমার্ক নির্বাচন">
      <div className="p-6">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1 mb-2">নোট: {noteTitle}</p>
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                {currentParentId && (
                  <button 
                    onClick={handleBack}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/60 hover:text-white"
                  >
                    পিছনে
                  </button>
                )}
                <span className="text-xs font-bold text-blue-400">
                  {currentParentId ? 'সাব-ফোল্ডার' : 'রুট ডিরেক্টরি'}
                </span>
             </div>
             <button 
                onClick={() => setShowCreateInput(!showCreateInput)}
                className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all"
             >
                <Plus size={18} />
             </button>
          </div>

          <AnimatePresence>
             {showCreateInput && (
                <motion.div 
                   initial={{ opacity: 0, y: -10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="mb-4 flex gap-2"
                >
                   <input 
                      autoFocus
                      type="text"
                      placeholder="ফোল্ডারের নাম..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                   />
                   <button 
                      onClick={handleCreateFolder}
                      className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-bold text-white"
                   >
                      তৈরি
                   </button>
                </motion.div>
             )}
          </AnimatePresence>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar mb-6">
          {folders.length > 0 ? (
            folders.map(folder => (
              <div 
                key={folder.id}
                className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl group hover:bg-white/[0.05] hover:border-blue-500/30 transition-all cursor-pointer"
                onClick={() => handleNavigate(folder.id)}
              >
                <div className="flex items-center gap-4">
                  <Folder size={20} className="text-blue-500/60" />
                  <span className="font-bold text-sm text-white/80">{folder.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(folder.id);
                    }}
                    className="px-4 py-2 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-90 transition-all"
                  >
                    Select
                  </button>
                  <ChevronRight size={16} className="text-white/10" />
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-white/10 italic text-xs">এই ডিরেক্টরিতে কোনো ফোল্ডার নেই</div>
          )}
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => onMove(currentParentId)}
            className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white/60 transition-all active:scale-95"
          >
            এখানে সেট করুন
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest text-red-500 transition-all active:scale-95"
          >
            বাতিল
          </button>
        </div>
      </div>
    </Modal>
  );
};
