/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Loader2, Music, Video, FileText, Download, 
  Plus, GripVertical, CheckSquare, Square, Copy,
  MessageSquare, Image as ImageIcon
} from 'lucide-react';
import { operationRunner } from '../../../services/storage/OperationRunner';
import { DataManager } from '../../../services/storage/DataManager';
import { cn } from '../../../utils/cn';
import DOMPurify from 'dompurify';

import { EditorBlock, cleanBlockHTML, htmlToBlocks, blocksToHtml } from '../../../utils/blockParser';

export { htmlToBlocks, blocksToHtml };

interface CustomBlockEditorProps {
  editor: any; // our custom controller object
  className?: string;
}

export default function CustomBlockEditor({ editor, className }: CustomBlockEditorProps) {
  const [activeCell, setActiveCell] = useState<{ blockId: string; cellIndex: string } | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const blocks = editor?.blocks || [];
  const setBlocks = editor?.setBlocks;
  const isReadOnly = editor?.isReadOnly;

  const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const lastActionRef = useRef<string>('');

  const handleBlockChange = (id: string, newContent: string) => {
    if (!setBlocks) return;
    setBlocks((prev: EditorBlock[]) => {
      const blockToChange = prev.find((b: EditorBlock) => b.id === id);
      const cleaned = cleanBlockHTML(newContent, blockToChange?.type || 'paragraph');
      return prev.map((b: EditorBlock) => b.id === id ? { ...b, content: cleaned } : b);
    });
  };

  const handleBlockTypeChange = (id: string, newType: EditorBlock['type']) => {
    if (!setBlocks) return;
    setBlocks((prev: EditorBlock[]) => prev.map((b: EditorBlock) => b.id === id ? { ...b, type: newType } : b));
  };

  const deleteBlock = (id: string) => {
    if (!setBlocks) return;
    setBlocks((prev: EditorBlock[]) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((b: EditorBlock) => b.id === id);
      const updated = prev.filter((b: EditorBlock) => b.id !== id);
      
      // Move focus to previous block
      setTimeout(() => {
        const prevBlock = updated[idx - 1] || updated[idx];
        if (prevBlock) {
          blockRefs.current[prevBlock.id]?.focus();
        }
      }, 50);
      
      return updated;
    });
  };

  const addBlockAfter = (id: string) => {
    if (!setBlocks) return;
    const newBlock: EditorBlock = {
      id: crypto.randomUUID(),
      type: 'paragraph',
      content: ''
    };
    
    setBlocks((prev: EditorBlock[]) => {
      const idx = prev.findIndex((b: EditorBlock) => b.id === id);
      const updated = [...prev];
      updated.splice(idx + 1, 0, newBlock);
      return updated;
    });

    // Focus newly created block
    setTimeout(() => {
      blockRefs.current[newBlock.id]?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent, block: EditorBlock, idx: number) => {
    if (e.key !== 'Enter') {
      lastActionRef.current = e.key;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.type === 'code') {
         e.preventDefault();
         document.execCommand('insertText', false, '\n');
         return;
      }

      if (block.type === 'table') {
         return; // let table or browser handle it naturally
      }

      e.preventDefault();
      
      const target = e.target as HTMLElement;
      const html = target.innerHTML;
      
      if (html === '' || html === '<br>') {
         if (block.type !== 'paragraph') {
             handleBlockTypeChange(block.id, 'paragraph');
         } else {
             addBlockAfter(block.id);
         }
         lastActionRef.current = 'CreateBlock';
         return;
      }
      
      const isListType = block.type === 'todo' || block.type === 'bullet' || block.type === 'ordered';

      if (isListType || lastActionRef.current === 'Enter') {
         addBlockAfter(block.id);
         lastActionRef.current = 'CreateBlock';
      } else {
         document.execCommand('insertLineBreak');
         lastActionRef.current = 'Enter';
      }
      return;
    } else if (e.key === 'Backspace' && block.content === '' && block.type !== 'table' && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(block.id);
    } else if (e.key === 'ArrowUp') {
      const prev = blocks[idx - 1];
      if (prev) {
        e.preventDefault();
        blockRefs.current[prev.id]?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      const next = blocks[idx + 1];
      if (next) {
        e.preventDefault();
        blockRefs.current[next.id]?.focus();
      }
    }
  };

  // Media render helpers
  const MediaBlockItem = ({ block }: { block: EditorBlock }) => {
    const { id, type, fileName, fileSize, status, url } = block.mediaData || {};
    const [progress, setProgress] = useState(0);
    const [resolvedUrl, setResolvedUrl] = useState<string>(url || '');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
      if (status === 'uploading' && id) {
        const unsub = operationRunner.subscribe((tasks) => {
          const task = tasks.find(t => t.id === id);
          if (task) {
            setProgress(task.progress);
            if (task.status === 'completed' && (task as any).result?.url) {
              const updated = blocks.map((b: EditorBlock) => b.id === block.id ? {
                ...b,
                mediaData: { ...b.mediaData!, status: 'completed', url: (task as any).result.url }
              } : b);
              setBlocks(updated);
            }
          }
        });
        return unsub;
      }
    }, [status, id, block.id]);

    useEffect(() => {
      if (url?.startsWith('media:')) {
        const mediaId = url.split('media:')[1];
        let objectUrl = '';
        
        const loadMedia = async () => {
          const blob = await DataManager.getMedia(mediaId);
          if (blob) {
            objectUrl = URL.createObjectURL(blob);
            setResolvedUrl(objectUrl);
          }
        };
        loadMedia();
        return () => {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
      } else {
        setResolvedUrl(url || '');
      }
    }, [url]);

    const formatTime = (time: number) => {
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (status === 'uploading') {
      return (
        <div className="media-upload-block group relative flex items-center gap-4 bg-white/[0.02] border border-white/10 rounded-2xl p-4 overflow-hidden">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center animate-pulse">
            {type === 'audio' ? <Music className="text-blue-500" /> : type === 'video' ? <Video className="text-purple-500" /> : <FileText className="text-orange-500" />}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-black truncate text-white/80 mb-0.5">{fileName || 'Uploading file...'}</p>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{fileSize || '...'} • {progress}% Uploaded</p>
          </div>
          <Loader2 size={20} className="animate-spin text-blue-500/40" />
          <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      );
    }

    if (type === 'audio') {
      const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
      };

      const handleTimeUpdate = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          setDuration(audioRef.current.duration || 0);
        }
      };

      return (
        <div className="flex items-center gap-4 py-4 px-6 border border-white/5 bg-white/[0.03] rounded-2xl group transition-all">
          <audio ref={audioRef} src={resolvedUrl} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" />
          <button 
            onClick={togglePlay}
            className="w-12 h-12 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-90 transition-all text-white flex-shrink-0"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
          </button>
          <div className="flex-1 flex flex-col gap-1.5 min-w-[150px]">
             <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs font-black truncate text-white/80 tracking-tight max-w-[200px]">{fileName}</span>
                <span className="text-[10px] font-mono text-white/30 whitespace-nowrap">{formatTime(currentTime)} / {formatTime(duration)}</span>
             </div>
             <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-100"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
             </div>
          </div>
        </div>
      );
    }

    return (
      <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#0a0a0a] shadow-xl group">
        {type === 'image' && (
          <img src={resolvedUrl} referrerPolicy="no-referrer" className="w-full h-auto max-h-[60vh] object-contain" alt={fileName} />
        )}
        {type === 'video' && (
          <video src={resolvedUrl} controls className="w-full h-auto max-h-[60vh]" />
        )}
        <div className="flex items-center justify-between w-full p-4 border-t border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-3 overflow-hidden">
             {type === 'image' ? <ImageIcon size={14} className="text-blue-400" /> : <FileText size={14} className="text-orange-400" />}
             <span className="text-xs font-bold truncate opacity-40 text-left">{fileName}</span>
          </div>
          <button onClick={() => window.open(resolvedUrl, '_blank')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white">
             <Download size={14} className="opacity-45" />
          </button>
        </div>
      </div>
    );
  };

  const SandboxBlockItem = ({ block, handleBlockChange, isReadOnly }: any) => {
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

  return (
    <div className={cn("space-y-4 pb-24", className)}>
      {blocks.map((block: EditorBlock, idx: number) => {
        return (
          <div 
            key={block.id} 
            className="flex items-start gap-4 group/item relative justify-start antialiased rounded-lg transition-colors border border-transparent"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('border-blue-500/30', 'bg-blue-500/5');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('border-blue-500/30', 'bg-blue-500/5');
            }}
            onDrop={(e) => {
                 e.preventDefault();
                 e.currentTarget.classList.remove('border-blue-500/30', 'bg-blue-500/5');
                 const draggedId = e.dataTransfer.getData('text/plain');
                 if (draggedId && draggedId !== block.id && setBlocks) {
                    setBlocks((prev: EditorBlock[]) => {
                       const oldIdx = prev.findIndex((b: EditorBlock) => b.id === draggedId);
                       const newIdx = prev.findIndex((b: EditorBlock) => b.id === block.id);
                       if (oldIdx === -1 || newIdx === -1) return prev;
                       const result = Array.from(prev);
                       const [removed] = result.splice(oldIdx, 1);
                       result.splice(newIdx, 0, removed);
                       return result;
                    });
                 }
            }}
          >
            {/* Grab/Grip Handle for Drag to Reorder */}
            <div className={cn(
              "absolute right-full mr-2 top-1.5 flex items-center gap-1 transition-opacity cursor-grab active:cursor-grabbing",
              focusedId === block.id ? "opacity-100" : "opacity-0 group-hover/item:opacity-100"
            )}
              draggable
              onDragStart={(e) => {
                 e.dataTransfer.setData('text/plain', block.id);
                 e.dataTransfer.effectAllowed = 'move';
              }}
            >
              <div
                className="p-1 hover:bg-white/10 hover:text-white rounded transition-colors text-white/20"
              >
                <GripVertical size={16} />
              </div>
            </div>

            {/* Todo Type Icon */}
            {block.type === 'todo' && (
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setBlocks((prev: EditorBlock[]) => prev.map((b: EditorBlock) => b.id === block.id ? { ...b, checked: !b.checked } : b));
                }}
                className="mt-1 flex-shrink-0 text-blue-500 hover:text-blue-400 transition-colors"
              >
                {block.checked ? (
                  <CheckSquare size={19} className="text-blue-500 fill-blue-500/10" />
                ) : (
                  <Square size={19} className="editor-todo-box" />
                )}
              </button>
            )}

            {/* Bullet Type Dot */}
            {block.type === 'bullet' && (
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              </div>
            )}

            {/* Ordered Type Digit */}
            {block.type === 'ordered' && (
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1 text-[13px] font-mono font-black editor-muted">
                {idx + 1}.
              </div>
            )}

            {/* Special Callout Header Area */}
            {block.type === 'callout' && (
              <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-500 mt-1">
                <MessageSquare size={18} />
              </div>
            )}

            {/* Render Horizontal Rule (Divider) */}
            {block.type === 'hr' ? (
              <div className="w-full py-4 flex items-center justify-center self-center flex-1">
                <div className="w-full h-[1px] bg-white/5 border-b border-dashed border-white/5" />
              </div>
            ) : block.type === 'media' ? (
              <div className="flex-1 min-w-0">
                <MediaBlockItem block={block} />
              </div>
            ) : block.type === 'table' ? (
              <div className="flex-1 overflow-x-auto w-full border border-white/5 rounded-2xl bg-white/[0.01] p-1 shadow-inner ring-1 ring-white/5 antialiased">
                <table className="w-full border-collapse">
                  <tbody>
                    {(block.tableData || [["", ""]]).map((row, rIdx) => (
                      <tr key={rIdx} className="border-b last:border-b-0 border-white/5">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="border-r last:border-r-0 border-white/5 p-3 min-w-[120px] relative">
                            <div
                              contentEditable={!isReadOnly}
                              suppressContentEditableWarning={true}
                                onBlur={(e) => {
                                  const val = e.target.innerHTML;
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
            ) : block.type === 'code' ? (
              <div className="flex-1 border border-white/5 rounded-2xl overflow-hidden bg-[#070707] shadow-xl text-left antialiased">
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{block.language || 'Code Node'}</span>
                  <button
                    onClick={() => {
                      const temp = document.createElement('div');
                      temp.innerHTML = block.content;
                      navigator.clipboard.writeText(temp.textContent || temp.innerText || '');
                    }}
                    className="p-1 px-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all"
                  >
                    <Copy size={11} /> Copy Code
                  </button>
                </div>
                <div
                  contentEditable={!isReadOnly}
                  suppressContentEditableWarning={true}
                  onFocus={() => setFocusedId(block.id)}
                  onBlur={(e) => {
                    setFocusedId(null);
                    handleBlockChange(block.id, e.target.innerHTML);
                  }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }}
                  className="w-full bg-transparent p-5 font-mono text-sm leading-relaxed text-blue-300 border-none outline-none focus:outline-none min-h-[140px] whitespace-pre-wrap"
                  data-placeholder="// Paste your code block here..."
                />
              </div>
            ) : block.type === 'sandbox' ? (
              <SandboxBlockItem block={block} handleBlockChange={handleBlockChange} isReadOnly={isReadOnly} />
            ) : (
              /* Editable Content Area */
              <div 
                id={block.id}
                data-block-id={block.id}
                ref={(el) => { blockRefs.current[block.id] = el; }}
                contentEditable={!isReadOnly}
                suppressContentEditableWarning={true}
                onKeyDown={(e) => handleKeyDown(e, block, idx)}
                onFocus={() => setFocusedId(block.id)}
                onBlur={(e) => {
                  setFocusedId(null);
                  handleBlockChange(block.id, e.target.innerHTML);
                }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }}
                className={cn(
                  "flex-1 text-left min-h-[30px] font-sans focus:outline-none placeholder:opacity-20",
                  block.type === 'paragraph' && "text-[15px] sm:text-base leading-relaxed editor-p",
                  block.type === 'h1' && "text-3xl sm:text-4xl font-black tracking-tight pt-2 editor-h",
                  block.type === 'h2' && "text-2xl sm:text-3xl font-black tracking-tight pt-2 editor-h",
                  block.type === 'h3' && "text-xl sm:text-2xl font-black tracking-tight pt-1 editor-h",
                  block.type === 'quote' && "border-l-4 border-blue-500 pl-4 py-1 italic text-[15px] sm:text-base rounded-r-xl pr-4 editor-quote",
                  block.type === 'callout' && "p-4 rounded-2xl border border-blue-500/10 leading-relaxed text-[15px] sm:text-base editor-callout",
                  block.type === 'todo' && block.checked && "line-through editor-todo-checked"
                )}
                data-placeholder=""
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
