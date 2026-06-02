/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { EditorBlock } from '../../../../utils/blockParser';
import { cn } from '../../../../utils/cn';

interface TableBlockProps {
  block: EditorBlock;
  isReadOnly: boolean;
  setBlocks: (blocks: any) => void;
}

export const TableBlock = ({ block, isReadOnly, setBlocks }: TableBlockProps) => {
  return (
    <div className="flex-1 overflow-x-auto w-full my-2 relative group antialiased">
      <table className="min-w-full border-collapse text-sm">
        <tbody>
          {(block.tableData || [["", ""]]).map((row, rIdx) => (
            <tr key={rIdx} className="group/row">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className={cn(
                  "border border-gray-200 dark:border-white/10 p-2 text-left min-w-[120px] transition-colors relative",
                  rIdx === 0 ? "bg-gray-50/50 dark:bg-white/5 font-medium" : "bg-transparent text-gray-700 dark:text-white/80"
                )}>
                  <div
                    contentEditable={!isReadOnly}
                    suppressContentEditableWarning={true}
                      onBlur={(e: any) => {
                        const val = e.currentTarget.innerHTML;
                        setBlocks((prev: EditorBlock[]) => {
                          const updated = prev.map((b: EditorBlock) => {
                            if (b.id !== block.id) return b;
                            const newTable = [...(b.tableData || [])];
                            if (newTable[rIdx]) {
                              newTable[rIdx][cIdx] = val;
                            }
                            return { ...b, tableData: newTable };
                          });
                          return updated;
                        });
                      }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cell) }}
                    className="focus:outline-none min-h-[22px] px-1 placeholder:text-gray-300 dark:placeholder:text-white/10"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!isReadOnly && (
        <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              setBlocks((prev: EditorBlock[]) => {
                return prev.map((b: EditorBlock) => {
                  if (b.id !== block.id) return b;
                  const newTable = [...(b.tableData || [])];
                  newTable.push(Array(newTable[0]?.length || 3).fill(''));
                  return { ...b, tableData: newTable };
                });
              });
            }}
            className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-white/5 text-white/60 px-5 py-3 rounded-xl hover:bg-white/10 active:scale-95 transition-all"
          >
            + Row
          </button>
          <button
            onClick={() => {
              setBlocks((prev: EditorBlock[]) => {
                return prev.map((b: EditorBlock) => {
                  if (b.id !== block.id) return b;
                  const newTable = (b.tableData || []).map(r => [...r, '']);
                  return { ...b, tableData: newTable };
                });
              });
            }}
            className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-white/5 text-white/60 px-5 py-3 rounded-xl hover:bg-white/10 active:scale-95 transition-all"
          >
            + Col
          </button>
        </div>
      )}
    </div>
  );
};
