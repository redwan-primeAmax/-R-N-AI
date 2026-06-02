/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Copy } from 'lucide-react';
import DOMPurify from 'dompurify';
import { EditorBlock } from '../../../../utils/blockParser';

interface CodeBlockProps {
  block: EditorBlock;
  isReadOnly: boolean;
  setFocusedId: (id: string | null) => void;
  editor: any;
  handleBlockChange: (id: string, content: string) => void;
}

export const CodeBlock = ({ block, isReadOnly, setFocusedId, editor, handleBlockChange }: CodeBlockProps) => {
  return (
    <div className="flex-1 border border-white/10 rounded-2xl overflow-hidden bg-[#111111] shadow-2xl text-left antialiased ring-1 ring-white/5">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/10">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{block.language || 'Code Block'}</span>
        <button
          onClick={() => {
            const temp = document.createElement('div');
            temp.innerHTML = block.content;
            navigator.clipboard.writeText(temp.textContent || temp.innerText || '');
          }}
          className="p-1 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
        >
          <Copy size={11} /> Copy Code
        </button>
      </div>
      <div
        contentEditable={!isReadOnly}
        suppressContentEditableWarning={true}
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
        className="w-full bg-transparent p-6 font-mono text-[13px] leading-relaxed text-blue-400 border-none outline-none focus:outline-none min-h-[140px] whitespace-pre-wrap selection:bg-blue-500/30"
        data-placeholder="// Paste your code block here..."
      />
    </div>
  );
};
