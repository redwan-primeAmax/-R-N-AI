/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon } from 'lucide-react';
import { DataManager, Note } from '../../../services/storage/DataManager';
import { uploadAndInsertMedia } from '../services/mediaUploader';

// Import our modular block configs
import { textBlock } from '../blocks-config/TextBlock';
import { headingOneBlock } from '../blocks-config/HeadingOneBlock';
import { headingTwoBlock } from '../blocks-config/HeadingTwoBlock';
import { headingThreeBlock } from '../blocks-config/HeadingThreeBlock';
import { bulletListBlock } from '../blocks-config/BulletListBlock';
import { numberedListBlock } from '../blocks-config/NumberedListBlock';
import { todoListBlock } from '../blocks-config/TodoListBlock';
import { codeBlockConfig } from '../blocks-config/CodeBlockConfig';
import { quoteBlock } from '../blocks-config/QuoteBlock';
import { calloutBlock } from '../blocks-config/CalloutBlock';
import { sandboxBlockConfig } from '../blocks-config/SandboxBlockConfig';
import { dividerBlock } from '../blocks-config/DividerBlock';
import { tableBlockConfig } from '../blocks-config/TableBlockConfig';
import { createSubPageBlock } from '../blocks-config/CreateSubPageBlock';
import { attachPageBlock } from '../blocks-config/AttachPageBlock';
import { tocBlock } from '../blocks-config/TocBlock';
import { toggleHeadingOneBlock } from '../blocks-config/ToggleHeadingOneBlock';
import { toggleHeadingTwoBlock } from '../blocks-config/ToggleHeadingTwoBlock';
import { toggleHeadingThreeBlock } from '../blocks-config/ToggleHeadingThreeBlock';
import { toggleListBlock } from '../blocks-config/ToggleListBlock';
import { databaseBlockConfig } from '../blocks-config/DatabaseBlockConfig';

import { Palette, Box } from 'lucide-react';

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

  const blockConfigs = [
    textBlock,
    headingOneBlock,
    headingTwoBlock,
    headingThreeBlock,
    bulletListBlock,
    numberedListBlock,
    todoListBlock,
    codeBlockConfig,
    quoteBlock,
    calloutBlock,
    sandboxBlockConfig,
    dividerBlock,
    tableBlockConfig,
    createSubPageBlock,
    attachPageBlock,
    tocBlock,
    toggleHeadingOneBlock,
    toggleHeadingTwoBlock,
    toggleHeadingThreeBlock,
    toggleListBlock,
    databaseBlockConfig
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
            className="fixed bottom-0 left-0 right-0 bg-[#161616] border-t border-white/10 rounded-t-[32px] p-4 z-[251] shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
            <div className="mb-6">
              <div className="flex justify-end pr-6 mb-2">
                <h3 className="text-[9px] font-black text-white/15 uppercase tracking-[0.3em]">Basic Blocks</h3>
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                {blockConfigs.map((block, idx) => {
                  const Icon = block.icon;
                  return (
                    <button
                      key={`basic-${idx}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => { block.action(editor); onClose(); }}
                      className="flex items-center gap-3 py-2.5 px-2 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] group"
                    >
                      <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-white/30 group-hover:text-blue-400 group-hover:bg-blue-400/10 transition-colors shrink-0">
                        <Icon size={16} className={block.iconClass} />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-bold text-[13px] text-white/70 group-hover:text-white transition-colors truncate">{block.label}</div>
                        <div className="text-[9px] text-white/20 font-medium truncate">{block.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-8">
               <div className="flex justify-end pr-6 mb-2">
                 <h3 className="text-[9px] font-black text-white/15 uppercase tracking-[0.3em]">Advance</h3>
               </div>
               <div className="grid grid-cols-1 gap-0.5">
                 <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 py-2.5 px-2 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] group"
                  >
                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-white/30 group-hover:text-purple-400 group-hover:bg-purple-400/10 transition-colors shrink-0">
                      <ImageIcon size={16} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-bold text-[13px] text-white/70 group-hover:text-white transition-colors truncate">Image, Video or File</div>
                      <div className="text-[9px] text-white/20 font-medium truncate">Upload media content.</div>
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
                e.preventDefault();
              }}
              onPointerDown={(e) => {
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
