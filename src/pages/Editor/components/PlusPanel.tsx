/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  List, ListOrdered, ListTodo, 
  Code, Quote, Table, 
  Plus, FilePlus, Mic, Bookmark, Layout
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { ListIcon, TodoIcon, PageIcon, TableIcon, MicIcon, BookmarkIcon, ToggleIcon } from '../svg/EditorIcons';

interface PlusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  editor: any;
  isLight?: boolean;
}

export const PlusPanel: React.FC<PlusPanelProps> = ({ isOpen, onClose, editor, isLight = false }) => {
  if (!editor) return null;

  const items = [
    { 
      label: 'Bullet List', 
      detail: 'Create a simple bulleted list',
      icon: <ListIcon size={24} />, 
      action: () => editor.chain().focus().toggleBulletList().run() 
    },
    { 
      label: 'Numbered List', 
      detail: 'Create a list with numbers',
      icon: <ListIcon size={24} className="rotate-0" />, // Simplified for consistency
      action: () => editor.chain().focus().toggleOrderedList().run() 
    },
    { 
      label: 'Todo List', 
      detail: 'Track tasks with checkboxes',
      icon: <TodoIcon size={24} />, 
      action: () => editor.chain().focus().toggleTaskList().run() 
    },
    { 
      label: 'Toggle List', 
      detail: 'Content that can be collapsed',
      icon: <ToggleIcon size={24} />, 
      action: () => editor.chain().focus().toggleBlockquote().run() 
    },
    { 
      label: 'Audio Generator', 
      detail: 'Turn text into speech audio',
      icon: <MicIcon size={24} />, 
      action: () => (editor.chain().focus() as any).runAudioGenerator?.()
    },
    { 
      label: 'QuickClip', 
      detail: 'Save a web link with preview',
      icon: <BookmarkIcon size={24} />, 
      action: () => (editor.chain().focus() as any).runWebBookmark?.()
    },
    { 
      label: 'Table', 
      detail: 'Information in a grid layout',
      icon: <TableIcon size={24} />, 
      action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run() 
    },
    { 
      label: 'New Page', 
      detail: 'Create a separate sub-page',
      icon: <PageIcon size={24} />, 
      action: () => (window as any).editorEvents?.emit('createSubPage')
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-[250]" 
          />
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[251] rounded-t-[32px] p-6 shadow-2xl h-[45vh] overflow-y-auto no-scrollbar border-t",
              isLight ? "bg-white border-gray-100" : "bg-[#181818] border-white/5"
            )}
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-6" />
            
            {/* Requirement 8: 2x1 Grid layout (interpreted as 2 columns) */}
            <div className="grid grid-cols-2 gap-4">
              {items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => { item.action(); onClose(); }}
                  className={cn(
                    "flex flex-col items-center justify-center p-5 rounded-3xl transition-all active:scale-95 text-center gap-3",
                    isLight ? "bg-gray-50 hover:bg-gray-100" : "bg-white/5 hover:bg-white/10"
                  )}
                >
                   <div className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center",
                     isLight ? "text-gray-900 bg-white shadow-sm" : "text-white bg-white/5"
                   )}>
                     {item.icon}
                   </div>
                   <div>
                     <div className={cn("text-[13px] font-bold", isLight ? "text-gray-900" : "text-white")}>{item.label}</div>
                     <div className="text-[10px] text-gray-400 dark:text-white/30 font-medium">{item.detail}</div>
                   </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
