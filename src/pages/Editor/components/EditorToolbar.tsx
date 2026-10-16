/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import React, { useState } from 'react';
import {
  Underline, Strikethrough, Highlighter, Code, Ban,
  Undo2, Redo2, Plus,
  Link2, ArrowLeft, Palette,
  Keyboard
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useLanguage } from '../../../utils/translator';
import { m as motion, AnimatePresence } from 'framer-motion';

interface EditorToolbarProps {
  editor: any;
  onPlusClick: () => void;
  isReadOnly: boolean;
  isLight?: boolean;
  isTitleFocused?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ 
  editor, 
  onPlusClick,
  isReadOnly,
  isLight = false,
  isTitleFocused = false
}) => {
  const [currentMenu, setCurrentMenu] = useState<'main' | 'formatting' | 'colors'>('main');
  const [, forceUpdate] = useState({});
  const { t } = useLanguage();

  React.useEffect(() => {
    const handleSelectionChange = () => {
      forceUpdate({});
    };
    const handleFocusBlur = () => {
      forceUpdate({});
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('focusin', handleFocusBlur);
    document.addEventListener('focusout', handleFocusBlur);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('focusin', handleFocusBlur);
      document.removeEventListener('focusout', handleFocusBlur);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const root = document.documentElement;
    let raf = 0;

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const offset = vv
          ? Math.max(0, Math.round(window.innerHeight - vv.height))
          : 0;
        root.style.setProperty('--kb-offset', `${offset}px`);
      });
    };

    vv?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('focusin', update);
    const handleFocusOut = () => {
      setTimeout(update, 100);
    };
    document.addEventListener('focusout', handleFocusOut);
    update();

    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', handleFocusOut);
      root.style.removeProperty('--kb-offset');
    };
  }, []);

  if (!editor || isReadOnly) return null;

  const activeEl = document.activeElement as HTMLElement | null;
  const isEditing =
    !!activeEl &&
    (activeEl.isContentEditable || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT');

  const isKeyboardFocused = () => {
    const el = document.activeElement;
    return !!(el && el.getAttribute('contenteditable') === 'true');
  };

  const handleKeyboardToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    const focusedEl = document.activeElement;
    const isFocused = focusedEl && focusedEl.getAttribute('contenteditable') === 'true';

    if (isFocused) {
      if (focusedEl instanceof HTMLElement) {
        focusedEl.blur();
      }
    } else {
      const blockId = editor.activeBlockId || (editor.blocks && editor.blocks[0]?.id);
      if (blockId) {
        const el = document.getElementById(blockId);
        if (el) {
          el.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    }
  };

  const textColors = [
    { name: 'Default', value: isLight ? '#37352f' : '#ffffff' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Orange', value: '#f97316' }
  ];

  // Deep, solid marker colors: with the dark text that <mark> forces,
  // these stay crisp and legible on light and dark pages alike. Kept
  // deliberately separate from the (lighter) text color palette above.
  const bgColors = [
    { name: 'Yellow Highlight', value: '#FACC15' },
    { name: 'Orange Highlight', value: '#FB923C' },
    { name: 'Green Highlight', value: '#4ADE80' },
    { name: 'Teal Highlight', value: '#2DD4BF' },
    { name: 'Blue Highlight', value: '#60A5FA' },
    { name: 'Purple Highlight', value: '#C084FC' },
    { name: 'Pink Highlight', value: '#F472B6' },
    { name: 'Red Highlight', value: '#F87171' }
  ];
  const DEFAULT_HIGHLIGHT = '#FACC15';

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    className = "",
    disabled = false
  }: any) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        if (typeof window !== 'undefined' && typeof window.navigator?.vibrate === 'function') {
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
        "fixed left-0 right-0 bottom-0 z-[100] border-t transition-colors duration-300",
        isLight ? "bg-white border-gray-200" : "bg-[#1a1a1a] border-white/10"
      )}
      style={{
        transform: 'translate3d(0, calc(-1 * var(--kb-offset, 0px)), 0)',
        willChange: 'transform',
        paddingBottom: isEditing ? 0 : 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center h-14 px-2 overflow-x-auto no-scrollbar justify-between">
        {isTitleFocused ? (
          // Title specific minimalist bar: contains only keyboard off button at the far right
          <div className="flex w-full justify-end px-2">
            <ToolbarButton onClick={handleKeyboardToggle} isActive={true}>
              <Keyboard size={20} className="text-blue-500" />
            </ToolbarButton>
          </div>
        ) : (
          <div className="flex items-center w-full gap-0.5 min-w-0">
            <AnimatePresence mode="wait">
              {currentMenu === 'main' && (
                <motion.div 
                  key="main"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-0.5 flex-1 min-w-0"
                >
                  <ToolbarButton 
                    onClick={(e: any) => {
                      if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                      }
                      onPlusClick();
                    }} 
                    className={cn(
                      "mr-1",
                      isLight ? "text-gray-800 bg-gray-100 hover:bg-gray-200" : "text-white/90 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <Plus size={20} />
                  </ToolbarButton>

                  {/* Aa Formatting Options Button */}
                  <ToolbarButton 
                    onClick={() => setCurrentMenu('formatting')}
                    isActive={false}
                  >
                    <span className="font-extrabold text-sm leading-none font-sans tracking-tight">Aa</span>
                  </ToolbarButton>

                  <div className={cn("w-[1px] h-6 mx-1 flex-shrink-0", isLight ? "bg-gray-200" : "bg-white/10")} />

                  <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                    <Undo2 size={18} />
                  </ToolbarButton>

                  <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                    <Redo2 size={18} />
                  </ToolbarButton>

                  <div className="flex-1" />

                  {/* Collapse Keyboard Button */}
                  <ToolbarButton onClick={handleKeyboardToggle} isActive={isKeyboardFocused()}>
                    <Keyboard size={20} />
                  </ToolbarButton>
                </motion.div>
              )}

              {currentMenu === 'formatting' && (
                <motion.div 
                  key="formatting"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar pr-2"
                >
                  <ToolbarButton onClick={() => setCurrentMenu('main')} className="bg-blue-500/10 text-blue-500 mr-1 flex-shrink-0">
                    <ArrowLeft size={18} />
                  </ToolbarButton>

                  <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleBold().run()} 
                    isActive={editor.isActive('bold')}
                    className="flex-shrink-0"
                  >
                    <span className="font-black font-serif text-lg leading-none">B</span>
                  </ToolbarButton>

                  <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleItalic().run()} 
                    isActive={editor.isActive('italic')}
                    className="flex-shrink-0"
                  >
                    <span className="italic font-serif text-lg leading-none">I</span>
                  </ToolbarButton>

                  <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleUnderline().run()} 
                    isActive={editor.isActive('underline')}
                    className="flex-shrink-0"
                  >
                    <Underline size={18} />
                  </ToolbarButton>

                  <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleStrike().run()} 
                    isActive={editor.isActive('strike')}
                    className="flex-shrink-0"
                  >
                    <Strikethrough size={18} />
                  </ToolbarButton>

                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive('code')}
                    className="flex-shrink-0"
                  >
                    <Code size={18} />
                  </ToolbarButton>

                  {/* Highlighter: a real <mark> highlight (applies to the
                      selection, or to the next typed text at the caret).
                      Completely separate from inline code / text color. */}
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHighlight(DEFAULT_HIGHLIGHT).run()}
                    isActive={editor.isActive('highlight')}
                    className="flex-shrink-0"
                  >
                    <Highlighter size={18} />
                  </ToolbarButton>

                  <div className={cn("w-[1px] h-6 flex-shrink-0 mx-1", isLight ? "bg-gray-200" : "bg-white/10")} />

                  {/* Palette button triggers colors view */}
                  <ToolbarButton 
                    onClick={() => setCurrentMenu('colors')}
                    className="bg-purple-500/10 text-purple-500 flex-shrink-0"
                  >
                    <Palette size={18} />
                  </ToolbarButton>
                </motion.div>
              )}

              {currentMenu === 'colors' && (
                <motion.div 
                  key="colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar pr-2"
                >
                  <ToolbarButton onClick={() => setCurrentMenu('formatting')} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 mr-1 flex-shrink-0">
                    <span className="font-extrabold text-[15px]">✕</span>
                  </ToolbarButton>

                  {/* Text Color — independent section: changes only the
                      letter color, never the highlight behind it. */}
                  <span className={cn("text-[10px] font-black uppercase tracking-wider select-none flex-shrink-0", isLight ? "text-gray-500" : "text-white/40")}>
                    {t('format.textColor')}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {textColors.map(tc => (
                      <button
                        key={tc.name}
                        title={tc.name}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => editor.chain().focus().setTextColor(tc.value).run()}
                        className="w-7 h-7 rounded-full border border-white/20 flex-shrink-0 transition-transform active:scale-75 shadow-sm hover:scale-105 flex items-center justify-center font-black text-[13px]"
                        style={{ color: tc.value, backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }}
                      >
                        A
                      </button>
                    ))}
                  </div>

                  <div className={cn("w-[1px] h-6 flex-shrink-0 mx-1", isLight ? "bg-gray-200" : "bg-white/10")} />

                  {/* Highlighter — deep marker colors in their own section.
                      First swatch clears the highlight entirely. */}
                  <span className={cn("text-[10px] font-black uppercase tracking-wider select-none flex-shrink-0 flex items-center gap-1", isLight ? "text-gray-500" : "text-white/40")}>
                    <Highlighter size={11} />
                    {t('format.highlight')}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      title={t('format.highlightOff')}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => editor.chain().focus().setHighlight(null).run()}
                      className={cn(
                        "w-7 h-7 rounded-lg border flex-shrink-0 transition-transform active:scale-75 hover:scale-105 flex items-center justify-center",
                        isLight ? "border-gray-300 text-gray-400" : "border-white/15 text-white/40"
                      )}
                    >
                      <Ban size={13} />
                    </button>
                    {bgColors.map(bc => (
                      <button
                        key={bc.name}
                        title={bc.name}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => editor.chain().focus().setHighlight(bc.value).run()}
                        className="w-7 h-7 rounded-lg border border-black/20 flex-shrink-0 transition-transform active:scale-75 shadow-sm hover:scale-105"
                        style={{ backgroundColor: bc.value }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
