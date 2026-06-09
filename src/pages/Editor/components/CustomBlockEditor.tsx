/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, Square, MessageSquare, ChevronRight, Layout, Columns, Table as TableIcon, Bookmark, Plus
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { DataManager } from '../../../services/storage/DataManager';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

import { EditorBlock, cleanBlockHTML, htmlToBlocks, blocksToHtml } from '../../../utils/blockParser';
import { MediaBlock } from './blocks/MediaBlock';
import { SandboxBlock } from './blocks/SandboxBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { TableBlock } from './blocks/TableBlock';
import { EditableBlock } from './blocks/EditableBlock';
import { AudioGeneratorBlock } from './blocks/AudioGeneratorBlock';
import { BookmarkBlock } from './blocks/BookmarkBlock';
import { DatabaseBlock } from './blocks/DatabaseBlock';
import { EmbedBlock } from './blocks/EmbedBlock';

import { TocBlockRenderer } from '../renderers/TocBlockRenderer';
import { ColumnBlockRenderer } from '../renderers/ColumnBlockRenderer';
import { CalloutBlockRenderer } from '../renderers/CalloutBlockRenderer';

const LegacyBlockFallback: React.FC<{ block: EditorBlock }> = ({ block }) => {
  return (
    <div className="my-2 p-4 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col gap-2 group/legacy transition-all hover:bg-white/[0.04]">
      <div className="flex items-center justify-between opacity-40 group-hover/legacy:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Layout size={12} className="text-orange-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Legacy Block ({block.type})</span>
        </div>
        <span className="text-[9px] font-bold text-white/20 italic">Extension Inactive</span>
      </div>
      <div className="text-sm text-white/40 italic">
        This block was created by an extension that is currently inactive or uninstalled. Its data is preserved but only minimal rendering is available.
      </div>
      {block.content && (
        <div className="p-3 bg-black/20 rounded-xl text-xs font-mono text-white/30 truncate">
          {typeof block.content === 'object' ? JSON.stringify(block.content) : block.content}
        </div>
      )}
    </div>
  );
};

export { htmlToBlocks, blocksToHtml };

interface CustomBlockEditorProps {
  editor: any; // our custom controller object
  className?: string;
  blocksRefs?: React.MutableRefObject<Record<string, any>>;
}

