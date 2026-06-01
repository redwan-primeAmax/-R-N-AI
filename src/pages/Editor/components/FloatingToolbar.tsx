/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Bold, Italic, Strikethrough, Code, 
  List, ListTodo, Heading, ImageIcon, 
  Plus, X, Hash, Info, FileText 
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion } from 'framer-motion';

interface FloatingToolbarProps {
  editor: any;
  onPlusClick: () => void;
  onAiClick: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ 
  editor, 
  onPlusClick,
  onAiClick
}) => {
  if (!editor) return null;

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    className = "" 
  }: any) => (
    <button
      onMouseDown={(e) => {
        // Prevent focus loss/keyboard closing
        e.preventDefault();
      }}
      onPointerDown={(e) => {
        // Prevent focus loss/keyboard closing
        e.preventDefault();
      }}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      className={cn(
        "p-2.5 rounded-xl transition-all duration-200 active:scale-90",
        isActive ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-white/40 hover:bg-white/5",
        className
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-fit">
      <div className="bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/10 rounded-[28px] p-2 flex items-center gap-1 shadow-2xl shadow-black/50">
        <ToolbarButton onClick={onPlusClick} className="bg-white/5 text-white/80">
          <Plus size={20} />
        </ToolbarButton>
        <div className="w-[1px] h-6 bg-white/5 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}><Bold size={18} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}><Italic size={18} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })}><Heading size={18} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}><List size={18} /></ToolbarButton>
        <div className="w-[1px] h-6 bg-white/5 mx-1" />
        <ToolbarButton onClick={onAiClick} className="bg-blue-600/10 text-blue-400 border border-blue-600/20">
          <Hash size={18} />
        </ToolbarButton>
      </div>
    </div>
  );
};
