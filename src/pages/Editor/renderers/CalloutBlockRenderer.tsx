/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EditableBlock } from '../components/blocks/EditableBlock';

interface CalloutBlockRendererProps {
  block: any;
  idx: number;
  isReadOnly: boolean;
  blockRefs: any;
  handleKeyDown: any;
  setFocusedId: any;
  editor: any;
  handleBlockChange: any;
  setBlocks: any;
}

export const CalloutBlockRenderer: React.FC<CalloutBlockRendererProps> = ({
  block,
  idx,
  isReadOnly,
  blockRefs,
  handleKeyDown,
  setFocusedId,
  editor,
  handleBlockChange,
  setBlocks
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className="flex-1 flex items-start gap-3 p-4 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/5 shadow-sm text-left relative overflow-visible">
      <div className="relative flex-shrink-0 mt-0.5">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg flex items-center justify-center text-lg transition-all"
        >
          {block.emoji || '💡'}
        </button>
        {showEmojiPicker && (
          <div className="absolute top-10 left-0 z-50 p-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/15 rounded-xl shadow-2xl flex gap-1 flex-wrap w-40 backdrop-blur-lg">
            {['💡', '📝', '📌', '⚠️', '⭐', '🚀', '🎯', '📁', '🔍', 'ℹ️'].map((em) => (
              <button
                key={em}
                onClick={() => {
                  setBlocks((prev: any) =>
                    prev.map((b: any) => (b.id === block.id ? { ...b, emoji: em } : b))
                  );
                  setShowEmojiPicker(false);
                }}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-base transition-all active:scale-90"
              >
                {em}
              </button>
            ))}
          </div>
        )}
      </div>
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
  );
};
