/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { GitGraph, Edit2, Check } from 'lucide-react';
import { EditorBlock } from '../../../../utils/blockParser';

interface MermaidBlockProps {
  block: EditorBlock;
  setBlocks: React.Dispatch<React.SetStateAction<EditorBlock[]>>;
  isReadOnly?: boolean;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ block, setBlocks, isReadOnly }) => {
  const [code, setCode] = useState(
    block.content || 'graph TD\n  A[শুরু] --> B{সিদ্ধান্ত}\n  B -->|হ্যাঁ| C[ফলাফল ১]\n  B -->|না| D[ফলাফল ২]'
  );
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      try {
        const { svg } = await mermaid.render(id, code || 'graph TD\n  A-->B');
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (isMounted && containerRef.current) {
          containerRef.current.innerText = 'ইনভ্যালিড মেটমেইড ডায়াগ্রাম কোড (Invalid Mermaid Syntax)';
        }
      }
    };

    renderDiagram();
    return () => { isMounted = false; };
  }, [code]);

  const handleSave = () => {
    setIsEditing(false);
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: code } : b));
  };

  return (
    <div className="my-4 p-4 bg-[#141416] border border-white/10 rounded-2xl relative group">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
          <GitGraph size={14} />
          <span>Mermaid ডায়াগ্রাম (Diagram)</span>
        </div>
        {!isReadOnly && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <Edit2 size={13} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Mermaid কোড লিখুন..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-mono text-sm text-white outline-none focus:border-purple-400 resize-y min-h-[120px]"
          />
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
          >
            <Check size={14} />
            <span>সম্পন্ন (Done)</span>
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          onClick={() => !isReadOnly && setIsEditing(true)}
          className="py-4 flex justify-center cursor-pointer overflow-x-auto"
        />
      )}
    </div>
  );
};
