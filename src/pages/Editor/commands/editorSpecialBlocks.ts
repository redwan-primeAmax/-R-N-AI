/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EditorBlock } from '../../../utils/blockParser';

function getActiveIndexAndId(blocks: EditorBlock[], activeBlockId: string | null) {
  const activeId = activeBlockId 
    || document.activeElement?.getAttribute('data-block-id') 
    || document.activeElement?.getAttribute('id') 
    || (blocks.length > 0 ? blocks[blocks.length - 1].id : null);
  const idx = blocks.findIndex(b => b.id === activeId);
  return { activeId, idx };
}

export function setHorizontalRule(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'hr', content: '' };
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, newBlock);
    return res;
  }
  return [...blocks, newBlock];
}

export function setCallout(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const { activeId } = getActiveIndexAndId(blocks, activeBlockId);
  const activeBlock = blocks.find(b => b.id === activeId);
  const isSpecialized = activeBlock && !['paragraph', 'h1', 'h2', 'h3', 'quote', 'bullet', 'ordered', 'todo'].includes(activeBlock.type);
  if (isSpecialized || !activeId || !activeBlock) {
    const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'callout', content: '', emoji: '💡' };
    const { idx } = getActiveIndexAndId(blocks, activeId);
    if (idx > -1) {
      const res = [...blocks];
      res.splice(idx + 1, 0, newBlock);
      return res;
    }
    return [...blocks, newBlock];
  }
  return blocks.map(b => b.id === activeId ? { ...b, type: 'callout' } : b);
}

export function setSandbox(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const { activeId } = getActiveIndexAndId(blocks, activeBlockId);
  const activeBlock = blocks.find(b => b.id === activeId);
  const isSpecialized = activeBlock && !['paragraph', 'h1', 'h2', 'h3', 'quote', 'bullet', 'ordered', 'todo'].includes(activeBlock.type);
  const templateHtml = '<h3>Title</h3>\n<p>Write your HTML/CSS/JS code block here...</p>';
  if (isSpecialized || !activeId || !activeBlock) {
    const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'sandbox', content: templateHtml };
    const { idx } = getActiveIndexAndId(blocks, activeId);
    if (idx > -1) {
      const res = [...blocks];
      res.splice(idx + 1, 0, newBlock);
      return res;
    }
    return [...blocks, newBlock];
  }
  return blocks.map(b => b.id === activeId ? { ...b, type: 'sandbox', content: templateHtml } : b);
}

export function insertTable(blocks: EditorBlock[], attrs: any, activeBlockId: string | null): EditorBlock[] {
  const newTable: EditorBlock = {
    id: crypto.randomUUID(),
    type: 'table',
    content: '',
    tableData: Array(attrs?.rows || 3).fill(null).map(() => Array(attrs?.cols || 3).fill(''))
  };
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, newTable);
    return res;
  }
  return [...blocks, newTable];
}

export function setMedia(blocks: EditorBlock[], attrs: any, activeBlockId: string | null): EditorBlock[] {
  const mediaBlock: EditorBlock = {
    id: crypto.randomUUID(),
    type: 'media',
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
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, mediaBlock);
    return res;
  }
  return [...blocks, mediaBlock];
}

export function runAudioGenerator(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const newBlock: EditorBlock = { 
    id: crypto.randomUUID(), 
    type: 'audio_generator', 
    content: '',
    meta: { text: '', status: 'idle' }
  };
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, newBlock);
    return res;
  }
  return [...blocks, newBlock];
}

export function runWebBookmark(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const newBlock: EditorBlock = { 
    id: crypto.randomUUID(), 
    type: 'bookmark', 
    content: '',
    meta: { url: '', status: 'empty' }
  };
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, newBlock);
    return res;
  }
  return [...blocks, newBlock];
}

export function toggleToggleList(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const { activeId } = getActiveIndexAndId(blocks, activeBlockId);
  if (!activeId) return blocks;
  return blocks.map(b => b.id === activeId ? { ...b, type: b.type === 'toggle' ? 'paragraph' : 'toggle', isExpanded: true } : b);
}

export function insertColumns(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'column', content: '' };
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, newBlock);
    return res;
  }
  return [...blocks, newBlock];
}

export function insertTableView(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'table_view', content: '' };
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, newBlock);
    return res;
  }
  return [...blocks, newBlock];
}

export function setToc(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'toc', content: '' };
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, newBlock);
    return res;
  }
  return [...blocks, newBlock];
}

export function setSynced(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const newBlock: EditorBlock = { id: crypto.randomUUID(), type: 'synced', content: '', syncedBlockId: crypto.randomUUID() };
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, newBlock);
    return res;
  }
  return [...blocks, newBlock];
}

export function toggleToggleHeading(blocks: EditorBlock[], level: number, activeBlockId: string | null): EditorBlock[] {
  if (blocks.length === 0) return blocks;
  const activeId = activeBlockId || document.activeElement?.getAttribute('id') || blocks[blocks.length - 1].id;
  const targetType = `toggle_h${level}` as any;
  return blocks.map(b => b.id === activeId ? { ...b, type: b.type === targetType ? 'paragraph' : targetType, isExpanded: true } : b);
}

export function insertDatabase(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const newBlock: EditorBlock = { 
    id: crypto.randomUUID(), 
    type: 'database', 
    content: '',
    databaseData: {
      layout: 'table',
      columns: [
        { id: 'title', name: 'Name', type: 'text' },
        { id: 'status', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
        { id: 'priority', name: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
        { id: 'date', name: 'Date', type: 'date' }
      ],
      rows: [
        { id: 'row-1', title: '🚀 Launch beta version', status: 'In Progress', priority: 'High', date: '2026-06-06' },
        { id: 'row-2', title: '🎨 Refactor block editor styles', status: 'To Do', priority: 'Medium', date: '2026-06-08' },
        { id: 'row-3', title: '📦 Package core database layouts', status: 'Done', priority: 'High', date: '2026-06-06' }
      ]
    }
  };
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, newBlock);
    return res;
  }
  return [...blocks, newBlock];
}

export function insertEmbed(blocks: EditorBlock[], activeBlockId: string | null): EditorBlock[] {
  const newBlock: EditorBlock = { 
    id: crypto.randomUUID(), 
    type: 'embed', 
    content: '',
    embedData: { provider: 'custom', url: '' }
  };
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, newBlock);
    return res;
  }
  return [...blocks, newBlock];
}

export function insertBlock(blocks: EditorBlock[], type: string, activeBlockId: string | null): { blocks: EditorBlock[], newId: string } {
  const newId = crypto.randomUUID();
  const newBlock: EditorBlock = { 
    id: newId, 
    type: type as any, 
    content: ''
  };
  const { idx } = getActiveIndexAndId(blocks, activeBlockId);
  if (idx > -1) {
    const res = [...blocks];
    res.splice(idx + 1, 0, newBlock);
    return { blocks: res, newId };
  }
  return { blocks: [...blocks, newBlock], newId };
}
