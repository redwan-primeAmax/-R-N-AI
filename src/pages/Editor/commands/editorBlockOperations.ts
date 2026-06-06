/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EditorBlock } from '../../../utils/blockParser';

export function setParagraph(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  if (blocks.length === 0) return blocks;
  const activeId = document.activeElement?.getAttribute('data-block-id') 
    || document.activeElement?.getAttribute('id') 
    || activeBlockId 
    || blocks[blocks.length - 1].id;
  return blocks.map(b => b.id === activeId ? { ...b, type: 'paragraph' } : b);
}

export function toggleHeading(blocks: EditorBlock[], level: number, activeBlockId: string | null): EditorBlock[] {
  if (blocks.length === 0) return blocks;
  const activeId = activeBlockId 
    || document.activeElement?.getAttribute('id') 
    || (blocks.length > 0 ? blocks[blocks.length - 1].id : null);
  const activeBlock = blocks.find(b => b.id === activeId);
  if (!activeBlock) return blocks;
  const isSpecialized = activeBlock && !['paragraph', 'h1', 'h2', 'h3', 'quote', 'bullet', 'ordered', 'todo'].includes(activeBlock.type);
  const targetType = `h${level}` as any;
  if (isSpecialized) {
    const newBlock: EditorBlock = { id: crypto.randomUUID(), type: targetType, content: '' };
    const idx = blocks.findIndex(b => b.id === activeId);
    if (idx > -1) {
      const res = [...blocks];
      res.splice(idx + 1, 0, newBlock);
      return res;
    }
    return [...blocks, newBlock];
  }
  return blocks.map(b => b.id === activeId ? { ...b, type: b.type === targetType ? 'paragraph' : targetType } : b);
}

export function toggleBulletList(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  if (blocks.length === 0) return blocks;
  const activeId = activeBlockId 
    || document.activeElement?.getAttribute('id') 
    || (blocks.length > 0 ? blocks[blocks.length - 1].id : null);
  const activeBlock = blocks.find(b => b.id === activeId);
  if (!activeBlock) return blocks;
  const isSpecialized = activeBlock && !['paragraph', 'h1', 'h2', 'h3', 'quote', 'bullet', 'ordered', 'todo'].includes(activeBlock.type);
  if (isSpecialized) {
    const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'bullet' as any, content: '' };
    const idx = blocks.findIndex(b => b.id === activeId);
    if (idx > -1) {
      const res = [...blocks];
      res.splice(idx + 1, 0, newBlock);
      return res;
    }
    return [...blocks, newBlock];
  }
  return blocks.map(b => b.id === activeId ? { ...b, type: b.type === 'bullet' ? 'paragraph' : 'bullet' } : b);
}

export function toggleOrderedList(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  if (blocks.length === 0) return blocks;
  const activeId = activeBlockId 
    || document.activeElement?.getAttribute('id') 
    || (blocks.length > 0 ? blocks[blocks.length - 1].id : null);
  const activeBlock = blocks.find(b => b.id === activeId);
  if (!activeBlock) return blocks;
  const isSpecialized = activeBlock && !['paragraph', 'h1', 'h2', 'h3', 'quote', 'bullet', 'ordered', 'todo'].includes(activeBlock.type);
  if (isSpecialized) {
    const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'ordered' as any, content: '' };
    const idx = blocks.findIndex(b => b.id === activeId);
    if (idx > -1) {
      const res = [...blocks];
      res.splice(idx + 1, 0, newBlock);
      return res;
    }
    return [...blocks, newBlock];
  }
  return blocks.map(b => b.id === activeId ? { ...b, type: b.type === 'ordered' ? 'paragraph' : 'ordered' } : b);
}

export function toggleTaskList(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  if (blocks.length === 0) return blocks;
  const activeId = activeBlockId 
    || document.activeElement?.getAttribute('id') 
    || (blocks.length > 0 ? blocks[blocks.length - 1].id : null);
  const activeBlock = blocks.find(b => b.id === activeId);
  if (!activeBlock) return blocks;
  const isSpecialized = activeBlock && !['paragraph', 'h1', 'h2', 'h3', 'quote', 'bullet', 'ordered', 'todo'].includes(activeBlock.type);
  if (isSpecialized) {
    const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'todo' as any, content: '', checked: false };
    const idx = blocks.findIndex(b => b.id === activeId);
    if (idx > -1) {
      const res = [...blocks];
      res.splice(idx + 1, 0, newBlock);
      return res;
    }
    return [...blocks, newBlock];
  }
  return blocks.map(b => b.id === activeId ? { ...b, type: b.type === 'todo' ? 'paragraph' : 'todo', checked: false } : b);
}

export function toggleBlockquote(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  if (blocks.length === 0) return blocks;
  const activeId = activeBlockId 
    || document.activeElement?.getAttribute('id') 
    || (blocks.length > 0 ? blocks[blocks.length - 1].id : null);
  const activeBlock = blocks.find(b => b.id === activeId);
  if (!activeBlock) return blocks;
  const isSpecialized = activeBlock && !['paragraph', 'h1', 'h2', 'h3', 'quote', 'bullet', 'ordered', 'todo'].includes(activeBlock.type);
  if (isSpecialized) {
    const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'quote' as any, content: '' };
    const idx = blocks.findIndex(b => b.id === activeId);
    if (idx > -1) {
      const res = [...blocks];
      res.splice(idx + 1, 0, newBlock);
      return res;
    }
    return [...blocks, newBlock];
  }
  return blocks.map(b => b.id === activeId ? { ...b, type: b.type === 'quote' ? 'paragraph' : 'quote' } : b);
}

export function toggleCodeBlock(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  if (blocks.length === 0) return blocks;
  const activeId = activeBlockId 
    || document.activeElement?.getAttribute('id') 
    || (blocks.length > 0 ? blocks[blocks.length - 1].id : null);
  const activeBlock = blocks.find(b => b.id === activeId);
  if (!activeBlock) return blocks;
  const isSpecialized = activeBlock && !['paragraph', 'h1', 'h2', 'h3', 'quote', 'bullet', 'ordered', 'todo'].includes(activeBlock.type);
  if (isSpecialized) {
    const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'code' as any, content: '', language: 'javascript' };
    const idx = blocks.findIndex(b => b.id === activeId);
    if (idx > -1) {
      const res = [...blocks];
      res.splice(idx + 1, 0, newBlock);
      return res;
    }
    return [...blocks, newBlock];
  }
  return blocks.map(b => b.id === activeId ? { ...b, type: b.type === 'code' ? 'paragraph' : 'code', language: 'javascript' } : b);
}
