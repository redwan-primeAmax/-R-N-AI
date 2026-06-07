/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useRef } from 'react';
import { EditorBlock, htmlToBlocks, blocksToHtml } from '../../../utils/blockParser';
import { focusEditor } from '../commands/editorChainFocus';
import {
  setParagraph,
  toggleHeading,
  toggleBulletList,
  toggleOrderedList,
  toggleTaskList,
  toggleBlockquote,
  toggleCodeBlock
} from '../commands/editorBlockOperations';
import {
  setHorizontalRule,
  setCallout,
  setSandbox,
  insertTable,
  setMedia,
  runAudioGenerator,
  runWebBookmark,
  toggleToggleList,
  insertColumns,
  insertTableView,
  setToc,
  setSynced,
  toggleToggleHeading,
  insertDatabase,
  insertEmbed,
  insertBlock
} from '../commands/editorSpecialBlocks';
import { runUndo, runRedo } from '../commands/editorHistory';

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
  
  // Custom in-memory event hub listeners registry to avoid window event pollution/clashes
  const listenersRef = useRef<Record<string, Array<(detail?: any) => void>>>({});
  
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
          focusEditor(activeBlockId);
          return focusChain;
        },
        toggleBold: () => {
          const activeEl = document.activeElement as HTMLElement;
          if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
            focusChain.focus();
          }
          document.execCommand('bold', false);
          if (document.activeElement instanceof HTMLElement) {
            const activeId = document.activeElement.getAttribute('data-block-id') || document.activeElement.getAttribute('id');
            if (activeId) {
              const html = document.activeElement.innerHTML;
              setBlocks(prev => prev.map(b => b.id === activeId ? { ...b, content: html } : b));
            }
          }
          setForceRefreshState({});
          return focusChain;
        },
        toggleItalic: () => {
          const activeEl = document.activeElement as HTMLElement;
          if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
            focusChain.focus();
          }
          document.execCommand('italic', false);
          if (document.activeElement instanceof HTMLElement) {
            const activeId = document.activeElement.getAttribute('data-block-id') || document.activeElement.getAttribute('id');
            if (activeId) {
              const html = document.activeElement.innerHTML;
              setBlocks(prev => prev.map(b => b.id === activeId ? { ...b, content: html } : b));
            }
          }
          setForceRefreshState({});
          return focusChain;
        },
        toggleStrike: () => {
          const activeEl = document.activeElement as HTMLElement;
          if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
            focusChain.focus();
          }
          document.execCommand('strikeThrough', false);
          if (document.activeElement instanceof HTMLElement) {
            const activeId = document.activeElement.getAttribute('data-block-id') || document.activeElement.getAttribute('id');
            if (activeId) {
              const html = document.activeElement.innerHTML;
              setBlocks(prev => prev.map(b => b.id === activeId ? { ...b, content: html } : b));
            }
          }
          setForceRefreshState({});
          return focusChain;
        },
        toggleUnderline: () => {
          const activeEl = document.activeElement as HTMLElement;
          if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
            focusChain.focus();
          }
          document.execCommand('underline', false);
          if (document.activeElement instanceof HTMLElement) {
            const activeId = document.activeElement.getAttribute('data-block-id') || document.activeElement.getAttribute('id');
            if (activeId) {
              const html = document.activeElement.innerHTML;
              setBlocks(prev => prev.map(b => b.id === activeId ? { ...b, content: html } : b));
            }
          }
          setForceRefreshState({});
          return focusChain;
        },
        toggleCode: () => {
          const activeEl = document.activeElement as HTMLElement;
          if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
            focusChain.focus();
          }
          const isCode = document.queryCommandValue('fontName')?.toLowerCase()?.includes('monospace');
          document.execCommand('fontName', false, isCode ? 'inherit' : 'monospace');
          if (document.activeElement instanceof HTMLElement) {
            const activeId = document.activeElement.getAttribute('data-block-id') || document.activeElement.getAttribute('id');
            if (activeId) {
              const html = document.activeElement.innerHTML;
              setBlocks(prev => prev.map(b => b.id === activeId ? { ...b, content: html } : b));
            }
          }
          setForceRefreshState({});
          return focusChain;
        },
        setTextColor: (color: string) => {
          document.execCommand('foreColor', false, color);
          if (document.activeElement instanceof HTMLElement) {
            const activeId = document.activeElement.getAttribute('data-block-id') || document.activeElement.getAttribute('id');
            if (activeId) {
              const html = document.activeElement.innerHTML;
              setBlocks(prev => prev.map(b => b.id === activeId ? { ...b, content: html } : b));
            }
          }
          setForceRefreshState({});
          return focusChain;
        },
        setBackgroundColor: (color: string) => {
          document.execCommand('backColor', false, color);
          if (document.activeElement instanceof HTMLElement) {
            const activeId = document.activeElement.getAttribute('data-block-id') || document.activeElement.getAttribute('id');
            if (activeId) {
              const html = document.activeElement.innerHTML;
              setBlocks(prev => prev.map(b => b.id === activeId ? { ...b, content: html } : b));
            }
          }
          setForceRefreshState({});
          return focusChain;
        },
        toggleHeading: (attrs: { level: number }) => {
          setBlocks(prev => toggleHeading(prev, attrs.level, activeBlockId));
          setForceRefreshState({});
          return focusChain;
        },
        setHeading: (attrs: { level: number }) => focusChain.toggleHeading(attrs),
        toggleBulletList: () => {
          setBlocks(prev => toggleBulletList(prev, activeBlockId));
          setForceRefreshState({});
          return focusChain;
        },
        toggleOrderedList: () => {
          setBlocks(prev => toggleOrderedList(prev, activeBlockId));
          setForceRefreshState({});
          return focusChain;
        },
        toggleTaskList: () => {
          setBlocks(prev => toggleTaskList(prev, activeBlockId));
          setForceRefreshState({});
          return focusChain;
        },
        toggleBlockquote: () => {
          setBlocks(prev => toggleBlockquote(prev, activeBlockId));
          setForceRefreshState({});
          return focusChain;
        },
        toggleCodeBlock: () => {
          setBlocks(prev => toggleCodeBlock(prev, activeBlockId));
          setForceRefreshState({});
          return focusChain;
        },
        setParagraph: () => {
          setBlocks(prev => setParagraph(prev, activeBlockId));
          return focusChain;
        },
        setHorizontalRule: () => {
          setBlocks(prev => setHorizontalRule(prev, activeBlockId));
          return focusChain;
        },
        setCallout: () => {
          setBlocks(prev => setCallout(prev, activeBlockId));
          return focusChain;
        },
        setSandbox: () => {
          setBlocks(prev => setSandbox(prev, activeBlockId));
          return focusChain;
        },
        insertTable: (attrs: any) => {
          setBlocks(prev => insertTable(prev, attrs, activeBlockId));
          return focusChain;
        },
        setMedia: (attrs: any) => {
          setBlocks(prev => setMedia(prev, attrs, activeBlockId));
          return focusChain;
        },
        undo: () => {
          runUndo(historyRef, historyPointer, setHistoryPointer, setBlocks);
          return focusChain;
        },
        redo: () => {
          runRedo(historyRef, historyPointer, setHistoryPointer, setBlocks);
          return focusChain;
        },
        run: () => {},
        runAudioGenerator: () => {
          setBlocks(prev => runAudioGenerator(prev, activeBlockId));
          return focusChain;
        },
        runWebBookmark: () => {
          setBlocks(prev => runWebBookmark(prev, activeBlockId));
          return focusChain;
        },
        toggleToggleList: () => {
          setBlocks(prev => toggleToggleList(prev, activeBlockId));
          setForceRefreshState({});
          return focusChain;
        },
        insertColumns: () => {
          setBlocks(prev => insertColumns(prev, activeBlockId));
          return focusChain;
        },
        insertTableView: () => {
          setBlocks(prev => insertTableView(prev, activeBlockId));
          return focusChain;
        },
        setToc: () => {
          setBlocks(prev => setToc(prev, activeBlockId));
          return focusChain;
        },
        setSynced: () => {
          setBlocks(prev => setSynced(prev, activeBlockId));
          return focusChain;
        },
        toggleToggleHeading: (attrs: { level: number }) => {
          setBlocks(prev => toggleToggleHeading(prev, attrs.level, activeBlockId));
          setForceRefreshState({});
          return focusChain;
        },
        insertDatabase: () => {
          setBlocks(prev => insertDatabase(prev, activeBlockId));
          return focusChain;
        },
        insertEmbed: () => {
          setBlocks(prev => insertEmbed(prev, activeBlockId));
          return focusChain;
        },
        insertBlock: (type: string) => {
          setBlocks(prev => insertBlock(prev, type, activeBlockId));
          return focusChain;
        }
      };
      return { focus: () => focusChain };
    },

    can: () => ({ undo: () => true, redo: () => true }),

    on: (event: string, handler: any) => {
      if (!listenersRef.current[event]) {
        listenersRef.current[event] = [];
      }
      listenersRef.current[event].push(handler);
    },
    off: (event: string, handler: any) => {
      if (listenersRef.current[event]) {
        listenersRef.current[event] = listenersRef.current[event].filter(h => h !== handler);
      }
    },
    triggerEvent: (event: string, detail?: any) => {
      if (listenersRef.current[event]) {
        listenersRef.current[event].forEach(handler => {
          try {
            handler({ detail });
          } catch (e) {
            console.error(`Error executing event handler for ${event}`, e);
          }
        });
      }
    }
  }), [blocks, activeBlockId, isReadOnly, searchResults, searchIndex, setBlocks, setSearchTerm, setSearchIndex, setForceRefreshState, historyRef, historyPointer, setHistoryPointer]);

  return editor;
}
