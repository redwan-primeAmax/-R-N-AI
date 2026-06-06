/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  List, ListOrdered, ListTodo, 
  Code, Quote, Table, 
  Plus, FilePlus, Mic, Bookmark, Layout, Info, AlignLeft, RefreshCw, Heading1, Heading2, Heading3, Database, ExternalLink
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { ListIcon, TodoIcon, PageIcon, TableIcon, MicIcon, BookmarkIcon, ToggleIcon } from '../svg/EditorIcons';
import { uploadAndInsertMedia } from '../services/mediaUploader';

interface PlusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  editor: any;
  isLight?: boolean;
  note?: any;
  onUploadStart?: () => void;
  onUploadComplete?: () => void;
}

export const PlusPanel: React.FC<PlusPanelProps> = ({ 
  isOpen, 
  onClose, 
  editor, 
  isLight = false, 
  note,
  onUploadStart,
  onUploadComplete
}) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!editor) return null;

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadAndInsertMedia({
      file,
      editor,
      noteId: note?.id || 'temp',
      workspaceId: note?.workspaceId || 'default',
      onStart: () => {
        if (onUploadStart) onUploadStart();
      },
      onComplete: () => {
        if (onUploadComplete) onUploadComplete();
        onClose();
      },
      onError: () => {
        if (onUploadComplete) onUploadComplete();
      }
    });
  };

  const categories = [
    {
      title: 'Lists (তালিকা)',
      items: [
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
      ]
    },
    {
      title: 'Blocks & Layouts (ব্লক ও বিন্যাস)',
      items: [
        { 
          label: 'Blockquote', 
          detail: 'Highlight a quote',
          icon: <Quote size={20} />, 
          action: () => editor.chain().focus().toggleBlockquote().run() 
        },
        { 
          label: 'Callout', 
          detail: 'Highlight text in a boxed structure',
          icon: <Info size={20} />, 
          action: () => (editor.chain().focus() as any).setCallout?.()
        },
        { 
          label: 'Column Layout', 
          detail: 'Editable side-by-side layout',
          icon: <Layout size={20} />, 
          action: () => (editor.chain().focus() as any).insertColumns?.()
        },
        { 
          label: 'Code Block', 
          detail: 'Code with syntax highlighting',
          icon: <Code size={20} />, 
          action: () => editor.chain().focus().toggleCodeBlock().run() 
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
      ]
    },
    {
      title: 'Bookmarks & Media (বুকমার্ক ও মিডিয়া)',
      items: [
        {
          label: 'Link (QuickClip)',
          detail: 'Web link bookmark preview',
          icon: <BookmarkIcon size={20} />,
          action: () => (editor.chain().focus() as any).runWebBookmark?.()
        },
        { 
          label: 'Audio Generator', 
          detail: 'Text to speech audio',
          icon: <MicIcon size={20} />, 
          action: () => (editor.chain().focus() as any).runAudioGenerator?.()
        },
        { 
          label: 'Image / File Upload', 
          detail: 'Upload document, images, audio',
          icon: <FilePlus size={20} />, 
          action: () => fileInputRef.current?.click()
        }
      ]
    },
    {
      title: 'Pages (পেজ লিংক)',
      items: [
        { 
          label: 'New Page', 
          detail: 'Link to a sub-page',
          icon: <PageIcon size={20} />, 
          action: () => (window as any).editorEvents?.emit('createSubPage')
        },
        { 
          label: 'Attach Page', 
          detail: 'Link an existing sub-page',
          icon: <FilePlus size={20} />, 
          action: () => (window as any).editorEvents?.emit('attachSubPage')
        },
      ]
    },
    {
      title: 'Advanced Layouts (অ্যাডভান্সড)',
      items: [
        {
          label: 'Table of Contents',
          detail: 'Dynamic index of all headers',
          icon: <AlignLeft size={20} />,
          action: () => (editor.chain().focus() as any).setToc?.()
        },
        {
          label: 'Synced Block',
          detail: 'Sync edits across multiple nodes',
          icon: <RefreshCw size={20} className="text-orange-400" />,
          action: () => (editor.chain().focus() as any).setSynced?.()
        },
        {
          label: 'Database Views',
          detail: 'Table, Kanban, Timeline, Calendar',
          icon: <Database size={20} className="text-purple-400" />,
          action: () => (editor.chain().focus() as any).insertDatabase?.()
        },
        {
          label: 'IFrame Embed',
          detail: 'Embed Figma, Slides, or raw Web links',
          icon: <ExternalLink size={20} className="text-blue-400" />,
          action: () => (editor.chain().focus() as any).insertEmbed?.()
        },
        {
          label: 'Toggle H1',
          detail: 'Header 1 with collapsible details',
          icon: <Heading1 size={20} className="text-purple-450" />,
          action: () => (editor.chain().focus() as any).toggleToggleHeading?.({ level: 1 })
        },
        {
          label: 'Toggle H2',
          detail: 'Header 2 with collapsible details',
          icon: <Heading2 size={20} className="text-purple-450" />,
          action: () => (editor.chain().focus() as any).toggleToggleHeading?.({ level: 2 })
        }
      ]
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
              "fixed bottom-0 left-0 right-0 z-[251] rounded-t-[32px] p-6 shadow-2xl h-[60vh] overflow-y-auto overscroll-contain no-scrollbar border-t",
              isLight ? "bg-white border-gray-100" : "bg-[#1a1a1a] border-white/5"
            )}
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-6 shrink-0" />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleMediaSelect} 
              className="hidden" 
              accept="*/*"
            />

            <div className="space-y-6">
              {categories.map((cat, catIdx) => (
                <div key={catIdx} className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-500/70 dark:text-blue-400/70 px-1 select-none">
                    {cat.title}
                  </div>
                  
                  {/* Category Option Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {cat.items.map((item, idx) => (
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
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
