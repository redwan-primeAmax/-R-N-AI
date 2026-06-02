/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { EditorBlock } from '../../../../utils/blockParser';

interface TableBlockProps {
  block: EditorBlock;
  isReadOnly: boolean;
  setBlocks: (blocks: any) => void;
}

export const TableBlock = ({ block, isReadOnly, setBlocks }: TableBlockProps) => {
  return (
    <div className="flex-1 overflow-x-auto w-full border border-gray-200 dark:border-white/10 rounded-2xl bg-white/[0.01] p-1 shadow-inner ring-1 ring-gray-100 dark:ring-white/5 antialiased">
      <table className="w-full border-collapse">
        <tbody>
          {(block.tableData || [["", ""]]).map((row, rIdx) => (
            <tr key={rIdx} className="border-b last:border-b-0 border-gray-200 dark:border-white/10">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="border-r last:border-r-0 border-gray-200 dark:border-white/10 p-3 min-w-[120px] relative">
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
                    className="focus:outline-none min-h-[22px] text-left text-sm text-white/80 placeholder:text-white/10"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!isReadOnly && (
        <div className="flex gap-2 p-3 border-t border-white/5">
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