// Add this before CustomBlockEditor component definition
const DynamicPageLink: React.FC<{ subPageId: string; defaultTitle: string; isReadOnly: boolean }> = ({ subPageId, defaultTitle, isReadOnly }) => {
  const [title, setTitle] = useState(defaultTitle || 'শিরোনামহীন');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const fetchTitle = async () => {
      try {
        const note = await DataManager.getNoteById(subPageId);
        if (note && active) {
          setTitle(note.title || 'শিরোনামহীন');
        }
      } catch (err) {
        console.error('Failed to resolve subpage title:', err);
      }
    };
    fetchTitle();

    window.addEventListener('workspace-notes-changed', fetchTitle);
    return () => {
      active = false;
      window.removeEventListener('workspace-notes-changed', fetchTitle);
    };
  }, [subPageId]);

  return (
    <button
      onClick={() => {
        if (isReadOnly) {
          navigate(`/editor/${subPageId}`, { state: { fromParent: true } });
        }
      }}
      className={cn(
        "text-sm font-bold text-blue-500 hover:text-blue-400 border-b border-dashed border-blue-500/50 pb-0.5 text-left transition-all",
        isReadOnly ? "cursor-pointer" : "cursor-default"
      )}
    >
      {title}
    </button>
  );
};

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
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const navigate = useNavigate();

  if (currentHiddenIndent !== null && (block.indent || 0) > currentHiddenIndent) {
    return null;
  }
  
  return (
    <div 
      className="flex flex-col group relative max-w-full overflow-hidden"
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
      {block.type === 'ordered' && (() => {
        let count = 1;
        const currentIndent = block.indent || 0;
        for (let k = idx - 1; k >= 0; k--) {
          const prevB = blocks[k];
          if (prevB && prevB.type === 'ordered' && (prevB.indent || 0) === currentIndent) {
            count++;
          } else {
            break;
          }
        }
        return (
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1 text-[13px] font-semibold text-gray-400">
            {count}.
          </div>
        );
      })()}

      {/* Side-specific block indicators and toggles will be here, content follows */}

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
        <ColumnBlockRenderer block={block} isReadOnly={isReadOnly} setBlocks={setBlocks} />
      ) : block.type === 'table_view' ? (
         <div className="flex-1 min-w-0 py-4 max-w-full overflow-hidden">
            <div className="p-10 bg-white/5 border border-white/10 rounded-[32px] flex flex-col items-center justify-center gap-4 text-center group/view cursor-pointer hover:bg-white/10 transition-all ring-1 ring-white/5 max-w-full overflow-hidden">
               <div className="w-16 h-16 bg-blue-500 rounded-[24px] flex items-center justify-center shadow-2xl shadow-blue-500/20 group-hover/view:scale-110 transition-transform">
                  <TableIcon className="text-white" />
               </div>
               <div>
                  <div className="text-sm font-black uppercase tracking-widest text-white/90">
                     Table View
                  </div>
                  <div className="text-[10px] text-white/40 font-bold mt-1">Click to configure database source</div>
               </div>
            </div>
         </div>
      ) : block.type === 'page_link' ? (
         block.subPageId ? (
           <div className="flex-1 min-w-0 py-2.5 flex items-center justify-between group/page bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl px-4 transition-all">
             <div className="flex items-center gap-2.5 min-w-0">
               <div className="w-5 h-5 flex items-center justify-center text-blue-400 shrink-0">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                 </svg>
               </div>
               
               <DynamicPageLink subPageId={block.subPageId} defaultTitle={block.content} isReadOnly={isReadOnly} />
             </div>

             {!isReadOnly && (
               <button
                 onClick={() => {
                   navigate(`/editor/${block.subPageId}`, { state: { fromParent: true } });
                 }}
                 className="text-[10px] font-black uppercase tracking-wider text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 py-1.5 px-3 rounded-lg opacity-0 group-hover/page:opacity-100 transition-all font-mono"
               >
                 Open Page
               </button>
             )}
           </div>
         ) : (
           <button 
              onClick={() => (window as any).editorEvents?.emit('createSubPage')}
              className="flex-1 min-w-0 py-2 group/page flex items-center gap-4 px-4 hover:bg-white/5 rounded-2xl transition-all text-left"
           >
              <div className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center group-hover/page:bg-blue-500/10 group-hover/page:border-blue-500/20 transition-all">
                 <Plus size={20} className="text-white/40 group-hover/page:text-blue-500 font-bold" />
              </div>
              <div className="flex flex-col items-start">
                 <div className="text-sm font-bold text-white/70 group-hover:text-white">Untitled Page</div>
                 <div className="text-[9px] text-white/20 uppercase tracking-widest font-black">Click to open or create</div>
              </div>
           </button>
         )
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
          setBlocks={setBlocks}
        />
      ) : block.type === 'sandbox' ? (
        <SandboxBlock block={block} handleBlockChange={handleBlockChange} isReadOnly={isReadOnly} />
      ) : block.type === 'audio_generator' ? (
        <AudioGeneratorBlock block={block} setBlocks={setBlocks} isReadOnly={isReadOnly} />
      ) : block.type === 'toc' ? (
        <TocBlockRenderer blocks={blocks} />
      ) : block.type === 'synced' ? (
        <div className="flex-1 flex flex-col p-4 bg-orange-500/[0.01] hover:bg-orange-500/[0.02] border border-orange-550/20 hover:border-orange-550/40 rounded-2xl text-left relative group/sync">
          <div className="absolute right-3 top-3 bg-orange-600/10 text-orange-400 border border-orange-550/20 rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider opacity-30 group-hover/sync:opacity-100 transition-opacity select-none flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
            Synced Block
          </div>
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
        </div>
      ) : ['toggle_h1', 'toggle_h2', 'toggle_h3'].includes(block.type) ? (
        <div className="flex-1 flex flex-col bg-transparent text-left">
          <div className="flex items-center gap-2 group/toggle">
            <button
              onClick={() => {
                setBlocks((prev: EditorBlock[]) => prev.map((b: EditorBlock) => b.id === block.id ? { ...b, isExpanded: !b.isExpanded } : b));
              }}
              className={cn(
                "mt-0.5 flex-shrink-0 text-gray-400 hover:text-white transition-all transform",
                block.isExpanded ? "rotate-90" : "rotate-0"
              )}
            >
              <ChevronRight size={18} />
            </button>
            <div className={cn(
              "flex-1",
              block.type === 'toggle_h1' ? "text-xl font-black text-white" : "",
              block.type === 'toggle_h2' ? "text-lg font-bold text-white/90" : "",
              block.type === 'toggle_h3' ? "text-base font-bold text-white/80" : ""
            )}>
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
            </div>
          </div>
        </div>
      ) : block.type === 'database' ? (
        <div className="flex-1 min-w-0">
          <DatabaseBlock block={block} setBlocks={setBlocks} isReadOnly={isReadOnly} />
        </div>
      ) : block.type === 'embed' ? (
        <div className="flex-1 min-w-0">
          <EmbedBlock block={block} setBlocks={setBlocks} isReadOnly={isReadOnly} />
        </div>
      ) : block.type === 'bookmark' ? (
        <BookmarkBlock block={block} setBlocks={setBlocks} isReadOnly={isReadOnly} />
      ) : block.type === 'callout' ? (
        <CalloutBlockRenderer
          block={block}
          idx={idx}
          isReadOnly={isReadOnly}
          blockRefs={blockRefs}
          handleKeyDown={handleKeyDown}
          setFocusedId={setFocusedId}
          editor={editor}
          handleBlockChange={handleBlockChange}
          setBlocks={setBlocks}
        />
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

export default function CustomBlockEditor({ editor, className, blocksRefs }: CustomBlockEditorProps) {
  const navigate = useNavigate();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const blocks = editor?.blocks || [];
  const setBlocks = editor?.setBlocks;
  const isReadOnly = editor?.isReadOnly;

  const defaultBlockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const blockRefs = blocksRefs || defaultBlockRefs;
  const lastActionRef = useRef<string>('');

  const handleBlockChange = (id: string, newContent: string) => {
    if (!setBlocks) return;
    
    // ==========================================
    // SECURE WEB WORKER & SANITIZATION GATEWAY
    // Input streams are ran through DOMPurify inside this gatekeeper.
    // To prevent mainthread lockouts or CPU/DOM flooding crashes from malicious input payloads,
    // this parsing/validation stream can be offloaded to a designated Web Worker.
    // Example:
    //   const sanitizerWorker = new Worker(new URL('./secure-sanitizer.worker.ts', import.meta.url));
    //   sanitizerWorker.postMessage({ id, content: newContent, type: ... });
    // ==========================================
    
    setBlocks((prev: EditorBlock[]) => {
      const blockToChange = prev.find((b: EditorBlock) => b.id === id);
      const cleaned = cleanBlockHTML(newContent, blockToChange?.type || 'paragraph');
      if (blockToChange && blockToChange.type === 'synced' && blockToChange.syncedBlockId) {
        const sid = blockToChange.syncedBlockId;
        return prev.map((b: EditorBlock) => (b.id === id || (b.type === 'synced' && b.syncedBlockId === sid)) ? { ...b, content: cleaned } : b);
      }
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
    } else if (e.key === 'Backspace' && block.type !== 'table' && blocks.length > 1) {
      const target = e.target as HTMLElement;
      const cleanText = target.innerHTML.replace(/<[^>]*>/g, '').trim();
      const isEmpty = cleanText === '' || cleanText === '&nbsp;' || !target.textContent?.trim();

      if (isEmpty) {
        // If indented, backspace decreases indent first
        if ((block.indent || 0) > 0) {
          e.preventDefault();
          handleBlockIndentChange(block.id, (block.indent || 0) - 1);
          return;
        }

        if (block.type !== 'paragraph') {
          e.preventDefault();
          target.innerHTML = ''; // reset element display
          handleBlockTypeChange(block.id, 'paragraph');
        } else {
          e.preventDefault();
          deleteBlock(block.id);
        }
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

  const handleAddNewParagraphAtEnd = () => {
    if (isReadOnly || !setBlocks) return;
    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock && lastBlock.content === '' && lastBlock.type === 'paragraph') {
      blockRefs.current[lastBlock.id]?.focus();
      return;
    }
    const newBlock: EditorBlock = {
      id: crypto.randomUUID(),
      type: 'paragraph',
      content: '',
      indent: 0
    };
    setBlocks((prev: EditorBlock[]) => [...prev, newBlock]);
    setTimeout(() => {
      blockRefs.current[newBlock.id]?.focus();
    }, 50);
  };

  return (
    <div className={cn("space-y-0 pb-12", className)}>
      {blocks.map((block: EditorBlock, idx: number) => {
        // If we are currently hiding blocks due to a parent toggle
        if (currentHiddenIndent !== null) {
          if ((block.indent || 0) > currentHiddenIndent) {
            return null; // Hide this block
          } else {
            currentHiddenIndent = null; // We've reached a block at the same or higher level
          }
        }

        // Check if this block is a collapsed toggle or toggle heading
        if (['toggle', 'toggle_h1', 'toggle_h2', 'toggle_h3'].includes(block.type) && !block.isExpanded) {
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

      {/* Notion-like click below to create new line */}
      {!isReadOnly && (
        <div 
          onClick={handleAddNewParagraphAtEnd}
          className="w-full min-h-[180px] cursor-text rounded-2xl border-2 border-dashed border-transparent hover:border-neutral-200/20 active:scale-[0.99] transition-all bg-transparent mt-4"
        />
      )}
    </div>
  );
}

