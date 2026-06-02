/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  CheckSquare, Square, MessageSquare, ChevronRight, Layout, Columns, Table as TableIcon, Bookmark, Plus
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

// Add this before CustomBlockEditor component definition
const MemoizedBlockRow = React.memo(({ 
  block, 
  idx, 
  blocks,
  setBlocks,
  isReadOnly,
  blockRefs,
  handleKeyDown,
  setFocusedId,
  editor,
  handleBlockChange,
  hasIndent,
  indentStyle,
  currentHiddenIndent
}: any) => {
  if (currentHiddenIndent !== null && (block.indent || 0) > currentHiddenIndent) {
    return null;
  }
  
  return (
    <div 
      className="flex flex-col group relative"
      style={indentStyle}
    >
      {/* Visual connecting line for nested items */}
      {hasIndent && (
        <div 
          className="absolute left-[14px] top-0 bottom-0 w-[1px] bg-gray-100 dark:bg-white/5"
          style={{ left: `${((block.indent || 0) * 28) - 14}px` }}
        />
      )}

      <div className="flex items-start gap-1 justify-start antialiased rounded-none transition-none border-none group-hover:bg-white/[0.01]">
        <div className="absolute -left-7 top-[4px] w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-grab active:cursor-grabbing z-10">
           <div className="grid grid-cols-2 gap-0.5">
              {[1,2,3,4,5,6].map(i => <div key={i} className="w-0.5 h-0.5 bg-gray-300 dark:bg-white/20 rounded-full" />)}
           </div>
        </div>

        {/* Space for lists to keep them indented, but normal paragraphs will be flush left */}
        {['todo', 'bullet', 'ordered', 'toggle'].includes(block.type) && (
           <div className="w-1.5 flex-shrink-0" />
        )}
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

      {/* Toggle Type Icon */}
      {block.type === 'toggle' && (
        <button
          onClick={() => {
            setBlocks((prev: EditorBlock[]) => prev.map((b: EditorBlock) => b.id === block.id ? { ...b, isExpanded: !b.isExpanded } : b));
          }}
          className={cn(
            "mt-1 flex-shrink-0 text-gray-400 hover:text-white transition-all transform",
            block.isExpanded ? "rotate-90" : "rotate-0"
          )}
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Render Horizontal Rule (Divider) */}
      {block.type === 'hr' ? (
        <div className="w-full py-6 flex items-center justify-center self-center flex-1">
          <div className="w-full h-[1px] bg-gray-100 dark:bg-white/10" />
        </div>
      ) : block.type === 'column' ? (
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-4 py-4">
           <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-2 text-white/20 hover:text-white/40 hover:border-white/10 transition-all">
              <Columns size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest">Col 1</span>
           </div>
           <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-2 text-white/20 hover:text-white/40 hover:border-white/10 transition-all">
              <Columns size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest">Col 2</span>
           </div>
        </div>
      ) : block.type.includes('_view') ? (
         <div className="flex-1 min-w-0 py-4">
            <div className="p-10 bg-white/5 border border-white/10 rounded-[32px] flex flex-col items-center justify-center gap-4 text-center group/view cursor-pointer hover:bg-white/10 transition-all ring-1 ring-white/5">
               <div className="w-16 h-16 bg-blue-500 rounded-[24px] flex items-center justify-center shadow-2xl shadow-blue-500/20 group-hover/view:scale-110 transition-transform">
                  {block.type === 'table_view' && <TableIcon className="text-white" />}
                  {block.type === 'board_view' && <Layout className="text-white" />}
                  {block.type === 'gallery_view' && <Bookmark className="text-white" />}
               </div>
               <div>
                  <div className="text-sm font-black uppercase tracking-widest text-white/90">
                     {block.type.replace('_', ' ')}
                  </div>
                  <div className="text-[10px] text-white/40 font-bold mt-1">Click to configure database source</div>
               </div>
            </div>
         </div>
      ) : block.type === 'page_link' ? (
         <button 
            onClick={() => (window as any).editorEvents?.emit('createSubPage')}
            className="flex-1 min-w-0 py-2 group/page flex items-center gap-4 px-4 hover:bg-white/5 rounded-2xl transition-all"
         >
            <div className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center group-hover/page:bg-blue-500/10 group-hover/page:border-blue-500/20 transition-all">
               <Plus size={20} className="text-white/40 group-hover/page:text-blue-500" />
            </div>
            <div className="flex flex-col items-start">
               <div className="text-sm font-bold text-white/70 group-hover:text-white">Untitled Page</div>
               <div className="text-[9px] text-white/20 uppercase tracking-widest font-black">Click to open or create</div>
            </div>
         </button>
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
    </div>
  );
}, (prev, next) => {
  return prev.block === next.block && 
         prev.idx === next.idx && 
         prev.hasIndent === next.hasIndent && 
         prev.currentHiddenIndent === next.currentHiddenIndent &&
         prev.isReadOnly === next.isReadOnly;
});

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

    // Requirement: Nesting with Tab / Shift+Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      const currentIndent = block.indent || 0;
      if (e.shiftKey) {
        // Decrease indent
        if (currentIndent > 0) {
          handleBlockIndentChange(block.id, currentIndent - 1);
        }
      } else {
        // Increase indent (limit to 5 levels)
        if (currentIndent < 5) {
          handleBlockIndentChange(block.id, currentIndent + 1);
        }
      }
      return;
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
      
      // Requirement: Auto indent for new block
      addBlockAfter(block.id, isListType ? block.type : 'paragraph', block.indent || 0);
      lastActionRef.current = 'CreateBlock';
      return;
    } else if (e.key === 'Backspace' && block.content === '' && block.type !== 'table' && blocks.length > 1) {
      // If indented, backspace decreases indent first
      if ((block.indent || 0) > 0) {
        e.preventDefault();
        handleBlockIndentChange(block.id, (block.indent || 0) - 1);
        return;
      }

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

  const handleBlockIndentChange = (id: string, newIndent: number) => {
    if (!setBlocks) return;
    setBlocks((prev: EditorBlock[]) => prev.map((b: EditorBlock) => b.id === id ? { ...b, indent: newIndent } : b));
  };

  const addBlockAfter = (id: string, type: EditorBlock['type'] = 'paragraph', indent: number = 0) => {
    if (!setBlocks) return;
    const newBlock: EditorBlock = {
      id: crypto.randomUUID(),
      type: type,
      content: '',
      indent: indent
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

  // Visibility logic for toggles
  let currentHiddenIndent: number | null = null;

  return (
    <div className={cn("space-y-0 pb-24", className)}>
      {blocks.map((block: EditorBlock, idx: number) => {
        // If we are currently hiding blocks due to a parent toggle
        if (currentHiddenIndent !== null) {
          if ((block.indent || 0) > currentHiddenIndent) {
            return null; // Hide this block
          } else {
            currentHiddenIndent = null; // We've reached a block at the same or higher level
          }
        }

        // Check if this block is a collapsed toggle
        if (block.type === 'toggle' && !block.isExpanded) {
          currentHiddenIndent = block.indent || 0;
        }

        const hasIndent = (block.indent || 0) > 0;
        const indentStyle = { paddingLeft: `${(block.indent || 0) * 28}px` };

        return (
          <MemoizedBlockRow
            key={block.id}
            block={block}
            idx={idx}
            blocks={blocks}
            setBlocks={setBlocks}
            isReadOnly={isReadOnly}
            blockRefs={blockRefs}
            handleKeyDown={handleKeyDown}
            setFocusedId={setFocusedId}
            editor={editor}
            handleBlockChange={handleBlockChange}
            hasIndent={hasIndent}
            indentStyle={indentStyle}
            currentHiddenIndent={currentHiddenIndent}
          />
        );
      })}
    </div>
  );
}

