/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Copy, ChevronDown, Check } from 'lucide-react';
import DOMPurify from 'dompurify';
import { EditorBlock } from '../../../../utils/blockParser';
import { cn } from '../../../../utils/cn';
import languagesText from '../../data/languages.txt?raw';

interface CodeBlockProps {
  block: EditorBlock;
  isReadOnly: boolean;
  setFocusedId: (id: string | null) => void;
  editor: any;
  handleBlockChange: (id: string, content: string) => void;
  setBlocks?: React.Dispatch<React.SetStateAction<EditorBlock[]>>;
}

export const CodeBlock = ({ 
  block, 
  isReadOnly, 
  setFocusedId, 
  editor, 
  handleBlockChange,
  setBlocks
}: CodeBlockProps) => {
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const localValRef = React.useRef<string | null>(null);
  const [showPicker, setShowPicker] = React.useState(false);

  const languagesList = React.useMemo(() => {
    try {
      return languagesText.split('\n').map(l => l.trim()).filter(Boolean);
    } catch (e) {
      return ['CSS', 'Javascript', 'Typescript', 'Python', 'HTML'];
    }
  }, []);

  // Sync state changes with the DOM element only if they differ
  React.useEffect(() => {
    if (localRef.current) {
      const sanitized = DOMPurify.sanitize(block.content);
      if (localValRef.current !== block.content && localRef.current.innerHTML !== sanitized) {
        localRef.current.innerHTML = sanitized;
        localValRef.current = block.content;
      }
    }
  }, [block.content]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const rawHTML = e.currentTarget.innerHTML;
    localValRef.current = rawHTML;
    handleBlockChange(block.id, rawHTML);
  };

  const currentLang = (block.language || 'CSS').toUpperCase();

  const handleSelectLanguage = (lang: string) => {
    if (setBlocks) {
      setBlocks((prev: EditorBlock[]) => 
        prev.map((b: EditorBlock) => b.id === block.id ? { ...b, language: lang.toLowerCase() } : b)
      );
    }
    setShowPicker(false);
  };

  return (
    <div className="flex-1 border border-white/10 rounded-2xl overflow-hidden bg-[#111111] shadow-2xl text-left antialiased ring-1 ring-white/5 relative">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/10">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowPicker(!showPicker)}
          className="text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md transition-all"
        >
          {currentLang} <ChevronDown size={10} />
        </button>

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

      {showPicker && (
        <div className="absolute top-11 left-4 z-50 p-2 bg-[#18181a] border border-white/10 rounded-xl shadow-2xl flex flex-col gap-0.5 max-h-60 overflow-y-auto w-40 scrollbar-thin scrollbar-thumb-white/10">
          {languagesList.map((lang) => {
            const isSelected = (block.language || 'css').toLowerCase() === lang.toLowerCase();
            return (
              <button
                key={lang}
                onClick={() => handleSelectLanguage(lang)}
                className={cn(
                  "px-3 py-1.5 text-left text-xs font-bold rounded-lg flex items-center justify-between transition-all",
                  isSelected ? "bg-blue-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {lang}
                {isSelected && <Check size={11} />}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={localRef}
        contentEditable={!isReadOnly}
        suppressContentEditableWarning={true}
        onInput={handleInput}
        onFocus={() => {
          setFocusedId(block.id);
          if (editor.setActiveBlockId) editor.setActiveBlockId(block.id);
        }}
        onBlur={(e: any) => {
          setFocusedId(null);
          if (editor.setActiveBlockId) editor.setActiveBlockId(null);
          handleBlockChange(block.id, e.currentTarget.innerHTML);
        }}
        className="w-full bg-transparent p-6 font-mono text-[13px] leading-relaxed text-white border-none outline-none focus:outline-none min-h-[140px] whitespace-pre-wrap selection:bg-blue-500/30"
        data-placeholder="// Paste your code block here..."
      />
    </div>
  );
};
