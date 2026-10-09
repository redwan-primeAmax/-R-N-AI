/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { EditorBlock } from '../../../../utils/blockParser';
import { EditableBlock } from './EditableBlock';

interface ToggleBlockProps {
  block: EditorBlock;
  idx: number;
  isReadOnly: boolean;
  blockRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  handleKeyDown: (e: React.KeyboardEvent, block: EditorBlock, idx: number) => void;
  setFocusedId: (id: string | null) => void;
  editor: any;
  handleBlockChange: (id: string, content: string, immediate?: boolean) => void;
  setBlocks: React.Dispatch<React.SetStateAction<EditorBlock[]>>;
}

export const ToggleBlock = ({
  block,
  idx,
  isReadOnly,
  blockRefs,
  handleKeyDown,
  setFocusedId,
  editor,
  handleBlockChange,
  setBlocks
}: ToggleBlockProps) => {
  const isExpanded = block.isExpanded !== false;

  const handleToggle = () => {
    setBlocks((prev: EditorBlock[]) => 
      prev.map((b: EditorBlock) => b.id === block.id ? { ...b, isExpanded: !isExpanded } : b)
    );
  };

  return (
    <div className="flex flex-col w-full group/toggle">
      <div className="flex items-start gap-1 w-full">
        <button
          onClick={handleToggle}
          className={cn(
            "flex-shrink-0 text-gray-400 hover:text-white transition-all transform cursor-pointer",
            isExpanded ? "rotate-90" : "rotate-0",
            block.type === 'toggle_h1' ? "mt-5" : (block.type === 'toggle_h2' ? "mt-4" : "mt-2")
          )}
        >
          <ChevronRight size={18} />
        </button>
        
        <div className={cn(
          "flex-1 min-w-0",
          block.type === 'toggle_h1' && "text-3xl sm:text-4xl font-black text-white",
          block.type === 'toggle_h2' && "text-2xl sm:text-3xl font-black text-white/90",
          block.type === 'toggle_h3' && "text-xl sm:text-2xl font-black text-white/80",
          block.type === 'toggle' && "text-base text-white/70"
        )}>
          <EditableBlock
            block={block}
            idx={idx}
            isReadOnly={isReadOnly}
            blockRefs={blockRefs}
            handleKeyDown={handleKeyDown}
            setFocusedId={setFocusedId}
            editor={editor}
            handleBlockChange={handleBlockChange}
          />
        </div>
      </div>
    </div>
  );
};
