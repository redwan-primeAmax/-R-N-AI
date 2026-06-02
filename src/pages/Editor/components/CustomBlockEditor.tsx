/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  CheckSquare, Square, MessageSquare
} from 'lucide-react';
import { cn } from '../../../utils/cn';

import { EditorBlock, cleanBlockHTML, htmlToBlocks, blocksToHtml } from '../../../utils/blockParser';
import { MediaBlock } from './blocks/MediaBlock';
import { SandboxBlock } from './blocks/SandboxBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { TableBlock } from './blocks/TableBlock';
import { EditableBlock } from './blocks/EditableBlock';
import { AudioGeneratorBlock } from './blocks/AudioGeneratorBlock';
import { BookmarkBlock } from './blocks/BookmarkBlock';

export { htmlToBlocks, blocksToHtml };

interface CustomBlockEditorProps {
  editor: any; // our custom controller object
  className?: string;
}

export default function CustomBlockEditor({ editor, className }: CustomBlockEditorProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const blocks = editor?.blocks || [];
  const setBlocks = editor?.setBlocks;
  const isReadOnly = editor?.isReadOnly;

  const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const lastActionRef = useRef<string>('');

  const handleBlockChange = (id: string, newContent: string) => {
    if (!setBlocks) return;
    setBlocks((prev: EditorBlock[]) => {
      const blockToChange = prev.find((b: EditorBlock) => b.id === id);
      const cleaned = cleanBlockHTML(newContent, blockToChange?.type || 'paragraph');
      return prev.map((b: EditorBlock) => b.id === id ? { ...b, content: cleaned } : b);
    });
  };

  const handleBlockTypeChange = (id: string, newType: EditorBlock['type']) => {
    if (!setBlocks) return;
    setBlocks((prev: EditorBlock[]) => prev.map((b: EditorBlock) => b.id === id ? { ...b, type: newType } : b));
  };

  const deleteBlock = (id: string) => {
    if (!setBlocks) return;
    setBlocks((prev: EditorBlock[]) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((b: EditorBlock) => b.id === id);
      const updated = prev.filter((b: EditorBlock) => b.id !== id);
      
      // Move focus to previous block
      setTimeout(() => {
        const prevBlock = updated[idx - 1] || updated[idx];
        if (prevBlock) {
          blockRefs.current[prevBlock.id]?.focus();
        }
      }, 50);
      
      return updated;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, block: EditorBlock, idx: number) => {
    if (e.key !== 'Enter') {
      lastActionRef.current = e.key;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.type === 'code') {
         e.preventDefault();
         document.execCommand('insertText', false, '\n');
         return;
      }

      if (block.type === 'table') {
         return;
      }

      e.preventDefault();
      const target = e.target as HTMLElement;
      const html = target.innerHTML.trim();
      const isListType = block.type === 'todo' || block.type === 'bullet' || block.type === 'ordered';

      // Requirement 12: Enter twice on empty list or Backspace -> Revert to paragraph
      if (isListType && (html === '' || html === '<br>' || html === '&nbsp;')) {
        handleBlockTypeChange(block.id, 'paragraph');
        lastActionRef.current = 'RevertToParagraph';
        return;
      }
      
      // Requirement 11: Auto new item for list
      if (isListType) {
        addBlockAfter(block.id, block.type);
      } else {
        addBlockAfter(block.id, 'paragraph');
      }
      lastActionRef.current = 'CreateBlock';
      return;
    } else if (e.key === 'Backspace' && block.content === '' && block.type !== 'table' && blocks.length > 1) {
      // Requirement 12: Backspace on empty block reverts to paragraph if it was something else, or deletes
      if (block.type !== 'paragraph') {
        e.preventDefault();
        handleBlockTypeChange(block.id, 'paragraph');
      } else {
        e.preventDefault();
        deleteBlock(block.id);
      }
    } else if (e.key === 'ArrowUp') {
      const prev = blocks[idx - 1];
      if (prev) {
        e.preventDefault();
        blockRefs.current[prev.id]?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      const next = blocks[idx + 1];
      if (next) {
        e.preventDefault();
        blockRefs.current[next.id]?.focus();
      }
    }
  };

  const addBlockAfter = (id: string, type: EditorBlock['type'] = 'paragraph') => {
    if (!setBlocks) return;
    const newBlock: EditorBlock = {
      id: crypto.randomUUID(),
      type: type,
      content: ''
    };
    
    setBlocks((prev: EditorBlock[]) => {
      const idx = prev.findIndex((b: EditorBlock) => b.id === id);
      const updated = [...prev];
      updated.splice(idx + 1, 0, newBlock);
      return updated;
    });

    setTimeout(() => {
      blockRefs.current[newBlock.id]?.focus();
    }, 50);
  };

  return (
    <div className={cn("space-y-0 pb-24", className)}>
      {blocks.map((block: EditorBlock, idx: number) => {
        return (
          <div 
            key={block.id} 
            className="flex items-start gap-3 relative justify-start antialiased rounded-none transition-none border-none group"
          >
            {/* Todo Type Icon */}
            {block.type === 'todo' && (
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setBlocks((prev: EditorBlock[]) => prev.map((b: EditorBlock) => b.id === block.id ? { ...b, checked: !b.checked } : b));
                }}
                className="mt-1 flex-shrink-0 text-blue-500 hover:text-blue-400 transition-colors"
              >
                {block.checked ? (
                  <CheckSquare size={19} className="text-blue-500 fill-blue-500/10" />
                ) : (
                  <Square size={19} className="editor-todo-box text-gray-300 dark:text-white/10" />
                )}
              </button>
            )}

            {/* Bullet Type Dot */}
            {block.type === 'bullet' && (
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-gray-400 dark:bg-white/40 rounded-full" />
              </div>
            )}

            {/* Ordered Type Digit */}
            {block.type === 'ordered' && (
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1 text-[13px] font-medium text-gray-400">
                {idx + 1}.
              </div>
            )}

            {/* Special Callout Header Area */}
            {block.type === 'callout' && (
              <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-500 mt-1">
                <MessageSquare size={18} />
              </div>
            )}

            {/* Render Horizontal Rule (Divider) */}
            {block.type === 'hr' ? (
              <div className="w-full py-4 flex items-center justify-center self-center flex-1">
                <div className="w-full h-[1px] bg-gray-100 dark:bg-white/5" />
              </div>
            ) : block.type === 'media' ? (
              <div className="flex-1 min-w-0">
                <MediaBlock block={block} blocks={blocks} setBlocks={setBlocks} />
              </div>
            ) : block.type === 'table' ? (
              <TableBlock block={block} isReadOnly={isReadOnly} setBlocks={setBlocks} />
            ) : block.type === 'code' ? (
              <CodeBlock 
                block={block} 
                isReadOnly={isReadOnly} 
                setFocusedId={setFocusedId} 
                editor={editor} 
                handleBlockChange={handleBlockChange} 
              />
            ) : block.type === 'sandbox' ? (
              <SandboxBlock block={block} handleBlockChange={handleBlockChange} isReadOnly={isReadOnly} />
            ) : block.type === 'audio_generator' ? (
              <AudioGeneratorBlock block={block} setBlocks={setBlocks} isReadOnly={isReadOnly} />
            ) : block.type === 'bookmark' ? (
              <BookmarkBlock block={block} setBlocks={setBlocks} isReadOnly={isReadOnly} />
            ) : (
              <EditableBlock 
                block={block}
                idx={idx}
                isReadOnly={isReadOnly}
                blockRefs={blockRefs}
                handleKeyDown={handleKeyDown}
                setFocusedId={setFocusedId}
                editor={editor}
                handleBlockChange={handleBlockChange}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

