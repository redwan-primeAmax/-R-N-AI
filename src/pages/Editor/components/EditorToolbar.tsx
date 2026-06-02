/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Underline, Strikethrough, Code, 
  Undo2, Redo2, Plus, 
  Search, Link2, ChevronRight
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { ContentSearch } from './ContentSearch';

interface EditorToolbarProps {
  editor: any;
  onPlusClick: () => void;
  isReadOnly: boolean;
  isLight?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ 
  editor, 
  onPlusClick,
  isReadOnly,
  isLight = false
}) => {
  const [showHeadings, setShowHeadings] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [, forceUpdate] = useState({});

  React.useEffect(() => {
    const handleSelectionChange = () => {
      forceUpdate({});
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const offsetBottom = window.innerHeight - vv.height - vv.offsetTop;
      if (offsetBottom > 0) {
        setKeyboardHeight(offsetBottom);
      } else {
        setKeyboardHeight(0);
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  if (!editor || isReadOnly) return null;

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    className = "",
    disabled = false
  }: any) => (
    <button
      onMouseDown={(e) => {
        // Prevent focus loss/keyboard closing
        e.preventDefault();
      }}
      onPointerDown={(e) => {
        // Prevent focus loss/keyboard closing
        e.preventDefault();
        // Give tactile feedback on mobile
        if (typeof window !== 'undefined' && window.navigator.vibrate) {
          window.navigator.vibrate(5);
        }
      }}
      onClick={(e) => {
        e.preventDefault();
        if (!disabled) onClick(e);
      }}
      disabled={disabled}
      className={cn(
        "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 active:scale-90",
        isActive ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : 
        isLight ? "text-gray-500 hover:bg-black/5" : "text-white/60 hover:bg-white/5",
        disabled && "opacity-20 grayscale",
        className
      )}
    >
      {children}
    </button>
  );

  return (
    <div 
      className={cn(
        "fixed left-0 right-0 z-[100] border-t safe-area-inset-bottom transition-colors duration-300",
        isLight ? "bg-white border-gray-200" : "bg-[#121212] border-white/10"
      )}
      style={{ bottom: `${keyboardHeight}px` }}
    >
      {isSearchActive ? (
        <ContentSearch 
          editor={editor}
          isSearchActive={isSearchActive}
          setIsSearchActive={setIsSearchActive}
        />
      ) : (
        <div className="max-w-3xl mx-auto flex items-center h-14 px-2 overflow-x-auto no-scrollbar gap-0.5">
          <ToolbarButton 
            onClick={onPlusClick} 
            className={cn(
              "mr-1",
              isLight ? "text-gray-800 bg-gray-100 hover:bg-gray-200" : "text-white/90 bg-white/5 hover:bg-white/10"
            )}
          >
            <Plus size={20} />
          </ToolbarButton>

          <ToolbarButton 
            onClick={() => setIsSearchActive(true)} 
            className={cn(
              "mx-1",
              isLight ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
            )}
          >
            <Search size={18} />
          </ToolbarButton>

          <div className={cn("w-[1px] h-6 mx-1 flex-shrink-0", isLight ? "bg-gray-200" : "bg-white/10")} />

          <ToolbarButton 
            onClick={() => {
              // Trigger link to page list
              window.dispatchEvent(new CustomEvent('editor-event-showSubPageLinkList'));
            }} 
            className={cn(
              isLight ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100" : "text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20"
            )}
          >
            <div className="flex items-center gap-1">
              <Link2 size={18} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Link</span>
            </div>
          </ToolbarButton>

          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            isActive={editor.isActive('underline')}
          >
            <Underline size={18} />
          </ToolbarButton>

          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleStrike().run()} 
            isActive={editor.isActive('strike')}
          >
            <Strikethrough size={18} />
          </ToolbarButton>

          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleCode().run()} 
            isActive={editor.isActive('code')}
          >
            <Code size={18} />
          </ToolbarButton>

          <div className={cn("w-[1px] h-6 mx-1 flex-shrink-0", isLight ? "bg-gray-200" : "bg-white/10")} />

          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            <Undo2 size={18} />
          </ToolbarButton>

          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            <Redo2 size={18} />
          </ToolbarButton>
        </div>
      )}

      <AnimatePresence>
      </AnimatePresence>
    </div>
  );
};
