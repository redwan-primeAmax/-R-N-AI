/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from '../../../utils/cn';

interface TocBlockRendererProps {
  blocks: any[];
}

export const TocBlockRenderer: React.FC<TocBlockRendererProps> = ({ blocks }) => {
  return (
    <div className="flex-1 min-w-0 bg-white/[0.01] border border-white/5 rounded-2xl p-4 my-2 text-left select-none">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 border-b border-white/5 pb-2">
        Table of Contents
      </div>
      <div className="space-y-1">
        {blocks
          .filter((b: any) =>
            ['h1', 'h2', 'h3', 'toggle_h1', 'toggle_h2', 'toggle_h3'].includes(b.type) && b.content?.trim()
          )
          .map((hb: any) => {
            const baseLevel = hb.type.replace('toggle_h', 'h').replace('h', '');
            const level = parseInt(baseLevel, 10) || 1;
            const cleanText = hb.content.replace(/<[^>]*>/g, '').trim();
            return (
              <button
                key={hb.id}
                onClick={() => {
                  const el = document.getElementById(hb.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={cn(
                  "block w-full text-left font-semibold hover:text-blue-400 py-1 transition-colors",
                  level === 1 ? "text-sm text-white/80 font-black pl-0" : "",
                  level === 2 ? "text-[13px] text-white/60 font-bold pl-4" : "",
                  level === 3 ? "text-xs text-white/40 font-medium pl-8" : ""
                )}
              >
                <span className="text-white/20 mr-1.5 font-mono">#</span>
                {cleanText || 'Untitled heading'}
              </button>
            );
          })}
        {blocks.filter((b: any) =>
          ['h1', 'h2', 'h3', 'toggle_h1', 'toggle_h2', 'toggle_h3'].includes(b.type) && b.content?.trim()
        ).length === 0 && (
          <p className="text-[10px] font-bold text-white/20 py-2 italic font-mono uppercase tracking-wider">
            Add headings to populate table of contents
          </p>
        )}
      </div>
    </div>
  );
};
