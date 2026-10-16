/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
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
  blocksRefs?: React.MutableRefObject<Record<string, HTMLElement>>;
  blocksRef: React.MutableRefObject<EditorBlock[]>;
}

/* ------------------------------------------------------------------ */
/* Highlight helpers (shared by the focus chain below)                 */
/*                                                                     */
/* Highlighting is implemented with real <mark class="hl"> elements    */
/* instead of execCommand('backColor'). That guarantees:               */
/*  - the highlight renders IMMEDIATELY, including for text typed      */
/*    right after picking a color (a caret mark is planted first);     */
/*  - deep, solid highlight colors stay legible;                       */
/*  - highlight markup is fully independent of text color spans, so    */
/*    changing one never clashes with the other.                       */
/* ------------------------------------------------------------------ */

function collectTextNodesInRange(range: Range): Text[] {
  const root = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? (range.commonAncestorContainer as Element)
    : range.commonAncestorContainer.parentElement;
  if (!root) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  const nodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) nodes.push(current as Text);
  return nodes;
}

function unwrapMark(mark: HTMLElement) {
  const parent = mark.parentNode;
  if (!parent) return;
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
  parent.removeChild(mark);
  parent.normalize();
}

function wrapRangeWithMark(range: Range, color: string) {
  for (const textNode of collectTextNodesInRange(range)) {
    let node: Text = textNode;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.length;
    if (end < node.length) node.splitText(end);
    let middle: Text = node;
    if (start > 0) middle = node.splitText(start);
    if (!middle.length) continue;
    if (middle.parentElement?.tagName === 'MARK') {
      // Already highlighted — just recolor in place, never nest marks.
      (middle.parentElement as HTMLElement).style.backgroundColor = color;
      continue;
    }
    const mark = document.createElement('mark');
    mark.className = 'hl';
    mark.style.backgroundColor = color;
    middle.parentNode?.insertBefore(mark, middle);
    mark.appendChild(middle);
  }
}

function clearHighlightInRange(range: Range) {
  const anchorEl = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? (range.startContainer as Element)
    : range.startContainer.parentElement;
  if (range.collapsed) {
    const mark = anchorEl?.closest('mark');
    if (mark) {
      const parent = mark.parentNode;
      unwrapMark(mark as HTMLElement);
      // Keep the caret where the user was working.
      if (parent) {
        const sel = window.getSelection();
        const caret = document.createRange();
        caret.selectNodeContents(parent);
        caret.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(caret);
      }
    }
    return;
  }
  const marks = new Set<HTMLElement>();
  for (const textNode of collectTextNodesInRange(range)) {
    const mark = textNode.parentElement?.closest('mark');
    if (mark) marks.add(mark as HTMLElement);
  }
  marks.forEach(unwrapMark);
}

/** Plant a caret-sized mark so the very next typed characters are highlighted. */
function plantTypingMark(range: Range, color: string) {
  const mark = document.createElement('mark');
  mark.className = 'hl';
  mark.style.backgroundColor = color;
  mark.appendChild(document.createTextNode('\u200B'));
  range.insertNode(mark);
  const caret = document.createRange();
  caret.setStart(mark.firstChild as Node, 1);
  caret.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(caret);
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
  setHistoryPointer,
  blocksRefs,
  blocksRef
}: EditorCommandsProps) {

  // Custom in-memory event hub listeners registry to avoid window event pollution/clashes
  const listenersRef = useRef<Record<string, Array<(detail?: any) => void>>>({});

  /** Persist the active block's live DOM back into block state. */
  const syncActiveBlockContent = () => {
    if (document.activeElement instanceof HTMLElement) {
      const activeId = document.activeElement.getAttribute('data-block-id') || document.activeElement.getAttribute('id');
      if (activeId) {
        const html = document.activeElement.innerHTML;
        setBlocks(prev => prev.map(b => b.id === activeId ? { ...b, content: html } : b));
      }
    }
  };

  const editor = useMemo(() => {
    const focusChain = {
      focus: (id?: string) => {
        focusEditor(id || activeBlockId);
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
        const activeEl = document.activeElement as HTMLElement;
        if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
          focusChain.focus();
        }
        // CSS mode => color is serialized as <span style="color:…">, fully
        // independent of <mark> highlight elements.
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, color);
        syncActiveBlockContent();
        setForceRefreshState({});
        return focusChain;
      },
      /**
       * Apply (or clear, with null/'transparent') the text highlight.
       * Works on a selection — and on a collapsed caret, where a caret
       * mark is planted so newly typed text is highlighted immediately.
       */
      setHighlight: (color: string | null) => {
        const activeEl = document.activeElement as HTMLElement;
        if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
          focusChain.focus();
        }
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (!color || color === 'transparent') {
            clearHighlightInRange(range);
          } else if (range.collapsed) {
            plantTypingMark(range, color);
          } else {
            wrapRangeWithMark(range, color);
          }
        }
        syncActiveBlockContent();
        setForceRefreshState({});
        return focusChain;
      },
      toggleHighlight: (color: string) => {
        const sel = window.getSelection();
        const anchorEl = sel?.anchorNode
          ? (sel.anchorNode.nodeType === Node.ELEMENT_NODE ? (sel.anchorNode as Element) : sel.anchorNode.parentElement)
          : null;
        const insideMark = !!anchorEl?.closest('mark');
        return focusChain.setHighlight(insideMark ? null : color);
      },
      // Backwards-compatible alias: background color == highlight.
      setBackgroundColor: (color: string) => focusChain.setHighlight(color),
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
        const { blocks: nextBlocks, newId } = insertBlock(blocksRef.current, type, activeBlockId);
        setBlocks(nextBlocks);
        
        // Wait for render and focus/scroll
        setTimeout(() => {
          if (blocksRefs?.current?.[newId]) {
            blocksRefs.current[newId].focus();
            blocksRefs.current[newId].scrollIntoView({ behavior: 'smooth', block: 'center' });
            setActiveBlockId(newId);
          }
        }, 100);
        
        return focusChain;
      }
    };

    return {
      get blocks() { return blocksRef.current; },
      setBlocks,
      activeBlockId,
      setActiveBlockId,
      isReadOnly,
      isDestroyed: false,
      
      getHTML: () => blocksToHtml(blocksRef.current),

      isActive: (type: string, attrs?: any) => {
        const activeBlock = blocksRef.current.find(b => b.id === activeBlockId);
        
        if (type === 'bold') return document.queryCommandState?.('bold') || false;
        if (type === 'italic') return document.queryCommandState?.('italic') || false;
        if (type === 'strike') return document.queryCommandState?.('strikeThrough') || false;
        if (type === 'underline') return document.queryCommandState?.('underline') || false;
        if (type === 'code') return document.queryCommandValue?.('fontName')?.toLowerCase()?.includes('monospace') || false;
        if (type === 'highlight') {
          const sel = window.getSelection();
          const anchorEl = sel?.anchorNode
            ? (sel.anchorNode.nodeType === Node.ELEMENT_NODE ? (sel.anchorNode as Element) : sel.anchorNode.parentElement)
            : null;
          return !!anchorEl?.closest('mark');
        }

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

      chain: () => focusChain,

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
  };
}, [activeBlockId, isReadOnly, searchResults, searchIndex, setBlocks, setSearchTerm, setSearchIndex, setForceRefreshState, historyRef, historyPointer, setHistoryPointer, blocksRef]);


  return editor;
}
