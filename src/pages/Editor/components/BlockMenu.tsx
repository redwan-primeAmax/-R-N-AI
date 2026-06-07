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
import { syncedBlock } from '../blocks-config/SyncedBlock';
import { toggleHeadingOneBlock } from '../blocks-config/ToggleHeadingOneBlock';
import { toggleHeadingTwoBlock } from '../blocks-config/ToggleHeadingTwoBlock';
import { toggleHeadingThreeBlock } from '../blocks-config/ToggleHeadingThreeBlock';
import { databaseBlockConfig } from '../blocks-config/DatabaseBlockConfig';
import { embedBlockConfig } from '../blocks-config/EmbedBlockConfig';

import { extensionManager } from '../../../services/ExtensionManager';
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
  const [extTools, setExtTools] = React.useState(extensionManager.getRegisteredTools());

  React.useEffect(() => {
    if (isOpen) {
      setExtTools(extensionManager.getRegisteredTools());
      const unsub = extensionManager.onChange(() => {
        setExtTools(extensionManager.getRegisteredTools());
      });
      return () => {
        unsub();
      };
    }
  }, [isOpen]);
  
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
    syncedBlock,
    toggleHeadingOneBlock,
    toggleHeadingTwoBlock,
    toggleHeadingThreeBlock,
    databaseBlockConfig,
    embedBlockConfig
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
                      className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] group"
                    >
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white/40 group-hover:text-blue-400 group-hover:bg-blue-400/10 transition-colors">
                        <Icon size={20} className={block.iconClass} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-[15px] text-white/80">{block.label}</div>
                        <div className="text-[11px] text-white/30 font-medium">{block.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {extTools.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.2em] mb-4">Extensions & Tools</h3>
                <div className="grid grid-cols-1 gap-2">
                  {extTools.map((tool) => (
                    <button
                      key={`menu-ext-${tool.id}-${tool.extensionId}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { 
                        if (tool.onClick) {
                          tool.onClick(editor);
                        } else {
                          editor.chain().focus().insertBlock(tool.id).run();
                        }
                        onClose(); 
                      }}
                      className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] group"
                    >
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white/40 group-hover:text-orange-400 group-hover:bg-orange-400/10 transition-colors font-bold text-lg">
                        {typeof tool.icon === 'string' ? tool.icon : <Box size={20} />}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-[15px] text-white/80">{tool.label || tool.name || tool.id}</div>
                        <div className="text-[11px] text-white/30 font-medium">{tool.description || 'Extension component'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8">
               <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.2em] mb-4">Advance</h3>
               <div className="grid grid-cols-1 gap-2">
                 <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onPointerDown={(e) => {
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
