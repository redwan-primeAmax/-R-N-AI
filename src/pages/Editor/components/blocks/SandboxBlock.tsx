/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

export const SandboxBlock = ({ block, handleBlockChange, isReadOnly }: any) => {
  const [localContent, setLocalContent] = useState(block.content || '');
  
  // Internal debouncer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localContent !== block.content) {
        handleBlockChange(block.id, localContent);
      }
    }, 700); // 700ms debounce
    return () => clearTimeout(timer);
  }, [localContent, block.id, handleBlockChange, block.content]);

  return (
    <div className="flex-1 border border-white/5 rounded-2xl overflow-hidden bg-[#070707] shadow-xl text-left antialiased flex flex-col md:flex-row min-h-[350px] w-full">
      {/* Code Editor Part */}
      <div className="flex-1 flex flex-col border-r border-white/5 min-w-[280px]">
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
            HTML / CSS / JS Sandbox
          </span>
          <span className="text-[9px] font-mono text-white/30 uppercase">Interactive Widget</span>
        </div>
        <textarea
          readOnly={isReadOnly}
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          placeholder="<!-- Write HTML/CSS/JS code here... -->"
          className="w-full bg-transparent p-4 font-mono text-xs leading-relaxed text-blue-200 border-none outline-none focus:outline-none flex-grow resize-y min-h-[200px]"
        />
      </div>

      {/* Preview / Isolated Sandbox iframe Part */}
      <div className="flex-1 flex flex-col bg-[#0d0d0e] relative min-w-[280px]">
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Rendered Output</span>
          <span className="text-[9px] font-mono text-[#00E5FF] bg-[#00E5FF]/5 px-1.5 py-0.5 rounded border border-[#00E5FF]/10">Isolated Sandbox</span>
        </div>
        <div className="flex-1 p-3 flex bg-[#121214] min-h-[220px]">
          <iframe
            title={`sandbox-preview-${block.id}`}
            sandbox="allow-scripts"
            className="w-full h-full bg-white rounded-xl border-none min-h-[220px] shadow-inner"
            referrerPolicy="no-referrer"
            srcDoc={`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body {
                      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      margin: 16px;
                      color: #111;
                      background-color: #fff;
                    }
                    /* Scrollbars */
                    ::-webkit-scrollbar {
                      width: 6px;
                      height: 6px;
                    }
                    ::-webkit-scrollbar-thumb {
                      background: #ddd;
                      border-radius: 3px;
                    }
                  </style>
                </head>
                <body>
                  ${block.content || '<div style="color: #999; text-align: center; margin-top: 30%; font-size: 13px; font-weight: 500;">কোড লিখলে এখানে লাইভ প্রিভিউ দেখাবে...</div>'}
                </body>
              </html>
            `}
          />
        </div>
      </div>
    </div>
  );
};
