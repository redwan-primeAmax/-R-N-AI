import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';

const EMOJIS = ['💡', 'ℹ️', '⚠️', '🚨', '✅', '❌', '📌', '🚀', '⭐', '🔥', '🌊', '🌈', '🎨', '💻', '🌍', '📊', '⚡', '🤖', '📚', '🛠️', '🔒', '🎯', '🗺️', '🎬', '🧩', '🎸', '🧬', '🧪', '🔭', '🪐'];

const CalloutComponent = ({ node, updateAttributes }: any) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { emoji, color } = node.attrs;

  return (
    <NodeViewWrapper className={cn(
      "callout-block group relative my-6 rounded-2xl p-4 pl-14 border border-white/5 bg-white/[0.03] transition-all outline-none",
      `callout-${color}`
    )}>
      <div className="absolute top-4 left-4 z-20">
        <button
          contentEditable={false}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-xl select-none hover:scale-110 active:scale-95 transition-transform"
        >
          {emoji}
        </button>

        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute top-8 left-0 z-[100] bg-[#1a1a1a] border border-white/10 p-2 rounded-2xl shadow-2xl min-w-[200px]"
            >
              <div className="grid grid-cols-5 gap-1 max-h-[200px] overflow-y-auto no-scrollbar">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => {
                      updateAttributes({ emoji: e });
                      setShowEmojiPicker(false);
                    }}
                    className="p-2 hover:bg-white/5 rounded-xl text-lg"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="callout-content outline-none" data-node-view-content />
    </NodeViewWrapper>
  );
};

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  draggable: true,

  addAttributes() {
    return {
      color: { default: 'gray' },
      emoji: { default: '💡' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent);
  },

  addCommands() {
    return {
      setCallout: (attributes: any) => ({ commands }: any) => {
        return commands.wrapIn(this.name, attributes);
      },
      toggleCallout: (attributes: any) => ({ commands }: any) => {
        return commands.toggleWrap(this.name, attributes);
      },
    } as any;
  },
});
