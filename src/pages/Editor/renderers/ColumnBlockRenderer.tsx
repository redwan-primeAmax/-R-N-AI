/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ColumnBlockRendererProps {
  block: any;
  isReadOnly: boolean;
  setBlocks: any;
}

export const ColumnBlockRenderer: React.FC<ColumnBlockRendererProps> = ({
  block,
  isReadOnly,
  setBlocks
}) => {
  return (
    <div className="flex-1 min-w-0 grid grid-cols-2 gap-4 py-3">
      <div className="p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl transition-all flex flex-col gap-2">
        <span className="text-[9px] font-black uppercase tracking-wider text-blue-500/60 font-mono">Column A</span>
        <div
          contentEditable={!isReadOnly}
          suppressContentEditableWarning
          onBlur={(e) => {
            const val = e.currentTarget.innerHTML;
            const col2Val = block.col2Content || '';
            setBlocks((prev: any) =>
              prev.map((b: any) =>
                b.id === block.id ? { ...b, col1Content: val, col2Content: col2Val } : b
              )
            );
          }}
          dangerouslySetInnerHTML={{ __html: block.col1Content || '' }}
          className="text-sm font-sans focus:outline-none min-h-[50px] leading-relaxed empty:before:content-['Type_left_column...'] empty:before:opacity-30 empty:before:italic"
        />
      </div>
      <div className="p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl transition-all flex flex-col gap-2">
        <span className="text-[9px] font-black uppercase tracking-wider text-purple-500/60 font-mono">Column B</span>
        <div
          contentEditable={!isReadOnly}
          suppressContentEditableWarning
          onBlur={(e) => {
            const val = e.currentTarget.innerHTML;
            const col1Val = block.col1Content || '';
            setBlocks((prev: any) =>
              prev.map((b: any) =>
                b.id === block.id ? { ...b, col1Content: col1Val, col2Content: val } : b
              )
            );
          }}
          dangerouslySetInnerHTML={{ __html: block.col2Content || '' }}
          className="text-sm font-sans focus:outline-none min-h-[50px] leading-relaxed empty:before:content-['Type_right_column...'] empty:before:opacity-30 empty:before:italic"
        />
      </div>
    </div>
  );
};
