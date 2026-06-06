/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Underline, Strikethrough, Code, 
  Undo2, Redo2, Plus, 
  Link2, ArrowLeft, Palette, 
  Keyboard
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { extensionManager } from '../../../services/ExtensionManager';

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [, forceUpdate] = useState({});
  const [extensionButtons, setExtensionButtons] = useState<any[]>([]);

  React.useEffect(() => {
    const updateButtons = () => setExtensionButtons((window as any).__toolbarButtons || []);
    const unsub = extensionManager.onChange(updateButtons);
    updateButtons();
    return () => { unsub(); };
  }, []);

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

  const bgColors = [
    { name: 'Clear', value: 'transparent' },
    { name: 'Red Highlight', value: 'rgba(239, 68, 68, 0.25)' },
    { name: 'Blue Highlight', value: 'rgba(59, 130, 246, 0.25)' },
    { name: 'Green Highlight', value: 'rgba(34, 197, 94, 0.25)' },
    { name: 'Yellow Highlight', value: 'rgba(234, 179, 8, 0.25)' },
    { name: 'Purple Highlight', value: 'rgba(168, 85, 247, 0.25)' },
    { name: 'Orange Highlight', value: 'rgba(249, 115, 22, 0.25)' }
  ];

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
        isLight ? "bg-white border-gray-200" : "bg-[#1a1a1a] border-white/10"
      )}
      style={{ bottom: `${keyboardHeight}px` }}
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

                  {/* Extension Buttons Slot */}
                  {extensionButtons.map((btn: any, idx: number) => {
                    const Icon = btn.icon;
                    return (
                      <ToolbarButton 
                        key={`${btn.extensionId}_${idx}`}
                        onClick={() => btn.onClick && btn.onClick({ editor, extensionManager })}
                        className={cn("bg-green-500/10 text-green-500")}
                      >
                        {typeof Icon === 'string' ? <span>{Icon}</span> : <Icon size={18} />}
                      </ToolbarButton>
                    );
                  })}

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

                  {/* Text Colors Panel */}
                  <span className={cn("text-[10px] font-black uppercase tracking-wider select-none flex-shrink-0", isLight ? "text-gray-500" : "text-white/40")}>রং:</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {textColors.map(tc => (
                      <button
                        key={tc.name}
                        title={tc.name}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => editor.chain().focus().setTextColor(tc.value).run()}
                        className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0 transition-transform active:scale-75 shadow-sm hover:scale-105"
                        style={{ backgroundColor: tc.value }}
                      />
                    ))}
                  </div>

                  <div className={cn("w-[1px] h-6 flex-shrink-0 mx-1", isLight ? "bg-gray-200" : "bg-white/10")} />

                  {/* Highlights Background Colors Panel */}
                  <span className={cn("text-[10px] font-black uppercase tracking-wider select-none flex-shrink-0", isLight ? "text-gray-500" : "text-white/40")}>ব্যাকগ্রাউন্ড:</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {bgColors.map(bc => (
                      <button
                        key={bc.name}
                        title={bc.name}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => editor.chain().focus().setBackgroundColor(bc.value).run()}
                        className="w-5 h-5 rounded border border-white/10 flex-shrink-0 transition-transform active:scale-75 shadow-sm hover:scale-105 relative overflow-hidden"
                        style={{ backgroundColor: bc.value === 'transparent' ? 'transparent' : bc.value }}
                      >
                        {bc.value === 'transparent' && (
                          <div className="absolute inset-0 bg-red-500 rotate-45 h-[1.5px] mt-2 w-full scale-125" />
                        )}
                      </button>
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
