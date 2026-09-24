/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Calculator, Edit2, Check } from 'lucide-react';
import { EditorBlock } from '../../../../utils/blockParser';

interface EquationBlockProps {
  block: EditorBlock;
  setBlocks: React.Dispatch<React.SetStateAction<EditorBlock[]>>;
  isReadOnly?: boolean;
}

export const EquationBlock: React.FC<EquationBlockProps> = ({ block, setBlocks, isReadOnly }) => {
  const [equation, setEquation] = useState(block.content || 'E = mc^2');
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(equation || 'E = mc^2', containerRef.current, {
          throwOnError: false,
          displayMode: true
        });
      } catch (e) {
        containerRef.current.innerText = 'ইনভ্যালিড সমীকরণ (Invalid KaTeX Expression)';
      }
    }
  }, [equation]);

  const handleSave = () => {
    setIsEditing(false);
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: equation } : b));
  };

  return (
    <div className="my-4 p-4 bg-[#141416] border border-white/10 rounded-2xl relative group">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
          <Calculator size={14} />
          <span>KaTeX গণিত সমীকরণ (Equation)</span>
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
            value={equation}
            onChange={e => setEquation(e.target.value)}
            placeholder="KaTeX সমীকরণ লিখুন (যেমন: \int_0^\infty x^2 dx)"
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-mono text-sm text-white outline-none focus:border-amber-400 resize-y min-h-[80px]"
          />
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
          >
            <Check size={14} />
            <span>সম্পন্ন (Done)</span>
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          onClick={() => !isReadOnly && setIsEditing(true)}
          className="py-4 text-center cursor-pointer overflow-x-auto text-lg text-white"
        />
      )}
    </div>
  );
};
