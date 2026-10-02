/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { cn } from '../../../../utils/cn';
import { EditorBlock, cleanBlockHTML } from '../../../../utils/blockParser';

interface EditableBlockProps {
  block: EditorBlock;
  idx: number;
  isReadOnly: boolean;
  blockRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  handleKeyDown: (e: React.KeyboardEvent, block: EditorBlock, idx: number) => void;
  setFocusedId: (id: string | null) => void;
  editor: any;
  handleBlockChange: (id: string, content: string, immediate?: boolean) => void;
  searchTerm?: string;
}

export const EditableBlock = ({ 
  block, 
  idx, 
  isReadOnly, 
  blockRefs, 
  handleKeyDown, 
  setFocusedId, 
  editor, 
  handleBlockChange,
  searchTerm
}: EditableBlockProps) => {
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const localValRef = React.useRef<string | null>(null);
  const prevTypeRef = React.useRef<string>(block.type);

  // Sync state changes with the DOM element when content or block type changes
  React.useEffect(() => {
    if (localRef.current) {
      let contentToShow = block.content || '';
      
      // Apply search highlighting if searchTerm exists
      if (searchTerm && searchTerm.length >= 2) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        contentToShow = contentToShow.replace(regex, '<mark class="search-result">$1</mark>');
      }

      const sanitized = DOMPurify.sanitize(contentToShow);
      const typeChanged = prevTypeRef.current !== block.type;
      prevTypeRef.current = block.type;

      if (typeChanged || (localValRef.current !== block.content && localRef.current.innerHTML !== sanitized)) {
        localRef.current.innerHTML = sanitized;
        localValRef.current = block.content;
      }
    }
  }, [block.content, block.type, searchTerm]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    let rawHTML = e.currentTarget.innerHTML;
    // Strip wrapping block tags inside editable block to avoid nested <p><p>...</p></p>
    rawHTML = rawHTML.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '');
    localValRef.current = rawHTML;
    handleBlockChange(block.id, rawHTML, true);
  };

  // Step 4: Markdown parsing on paste
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const plainText = e.clipboardData.getData('text/plain');
    if (!plainText) return;

    const trimmed = plainText.trim();

    // Check for markdown headers or list formatting
    let newType: EditorBlock['type'] | null = null;
    let parsedContent = plainText;

    if (trimmed.startsWith('### ')) {
      newType = 'h3';
      parsedContent = trimmed.substring(4);
    } else if (trimmed.startsWith('## ')) {
      newType = 'h2';
      parsedContent = trimmed.substring(3);
    } else if (trimmed.startsWith('# ')) {
      newType = 'h1';
      parsedContent = trimmed.substring(2);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      newType = 'bullet';
      parsedContent = trimmed.substring(2);
    } else if (/^\d+\.\s/.test(trimmed)) {
      newType = 'ordered';
      parsedContent = trimmed.replace(/^\d+\.\s/, '');
    } else if (trimmed.startsWith('[ ] ')) {
      newType = 'todo';
      parsedContent = trimmed.substring(4);
    } else if (trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ')) {
      newType = 'todo';
      parsedContent = trimmed.substring(4);
    } else if (trimmed.startsWith('> ')) {
      newType = 'quote';
      parsedContent = trimmed.substring(2);
    }

    if (newType) {
      if (editor?.setBlocks) {
        editor.setBlocks((prev: EditorBlock[]) => 
          prev.map(b => b.id === block.id ? { ...b, type: newType, content: parsedContent, checked: trimmed.startsWith('[x] ') } : b)
        );
      }
    } else {
      // Normal plain text / HTML paste: insert plain text / inline HTML cleanly without <p>/<div> block wrapping
      const sanitizedInline = DOMPurify.sanitize(plainText.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>'), {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'span', 'br', 'mark', 'u', 's', 'del'],
        ALLOWED_ATTR: ['href', 'target', 'class', 'style']
      });
      document.execCommand('insertHTML', false, sanitizedInline);
    }
  };

  const isHighlighted = editor?.activeBlockId === block.id;

  return (
    <div 
      id={block.id}
      data-block-id={block.id}
      ref={(el) => { 
        blockRefs.current[block.id] = el; 
        localRef.current = el;
      }}
      contentEditable={!isReadOnly}
      suppressContentEditableWarning={true}
      onKeyDown={(e) => handleKeyDown(e, block, idx)}
      onInput={handleInput}
      onPaste={handlePaste}
      onFocus={() => {
        setFocusedId(block.id);
        if (editor?.setActiveBlockId) editor.setActiveBlockId(block.id);
      }}
      onBlur={(e: any) => {
        setFocusedId(null);
        if (editor?.setActiveBlockId) editor.setActiveBlockId(null);
        let cleaned = e.currentTarget.innerHTML;
        cleaned = cleaned.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '');
        handleBlockChange(block.id, cleaned, false);
      }}
      className={cn(
        "flex-1 text-left font-sans focus:outline-none placeholder:opacity-20 max-w-full overflow-hidden break-words transition-all duration-150 rounded-lg px-2 -mx-2",
        block.type === 'todo' ? "py-0 my-0 min-h-[24px]" : "min-h-[30px] py-0.5",
        isHighlighted && "bg-white/[0.04] dark:bg-white/[0.06] ring-1 ring-white/5",
        block.type === 'paragraph' && "text-[15px] sm:text-base leading-relaxed editor-p",
        block.type === 'h1' && "text-3xl sm:text-4xl font-black tracking-tight pt-2 editor-h break-words",
        block.type === 'h2' && "text-2xl sm:text-3xl font-black tracking-tight pt-2 editor-h break-words",
        block.type === 'h3' && "text-xl sm:text-2xl font-black tracking-tight pt-1 editor-h break-words",
        block.type === 'quote' && "border-l-[4px] border-neutral-400 dark:border-neutral-500 bg-neutral-100 dark:bg-neutral-800/80 pl-4 py-2.5 font-medium italic text-[15px] sm:text-base rounded-r-xl pr-4 text-neutral-800 dark:text-neutral-200 editor-quote leading-relaxed shadow-sm overflow-hidden break-words",
        block.type === 'callout' && "p-4 rounded-2xl border border-blue-500/10 leading-relaxed text-[15px] sm:text-base editor-callout overflow-hidden break-words",
        block.type === 'todo' && block.checked && "line-through editor-todo-checked opacity-60"
      )}
      data-placeholder=""
    />
  );
};
