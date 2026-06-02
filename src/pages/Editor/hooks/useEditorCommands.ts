/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { EditorBlock, htmlToBlocks, blocksToHtml } from '../../../utils/blockParser';

interface EditorCommandsProps {
  blocks: EditorBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<EditorBlock[]>>;
  activeBlockId: string | null;
  setActiveBlockId: (id: string | null) => void;
  isReadOnly: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: any[];
  searchIndex: number;
  setSearchIndex: React.Dispatch<React.SetStateAction<number>>;
  setForceRefreshState: (state: any) => void;
  historyRef?: React.MutableRefObject<EditorBlock[][]>;
  historyPointer?: number;
  setHistoryPointer?: (p: number) => void;
}

export function useEditorCommands({
  blocks,
  setBlocks,
  activeBlockId,
  setActiveBlockId,
  isReadOnly,
  searchTerm,
  setSearchTerm,
  searchResults,
  searchIndex,
  setSearchIndex,
  setForceRefreshState,
  historyRef,
  historyPointer,
  setHistoryPointer
}: EditorCommandsProps) {
  
  const editor = useMemo(() => ({
    blocks,
    setBlocks,
    activeBlockId,
    setActiveBlockId,
    isReadOnly,
    isDestroyed: false,
    
    getHTML: () => blocksToHtml(blocks),

    isActive: (type: string, attrs?: any) => {
      const activeBlock = blocks.find(b => b.id === activeBlockId);
      
      if (type === 'bold') return document.queryCommandState?.('bold') || false;
      if (type === 'italic') return document.queryCommandState?.('italic') || false;
      if (type === 'strike') return document.queryCommandState?.('strikeThrough') || false;
      if (type === 'underline') return document.queryCommandState?.('underline') || false;
      if (type === 'code') return document.queryCommandValue?.('fontName')?.toLowerCase()?.includes('monospace') || false;
      
      if (type === 'heading') {
        if (!activeBlock) return false;
        if (attrs && attrs.level) return activeBlock.type === `h${attrs.level}`;
        return activeBlock.type === 'h1' || activeBlock.type === 'h2' || activeBlock.type === 'h3';
      }
      if (type === 'bulletList') return activeBlock?.type === 'bullet';
      if (type === 'orderedList') return activeBlock?.type === 'ordered';
      if (type === 'taskList') return activeBlock?.type === 'todo';
      if (type === 'blockquote') return activeBlock?.type === 'quote';
      if (type === 'codeBlock') return activeBlock?.type === 'code';
      return false;
    },

    storage: {
      get searchAndReplace() {
        return { results: searchResults, resultIndex: searchIndex };
      }
    },

    commands: {
      setContent: (html: string) => setBlocks(htmlToBlocks(html)),
      insertContent: (html: string) => setBlocks((prev) => [...prev, ...htmlToBlocks(html)]),
      setSearchTerm: (term: string) => setSearchTerm(term),
      nextSearchResult: () => setSearchIndex((p) => (searchResults.length > 0 ? (p + 1) % searchResults.length : 0)),
      previousSearchResult: () => setSearchIndex((p) => (searchResults.length > 0 ? (p - 1 + searchResults.length) % searchResults.length : 0))
    },

    chain: () => {
      const focusChain = {
        focus: () => {
          // Delay focus slightly so React rendering finishes
          setTimeout(() => {
            let idToFocus = activeBlockId;
            if (!idToFocus) {
              const activeEls = document.querySelectorAll('[contenteditable="true"]');
              if (activeEls.length > 0) {
                idToFocus = activeEls[activeEls.length - 1].getAttribute('id');
              }
            }
            if (idToFocus) {
              const el = document.getElementById(idToFocus);
              if (el) {
                el.focus();
                // Move cursor to end
                try {
                  const range = document.createRange();
                  range.selectNodeContents(el);
                  range.collapse(false);
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                } catch (err) {}
              }
            }
          }, 50);
          return focusChain;
        },
        toggleBold: () => {
          focusChain.focus();
          document.execCommand('bold', false);
          setForceRefreshState({});
          return focusChain;
        },
        toggleItalic: () => {
          focusChain.focus();
          document.execCommand('italic', false);
          setForceRefreshState({});
          return focusChain;
        },
        toggleStrike: () => {
          focusChain.focus();
          document.execCommand('strikeThrough', false);
          setForceRefreshState({});
          return focusChain;
        },
        toggleUnderline: () => {
          focusChain.focus();
          document.execCommand('underline', false);
          setForceRefreshState({});
          return focusChain;
        },
        toggleCode: () => {
          focusChain.focus();
          const isCode = document.queryCommandValue('fontName')?.toLowerCase()?.includes('monospace');
          document.execCommand('fontName', false, isCode ? 'inherit' : 'monospace');
          setForceRefreshState({});
          return focusChain;
        },
        toggleHeading: (attrs: { level: number }) => {
          setBlocks((prev) => {
            if (prev.length === 0) return prev;
            const activeId = activeBlockId || document.activeElement?.getAttribute('id') || prev[prev.length - 1].id;
            return prev.map(b => {
              if (b.id === activeId) {
                const targetType = `h${attrs.level}` as any;
                return { ...b, type: b.type === targetType ? 'paragraph' : targetType };
              }
              return b;
            });
          });
          setForceRefreshState({});
          return focusChain;
        },
        setHeading: (attrs: { level: number }) => focusChain.toggleHeading(attrs),
        toggleBulletList: () => {
          setBlocks((prev) => {
            if (prev.length === 0) return prev;
            const activeId = activeBlockId || document.activeElement?.getAttribute('id') || prev[prev.length - 1].id;
            return prev.map(b => b.id === activeId ? { ...b, type: b.type === 'bullet' ? 'paragraph' : 'bullet' } : b);
          });
          setForceRefreshState({});
          return focusChain;
        },
        toggleOrderedList: () => {
          setBlocks((prev) => {
            if (prev.length === 0) return prev;
            const activeId = activeBlockId || document.activeElement?.getAttribute('id') || prev[prev.length - 1].id;
            return prev.map(b => b.id === activeId ? { ...b, type: b.type === 'ordered' ? 'paragraph' : 'ordered' } : b);
          });
          setForceRefreshState({});
          return focusChain;
        },
        toggleTaskList: () => {
          setBlocks((prev) => {
            if (prev.length === 0) return prev;
            const activeId = activeBlockId || document.activeElement?.getAttribute('id') || prev[prev.length - 1].id;
            return prev.map(b => b.id === activeId ? { ...b, type: b.type === 'todo' ? 'paragraph' : 'todo', checked: false } : b);
          });
          setForceRefreshState({});
          return focusChain;
        },
        toggleBlockquote: () => {
          setBlocks((prev) => {
            if (prev.length === 0) return prev;
            const activeId = activeBlockId || document.activeElement?.getAttribute('id') || prev[prev.length - 1].id;
            return prev.map(b => b.id === activeId ? { ...b, type: b.type === 'quote' ? 'paragraph' : 'quote' } : b);
          });
          setForceRefreshState({});
          return focusChain;
        },
        toggleCodeBlock: () => {
          setBlocks((prev) => {
            if (prev.length === 0) return prev;
            const activeId = activeBlockId || document.activeElement?.getAttribute('id') || prev[prev.length - 1].id;
            return prev.map(b => b.id === activeId ? { ...b, type: b.type === 'code' ? 'paragraph' : 'code', language: 'javascript' } : b);
          });
          setForceRefreshState({});
          return focusChain;
        },
        setParagraph: () => {
          setBlocks((prev) => {
            if (prev.length === 0) return prev;
            const activeId = document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id') || prev[prev.length - 1].id;
            return prev.map(b => b.id === activeId ? { ...b, type: 'paragraph' } : b);
          });
          return focusChain;
        },
        setHorizontalRule: () => {
          setBlocks((prev) => {
            const activeId = document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id');
            const idx = prev.findIndex(b => b.id === activeId);
            const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'hr' as const, content: '' };
            if (idx > -1) {
              const res = [...prev];
              res.splice(idx + 1, 0, newBlock);
              return res;
            }
            return [...prev, newBlock];
          });
          return focusChain;
        },
        setCallout: () => {
          setBlocks((prev) => {
            const activeId = document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id');
            return prev.map(b => b.id === activeId ? { ...b, type: 'callout' } : b);
          });
          return focusChain;
        },
        setSandbox: () => {
          setBlocks((prev) => {
            const activeId = document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id');
            return prev.map(b => b.id === activeId ? { 
              ...b, 
              type: 'sandbox', 
              content: '<h3>Title</h3>\n<p>Write your HTML/CSS/JS code block here...</p>' 
            } : b);
          });
          return focusChain;
        },
        insertTable: (attrs: any) => {
          setBlocks((prev) => {
            const newTable: EditorBlock = {
              id: crypto.randomUUID(),
              type: 'table' as const,
              content: '',
              tableData: Array(attrs?.rows || 3).fill(null).map(() => Array(attrs?.cols || 3).fill(''))
            };
            const activeId = document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id');
            const idx = prev.findIndex(b => b.id === activeId);
            if (idx > -1) {
              const res = [...prev];
              res.splice(idx + 1, 0, newTable);
              return res;
            }
            return [...prev, newTable];
          });
          return focusChain;
        },
        setMedia: (attrs: any) => {
          setBlocks((prev) => {
            const mediaBlock = {
              id: crypto.randomUUID(),
              type: 'media' as any,
              content: '',
              mediaData: {
                id: attrs.id || crypto.randomUUID(),
                type: attrs.type || 'image',
                fileName: attrs.fileName || '',
                fileSize: attrs.fileSize || '',
                status: attrs.status || 'uploading',
                url: attrs.url || ''
              }
            };
            const activeId = document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id');
            const idx = prev.findIndex(b => b.id === activeId);
            if (idx > -1) {
              const res = [...prev];
              res.splice(idx + 1, 0, mediaBlock);
              return res;
            }
            return [...prev, mediaBlock];
          });
          return focusChain;
        },
        undo: () => {
          if (historyRef && setHistoryPointer && historyPointer !== undefined && historyPointer > 0) {
            const currentHistory = historyRef.current;
            const previousBlocks = currentHistory[historyPointer - 1];
            setBlocks(previousBlocks);
            setHistoryPointer(historyPointer - 1);
          } else {
            document.execCommand('undo', false);
          }
          return focusChain;
        },
        redo: () => {
          if (historyRef && setHistoryPointer && historyPointer !== undefined && historyPointer < historyRef.current.length - 1) {
            const currentHistory = historyRef.current;
            const nextBlocks = currentHistory[historyPointer + 1];
            setBlocks(nextBlocks);
            setHistoryPointer(historyPointer + 1);
          } else {
            document.execCommand('redo', false);
          }
          return focusChain;
        },
        run: () => {},
        runAudioGenerator: () => {
          setBlocks((prev) => {
            const newBlock = { 
              id: crypto.randomUUID(), 
              type: 'audio_generator' as any, 
              content: '',
              meta: { text: '', status: 'idle' }
            };
            const activeId = activeBlockId || document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id') || (prev.length > 0 ? prev[prev.length - 1].id : null);
            const idx = prev.findIndex(b => b.id === activeId);
            if (idx > -1) {
              const res = [...prev];
              res.splice(idx + 1, 0, newBlock);
              return res;
            }
            return [...prev, newBlock];
          });
          return focusChain;
        },
        runWebBookmark: () => {
          setBlocks((prev) => {
            const newBlock = { 
              id: crypto.randomUUID(), 
              type: 'bookmark' as any, 
              content: '',
              meta: { url: '', status: 'empty' }
            };
            const activeId = activeBlockId || document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id') || (prev.length > 0 ? prev[prev.length - 1].id : null);
            const idx = prev.findIndex(b => b.id === activeId);
            if (idx > -1) {
              const res = [...prev];
              res.splice(idx + 1, 0, newBlock);
              return res;
            }
            return [...prev, newBlock];
          });
          return focusChain;
        },
        toggleToggleList: () => {
          setBlocks((prev) => {
            if (prev.length === 0) return prev;
            const activeId = activeBlockId || document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id') || prev[prev.length - 1].id;
            return prev.map(b => b.id === activeId ? { ...b, type: b.type === 'toggle' ? 'paragraph' : 'toggle', isExpanded: true } : b);
          });
          setForceRefreshState({});
          return focusChain;
        },
        insertColumns: () => {
          setBlocks((prev) => {
            const newBlock = { id: crypto.randomUUID(), type: 'column' as any, content: '' };
            const activeId = activeBlockId || document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id') || (prev.length > 0 ? prev[prev.length - 1].id : null);
            const idx = prev.findIndex(b => b.id === activeId);
            if (idx > -1) {
              const res = [...prev];
              res.splice(idx + 1, 0, newBlock);
              return res;
            }
            return [...prev, newBlock];
          });
          return focusChain;
        },
        insertTableView: () => {
          setBlocks((prev) => {
            const newBlock = { id: crypto.randomUUID(), type: 'table_view' as any, content: '' };
            const activeId = activeBlockId || document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id') || (prev.length > 0 ? prev[prev.length - 1].id : null);
            const idx = prev.findIndex(b => b.id === activeId);
            if (idx > -1) {
              const res = [...prev];
              res.splice(idx + 1, 0, newBlock);
              return res;
            }
            return [...prev, newBlock];
          });
          return focusChain;
        },
        insertBoardView: () => {
          setBlocks((prev) => {
            const newBlock = { id: crypto.randomUUID(), type: 'board_view' as any, content: '' };
            const activeId = activeBlockId || document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id') || (prev.length > 0 ? prev[prev.length - 1].id : null);
            const idx = prev.findIndex(b => b.id === activeId);
            if (idx > -1) {
              const res = [...prev];
              res.splice(idx + 1, 0, newBlock);
              return res;
            }
            return [...prev, newBlock];
          });
          return focusChain;
        },
        insertGalleryView: () => {
          setBlocks((prev) => {
            const newBlock = { id: crypto.randomUUID(), type: 'gallery_view' as any, content: '' };
            const activeId = activeBlockId || document.activeElement?.getAttribute('data-block-id') || document.activeElement?.getAttribute('id') || (prev.length > 0 ? prev[prev.length - 1].id : null);
            const idx = prev.findIndex(b => b.id === activeId);
            if (idx > -1) {
              const res = [...prev];
              res.splice(idx + 1, 0, newBlock);
              return res;
            }
            return [...prev, newBlock];
          });
          return focusChain;
        }
      };
      return { focus: () => focusChain };
    },

    can: () => ({ undo: () => true, redo: () => true }),

    on: (event: string, handler: any) => window.addEventListener(`editor-event-${event}`, handler),
    off: (event: string, handler: any) => window.removeEventListener(`editor-event-${event}`, handler),
    triggerEvent: (event: string, detail?: any) => {
      window.dispatchEvent(new CustomEvent(`editor-event-${event}`, { detail }));
    }
  }), [blocks, activeBlockId, isReadOnly, searchResults, searchIndex, setBlocks, setSearchTerm, setSearchIndex, setForceRefreshState]);

  return editor;
}
