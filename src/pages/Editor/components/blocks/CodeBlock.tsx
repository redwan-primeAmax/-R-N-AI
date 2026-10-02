/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Copy, ChevronDown, Check } from 'lucide-react';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import { EditorBlock } from '../../../../utils/blockParser';
import { cn } from '../../../../utils/cn';
// @ts-ignore
import languagesText from '../../data/languages.txt?raw';

interface CodeBlockProps {
  block: EditorBlock;
  isReadOnly: boolean;
  setFocusedId: (id: string | null) => void;
  editor: any;
  handleBlockChange: (id: string, content: string, immediate?: boolean) => void;
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
  const [showPicker, setShowPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localCode, setLocalCode] = useState(() => {
    const temp = document.createElement('div');
    temp.innerHTML = block.content || '';
    return temp.textContent || temp.innerText || block.content || '';
  });

  const languagesList = React.useMemo(() => {
    try {
      return languagesText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    } catch (e) {
      return ['JavaScript', 'TypeScript', 'CSS', 'HTML', 'Python', 'JSON'];
    }
  }, []);

  const currentLangKey = (block.language || 'javascript').toLowerCase();

  // Highlight code using Prism
  const getHighlightedCode = (codeText: string, lang: string) => {
    const normalizedLang = lang.toLowerCase() === 'html' ? 'markup' : lang.toLowerCase();
    const grammar = Prism.languages[normalizedLang] || Prism.languages.javascript || Prism.languages.clike;
    try {
      return Prism.highlight(codeText, grammar, normalizedLang);
    } catch (e) {
      return DOMPurify.sanitize(codeText);
    }
  };

  useEffect(() => {
    const temp = document.createElement('div');
    temp.innerHTML = block.content || '';
    const text = temp.textContent || temp.innerText || block.content || '';
    if (text !== localCode) {
      setLocalCode(text);
    }
  }, [block.content]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setLocalCode(newCode);
    handleBlockChange(block.id, newCode, true);
  };

  const handleSelectLanguage = (lang: string) => {
    if (setBlocks) {
      setBlocks((prev: EditorBlock[]) => 
        prev.map((b: EditorBlock) => b.id === block.id ? { ...b, language: lang.toLowerCase() } : b)
      );
    }
    setShowPicker(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(localCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedHTML = getHighlightedCode(localCode, currentLangKey);

  return (
    <div className="flex-1 border border-white/10 rounded-2xl overflow-hidden bg-[#0d0d0f] shadow-2xl text-left antialiased ring-1 ring-white/5 relative group/code">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/10">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowPicker(!showPicker)}
          className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1 rounded-lg transition-all cursor-pointer"
        >
          {currentLangKey.toUpperCase()} <ChevronDown size={11} />
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="p-1 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>

      {/* Language Selector Dropdown */}
      {showPicker && (
        <div className="absolute top-11 left-4 z-50 p-2 bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-0.5 max-h-60 overflow-y-auto w-44 scrollbar-thin scrollbar-thumb-white/10">
          {languagesList.map((lang: string) => {
            const isSelected = currentLangKey === lang.toLowerCase();
            return (
              <button
                type="button"
                key={lang}
                onClick={() => handleSelectLanguage(lang)}
                className={cn(
                  "px-3 py-1.5 text-left text-xs font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer",
                  isSelected ? "bg-blue-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {lang}
                {isSelected && <Check size={12} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Code Editor & Syntax Highlight Display */}
      <div className="relative p-4 font-mono text-[13px] leading-relaxed min-h-[140px] overflow-x-auto">
        {isReadOnly ? (
          <pre className="m-0 p-0 whitespace-pre-wrap break-words text-slate-200">
            <code 
              className={`language-${currentLangKey}`}
              dangerouslySetInnerHTML={{ __html: highlightedHTML }} 
            />
          </pre>
        ) : (
          <div className="relative min-h-[120px]">
            {/* Syntax Highlight Preview Overlay behind transparent textarea */}
            <pre 
              aria-hidden="true"
              className="absolute inset-0 m-0 p-0 pointer-events-none whitespace-pre-wrap break-words text-slate-200 select-none overflow-hidden"
            >
              <code 
                className={`language-${currentLangKey}`}
                dangerouslySetInnerHTML={{ __html: highlightedHTML + '<br/>' }} 
              />
            </pre>

            {/* Editable Textarea overlaid directly on top with transparent text */}
            <textarea
              value={localCode}
              onChange={handleCodeChange}
              onFocus={() => {
                setFocusedId(block.id);
                if (editor?.setActiveBlockId) editor.setActiveBlockId(block.id);
              }}
              onBlur={() => {
                setFocusedId(null);
                if (editor?.setActiveBlockId) editor.setActiveBlockId(null);
              }}
              placeholder="// Paste or write code here..."
              className="w-full h-full min-h-[120px] bg-transparent text-transparent caret-white p-0 font-mono text-[13px] leading-relaxed border-none outline-none focus:outline-none resize-y relative z-10 whitespace-pre-wrap break-words selection:bg-blue-500/30"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};
