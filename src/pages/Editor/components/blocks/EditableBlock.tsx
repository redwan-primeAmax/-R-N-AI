/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { cn } from '../../../../utils/cn';
import { EditorBlock } from '../../../../utils/blockParser';

interface EditableBlockProps {
  block: EditorBlock;
  idx: number;
  isReadOnly: boolean;
  blockRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  handleKeyDown: (e: React.KeyboardEvent, block: EditorBlock, idx: number) => void;
  setFocusedId: (id: string | null) => void;
  editor: any;
  handleBlockChange: (id: string, content: string) => void;
}

export const EditableBlock = ({ 
  block, 
  idx, 
  isReadOnly, 
  blockRefs, 
  handleKeyDown, 
  setFocusedId, 
  editor, 
  handleBlockChange 
}: EditableBlockProps) => {
  return (
    <div 
      id={block.id}
      data-block-id={block.id}
      ref={(el) => { blockRefs.current[block.id] = el; }}
      contentEditable={!isReadOnly}
      suppressContentEditableWarning={true}
      onKeyDown={(e) => handleKeyDown(e, block, idx)}
      onFocus={() => {
        setFocusedId(block.id);
        if (editor.setActiveBlockId) editor.setActiveBlockId(block.id);
      }}
      onBlur={(e: any) => {
        setFocusedId(null);
        if (editor.setActiveBlockId) editor.setActiveBlockId(null);
        handleBlockChange(block.id, e.currentTarget.innerHTML);
      }}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }}
      className={cn(
        "flex-1 text-left min-h-[30px] font-sans focus:outline-none placeholder:opacity-20",
        block.type === 'paragraph' && "text-[15px] sm:text-base leading-relaxed editor-p",
        block.type === 'h1' && "text-3xl sm:text-4xl font-black tracking-tight pt-2 editor-h",
        block.type === 'h2' && "text-2xl sm:text-3xl font-black tracking-tight pt-2 editor-h",
        block.type === 'h3' && "text-xl sm:text-2xl font-black tracking-tight pt-1 editor-h",
        block.type === 'quote' && "border-l-4 border-blue-500 pl-4 py-1 italic text-[15px] sm:text-base rounded-r-xl pr-4 editor-quote",
        block.type === 'callout' && "p-4 rounded-2xl border border-blue-500/10 leading-relaxed text-[15px] sm:text-base editor-callout",
        block.type === 'todo' && block.checked && "line-through editor-todo-checked"
      )}
      data-placeholder=""
    />
  );
};
