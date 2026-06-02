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
      detail: 'Simple bulleted list',
      icon: <ListIcon size={20} />, 
      action: () => editor.chain().focus().toggleBulletList().run() 
    },
    { 
      label: 'Numbered List', 
      detail: 'List with numbers',
      icon: <ListOrdered size={20} />, 
      action: () => editor.chain().focus().toggleOrderedList().run() 
    },
    { 
      label: 'Todo List', 
      detail: 'Checkboxes for tasks',
      icon: <TodoIcon size={20} />, 
      action: () => editor.chain().focus().toggleTaskList().run() 
    },
    { 
      label: 'Blockquote', 
      detail: 'Highlight a quote or callout',
      icon: <Quote size={20} />, 
      action: () => editor.chain().focus().toggleBlockquote().run() 
    },
    { 
      label: 'New Page', 
      detail: 'Link to a sub-page',
      icon: <PageIcon size={20} />, 
      action: () => (window as any).editorEvents?.emit('createSubPage')
    },
    {
      label: 'Link',
      detail: 'Web link attachment',
      icon: <BookmarkIcon size={20} />,
      action: () => {
        const url = window.prompt('Enter URL:');
        if (url) editor.chain().focus().setLink({ href: url }).run();
      }
    },
    { 
      label: 'Column Layout', 
      detail: 'Side-by-side layout',
      icon: <Layout size={20} />, 
      action: () => (editor.chain().focus() as any).insertColumns?.()
    },
    { 
      label: 'Code Block', 
      detail: 'Code with syntax highligting',
      icon: <Code size={20} />, 
      action: () => editor.chain().focus().toggleCodeBlock().run() 
    },
    { 
      label: 'Quote', 
      detail: 'Capture a quotation',
      icon: <Quote size={20} />, 
      action: () => editor.chain().focus().toggleBlockquote().run() 
    },
    { 
      label: 'Table', 
      detail: 'Simple grid for data',
      icon: <TableIcon size={20} />, 
      action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run() 
    },
    { 
      label: 'Divider', 
      detail: 'Visual line separator',
      icon: <Plus size={20} className="rotate-45" />, 
      action: () => editor.chain().focus().setHorizontalRule().run() 
    },
    { 
      label: 'Table View', 
      detail: 'Database table view',
      icon: <Table size={20} />, 
      action: () => (editor.chain().focus() as any).insertTableView?.()
    },
    { 
      label: 'Board View', 
      detail: 'Kanban board view',
      icon: <Layout size={20} className="rotate-90" />, 
      action: () => (editor.chain().focus() as any).insertBoardView?.()
    },
    { 
      label: 'Gallery View', 
      detail: 'Visual card view',
      icon: <BookmarkIcon size={20} />, 
      action: () => (editor.chain().focus() as any).insertGalleryView?.()
    },
    { 
      label: 'Audio Generator', 
      detail: 'Text to speech audio',
      icon: <MicIcon size={20} />, 
      action: () => (editor.chain().focus() as any).runAudioGenerator?.()
    },
    { 
      label: 'QuickClip', 
      detail: 'Save link with preview',
      icon: <BookmarkIcon size={20} />, 
      action: () => (editor.chain().focus() as any).runWebBookmark?.()
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
              isLight ? "bg-white border-gray-100" : "bg-[#1a1a1a] border-white/5"
            )}
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-6" />
            
            {/* Requirement 8: 2x1 Grid layout (interpreted as 2 columns) */}
            <div className="grid grid-cols-2 gap-3">
              {items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => { item.action(); onClose(); }}
                  className={cn(
                    "flex items-center p-3 rounded-2xl transition-all active:scale-95 text-left gap-3 border",
                    isLight ? "bg-gray-50 border-gray-100 hover:bg-gray-100" : "bg-white/5 border-white/5 hover:bg-white/10"
                  )}
                >
                   <div className={cn(
                     "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                     isLight ? "text-gray-900 bg-white shadow-sm" : "text-white bg-white/5"
                   )}>
                     {item.icon}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className={cn("text-[13px] font-bold truncate", isLight ? "text-gray-900" : "text-white")}>{item.label}</div>
                     <div className="text-[9px] text-gray-400 dark:text-white/30 font-medium truncate">{item.detail}</div>
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
