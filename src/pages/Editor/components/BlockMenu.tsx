/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heading1, Heading2, Heading3, List, ListOrdered, ListTodo, 
  Code, Quote, ImageIcon, Minus, Table, 
  Type, MessageSquare, Mic, Hash, Plus, FilePlus, Database, RefreshCw, ExternalLink, AlignLeft
} from 'lucide-react';
import { DataManager, Note } from '../../../services/storage/DataManager';
import { uploadAndInsertMedia } from '../services/mediaUploader';
import { cn } from '../../../utils/cn';

interface BlockMenuProps {
  isOpen: boolean;
  onClose: () => void;
  editor: any;
  noteRef: React.MutableRefObject<Note | null>;
  onUploadStart?: () => void;
  onUploadComplete?: () => void;
}

export const BlockMenu: React.FC<BlockMenuProps> = ({ 
  isOpen, 
  onClose, 
  editor, 
  noteRef,
  onUploadStart,
  onUploadComplete
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (!editor) return null;

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadAndInsertMedia({
      file,
      editor,
      noteId: noteRef.current?.id || 'temp',
      workspaceId: noteRef.current?.workspaceId || 'default',
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

  const blocks = [
    { 
      label: 'Text', 
      icon: <Type size={20} />, 
      action: () => editor.chain().focus().setParagraph().run(),
      description: 'Just start writing with plain text.'
    },
    { 
      label: 'Heading 1', 
      icon: <Heading1 size={20} />, 
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      description: 'Big section heading.'
    },
    { 
      label: 'Heading 2', 
      icon: <Heading2 size={20} />, 
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      description: 'Medium section heading.'
    },
    { 
      label: 'Heading 3', 
      icon: <Heading3 size={20} />, 
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      description: 'Smaller section heading.'
    },
    { 
      label: 'Bullet List', 
      icon: <List size={20} />, 
      action: () => editor.chain().focus().toggleBulletList().run(),
      description: 'Simple bulleted list.'
    },
    { 
      label: 'Numbered List', 
      icon: <ListOrdered size={20} />, 
      action: () => editor.chain().focus().toggleOrderedList().run(),
      description: 'Sequential ordered list.'
    },
    { 
      label: 'Todo List', 
      icon: <ListTodo size={20} />, 
      action: () => editor.chain().focus().toggleTaskList().run(),
      description: 'Track tasks with checkboxes.'
    },
    { 
      label: 'Code Block', 
      icon: <Code size={20} />, 
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      description: 'Syntax highlighted code.'
    },
    { 
      label: 'Quote', 
      icon: <Quote size={20} />, 
      action: () => editor.chain().focus().toggleBlockquote().run(),
      description: 'Capture a quotation.'
    },
    { 
      label: 'Callout', 
      icon: <MessageSquare size={20} />, 
      action: () => (editor.chain().focus() as any).setCallout().run(),
      description: 'Make text stand out.'
    },
    { 
      label: 'Interactive Code Sandbox', 
      icon: <Code size={20} className="text-[#00E5FF]" />, 
      action: () => (editor.chain().focus() as any).setSandbox().run(),
      description: 'Write raw HTML/JS/CSS and execute it inside an isolated iframe.'
    },
    { 
      label: 'Divider', 
      icon: <Minus size={20} />, 
      action: () => editor.chain().focus().setHorizontalRule().run(),
      description: 'Visually divide sections.'
    },
    { 
      label: 'Table', 
      icon: <Table size={20} />, 
      action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      description: 'Grid based information.'
    },
    { 
      label: 'Create Sub Page', 
      icon: <Plus size={20} />, 
      action: () => (window as any).editorEvents?.emit('createSubPage'),
      description: 'Create a new linked sub-page.'
    },
    { 
      label: 'Attach Page', 
      icon: <FilePlus size={20} />, 
      action: () => (window as any).editorEvents?.emit('attachSubPage'),
      description: 'Link an existing page as sub-page.'
    },
    { 
      label: 'Table of Contents', 
      icon: <AlignLeft size={20} />, 
      action: () => (editor.chain().focus() as any).setToc().run(),
      description: 'Dynamic heading-based summary list.'
    },
    { 
      label: 'Synced Block', 
      icon: <RefreshCw size={20} className="text-orange-400" />, 
      action: () => (editor.chain().focus() as any).setSynced().run(),
      description: 'Sync edits across document scopes in real-time.'
    },
    { 
      label: 'Toggle Heading 1', 
      icon: <Heading1 size={20} className="text-purple-400" />, 
      action: () => (editor.chain().focus() as any).toggleToggleHeading({ level: 1 }).run(),
      description: 'H1 section with collapsible child nodes.'
    },
    { 
      label: 'Toggle Heading 2', 
      icon: <Heading2 size={20} className="text-purple-400" />, 
      action: () => (editor.chain().focus() as any).toggleToggleHeading({ level: 2 }).run(),
      description: 'H2 section with collapsible child nodes.'
    },
    { 
      label: 'Toggle Heading 3', 
      icon: <Heading3 size={20} className="text-purple-400" />, 
      action: () => (editor.chain().focus() as any).toggleToggleHeading({ level: 3 }).run(),
      description: 'H3 section with collapsible child nodes.'
    },
    {
      label: 'Interactive Database Views',
      icon: <Database size={20} className="text-purple-500" />,
      action: () => (editor.chain().focus() as any).insertDatabase().run(),
      description: 'Fully responsive table, timeline, kanban, or calendar views.'
    },
    {
      label: 'Embed Link integration',
      icon: <ExternalLink size={20} className="text-blue-400" />,
      action: () => (editor.chain().focus() as any).insertEmbed().run(),
      description: 'Embed Figma, Google Drive documents, or raw web links.'
    },
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250]" 
          />
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-[#161616] border-t border-white/10 rounded-t-[32px] p-6 z-[251] shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
            <div className="mb-6">
              <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.2em] mb-4">Basic Blocks</h3>
              <div className="grid grid-cols-1 gap-2">
                {blocks.map((block, idx) => (
                  <button
                    key={idx}
                    onMouseDown={(e) => {
                      // Prevent focus loss/keyboard closing
                      e.preventDefault();
                    }}
                    onPointerDown={(e) => {
                      // Prevent focus loss/keyboard closing
                      e.preventDefault();
                    }}
                    onClick={() => { block.action(); onClose(); }}
                    className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] group"
                  >
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white/40 group-hover:text-blue-400 group-hover:bg-blue-400/10 transition-colors">
                      {block.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-[15px] text-white/80">{block.label}</div>
                      <div className="text-[11px] text-white/30 font-medium">{block.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
               <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.2em] mb-4">Advance</h3>
               <div className="grid grid-cols-1 gap-2">
                 <button
                    onMouseDown={(e) => {
                      // Prevent focus loss/keyboard closing
                      e.preventDefault();
                    }}
                    onPointerDown={(e) => {
                      // Prevent focus loss/keyboard closing
                      e.preventDefault();
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] group"
                  >
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white/40 group-hover:text-purple-400 group-hover:bg-purple-400/10 transition-colors">
                      <ImageIcon size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-[15px] text-white/80">Image, Video or File</div>
                      <div className="text-[11px] text-white/30 font-medium">Upload media content.</div>
                    </div>
                  </button>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleMediaSelect}
                    accept=".png,.jpg,.jpeg,.gif,.svg,.mp4,.webm,.ogg,.mp3,.wav,.pdf,.txt,.json"
                  />
               </div>
            </div>

            <button 
              onMouseDown={(e) => {
                // Prevent focus loss/keyboard closing
                e.preventDefault();
              }}
              onPointerDown={(e) => {
                // Prevent focus loss/keyboard closing
                e.preventDefault();
              }}
              onClick={onClose}
              className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all text-white/40"
            >
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
