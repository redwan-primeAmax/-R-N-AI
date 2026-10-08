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
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
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
  const [localCode, setLocalCode] = useState(block.content || '');

  const languagesList = React.useMemo(() => {
    try {
      return languagesText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    } catch (e) {
      return ['JavaScript', 'TypeScript', 'CSS', 'HTML', 'Python', 'JSON', 'Bash', 'SQL', 'YAML', 'Markdown'];
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
      return codeText.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[m] || m));
    }
  };

  useEffect(() => {
    if (block.content !== localCode) {
      setLocalCode(block.content || '');
    }
  }, [block.content]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setLocalCode(newCode);
    handleBlockChange(block.id, newCode, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      setLocalCode(newValue);
      handleBlockChange(block.id, newValue, true);
      
      // Reset cursor position after state update
      setTimeout(() => {
        if (e.currentTarget) {
          e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
        }
      }, 0);
    }
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

  const sharedStyles = "font-mono text-[13px] leading-relaxed p-0 m-0 w-full whitespace-pre-wrap break-words border-none outline-none focus:outline-none ring-0 focus:ring-0";

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
      <div className="relative p-5">
        {isReadOnly ? (
          <pre className={cn(sharedStyles, "text-slate-200 min-h-[1.5em]")}>
            <code 
              className={`language-${currentLangKey}`}
              dangerouslySetInnerHTML={{ __html: highlightedHTML }} 
            />
          </pre>
        ) : (
          <div className="relative min-h-[1.5em]">
            {/* Syntax Highlight Preview Overlay behind transparent textarea */}
            <pre 
              aria-hidden="true"
              className={cn(sharedStyles, "absolute inset-0 pointer-events-none text-slate-200 select-none overflow-hidden")}
            >
              <code 
                className={`language-${currentLangKey}`}
                dangerouslySetInnerHTML={{ __html: highlightedHTML + '\n' }} 
              />
            </pre>

            {/* Editable Textarea overlaid directly on top with transparent text */}
            <textarea
              value={localCode}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setFocusedId(block.id);
                if (editor?.setActiveBlockId) editor.setActiveBlockId(block.id);
              }}
              onBlur={() => {
                setFocusedId(null);
                if (editor?.setActiveBlockId) editor.setActiveBlockId(null);
              }}
              placeholder="// Paste or write code here..."
              className={cn(sharedStyles, "bg-transparent text-transparent caret-white relative z-10 resize-none selection:bg-blue-500/30 overflow-hidden block")}
              spellCheck={false}
              rows={localCode.split('\n').length || 1}
            />
          </div>
        )}
      </div>
    </div>
  );
};
