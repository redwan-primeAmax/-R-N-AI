/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Y from 'yjs';
import { EditorBlock } from '../../utils/blockParser';
import { SyncSnapshot, SubPageSnapshot } from './types';
import { isBengaliBoundary } from '../../utils/bengali';

export class YjsBridge {
  private doc: Y.Doc;
  private meta: Y.Map<any>;
  private order: Y.Array<string>;
  private data: Y.Map<Y.Map<any>>;
  private subPages: Y.Array<SubPageSnapshot>;
  private listeners: Set<(snap: SyncSnapshot) => void> = new Set();
  
  // Track meta for fast-path skips: blockId -> signature(type::length)
  private blockMetaSnapshot: Map<string, string> = new Map();

  constructor() {
    this.doc = new Y.Doc({ gc: true });
    this.meta = this.doc.getMap('meta');
    this.order = this.doc.getArray('order');
    this.data = this.doc.getMap('data');
    this.subPages = this.doc.getArray('subPages');

    this.doc.on('update', () => {
      const snap = this.snapshot();
      this.listeners.forEach(fn => fn(snap));
    });
  }

  public subscribe(fn: (snap: SyncSnapshot) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public snapshot(): SyncSnapshot {
    const blocks: EditorBlock[] = this.order.toArray().map(id => {
      const blockMap = this.data.get(id);
      if (!blockMap) return null;
      
      const contentText = blockMap.get('content') as Y.Text;
      return {
        id,
        type: blockMap.get('type') || 'paragraph',
        content: contentText ? contentText.toString() : '',
        checked: blockMap.get('checked'),
        language: blockMap.get('language'),
        emoji: blockMap.get('emoji'),
        tableData: blockMap.get('tableData') ? JSON.parse(blockMap.get('tableData')) : undefined,
        mediaData: blockMap.get('mediaData') ? JSON.parse(blockMap.get('mediaData')) : undefined,
        indent: blockMap.get('indent'),
        isExpanded: blockMap.get('isExpanded'),
        syncedBlockId: blockMap.get('syncedBlockId'),
        subPageId: blockMap.get('subPageId'),
        meta: blockMap.get('meta') ? JSON.parse(blockMap.get('meta')) : undefined,
      };
    }).filter(Boolean) as EditorBlock[];

    return {
      noteId: this.meta.get('noteId') || '',
      title: this.meta.get('title') || '',
      emoji: this.meta.get('emoji') || '📄',
      theme: this.meta.get('theme') || 'default',
      blocks,
      parentId: this.meta.get('parentId'),
      subPages: this.subPages.toArray()
    };
  }

  public applyLocalState(snap: SyncSnapshot): void {
    this.doc.transact(() => {
      // 1. Update metadata
      if (this.meta.get('noteId') !== snap.noteId) this.meta.set('noteId', snap.noteId);
      if (this.meta.get('title') !== snap.title) this.meta.set('title', snap.title);
      if (this.meta.get('emoji') !== snap.emoji) this.meta.set('emoji', snap.emoji);
      if (this.meta.get('theme') !== snap.theme) this.meta.set('theme', snap.theme);
      if (this.meta.get('parentId') !== snap.parentId) this.meta.set('parentId', snap.parentId);

      // 2. Update subpages (naive sync for now as it is low frequency)
      if (snap.subPages) {
        const currentSubPages = JSON.stringify(this.subPages.toArray());
        const nextSubPages = JSON.stringify(snap.subPages);
        if (currentSubPages !== nextSubPages) {
          this.subPages.delete(0, this.subPages.length);
          this.subPages.push(snap.subPages);
        }
      }

      // 3. Sync blocks order and data
      const nextOrder = snap.blocks.map(b => b.id);
      const currentOrder = this.order.toArray();
      
      // Optimized stable reconciliation for Y.Array
      let i = 0;
      while (i < nextOrder.length && i < this.order.length) {
        if (nextOrder[i] !== this.order.get(i)) {
          this.order.delete(i, 1);
          this.order.insert(i, [nextOrder[i]]);
        }
        i++;
      }
      if (i < nextOrder.length) {
        this.order.push(nextOrder.slice(i));
      } else if (i < this.order.length) {
        this.order.delete(i, this.order.length - i);
      }

      // Sync individual blocks
      snap.blocks.forEach(block => {
        let blockMap = this.data.get(block.id);
        if (!blockMap) {
          blockMap = new Y.Map();
          blockMap.set('content', new Y.Text());
          this.data.set(block.id, blockMap);
        }

        // Fast-path signature check
        const sig = `${block.type}::${block.content.length}`;
        const prevSig = this.blockMetaSnapshot.get(block.id);
        
        // Update basic props
        if (blockMap.get('type') !== block.type) blockMap.set('type', block.type);
        if (blockMap.get('checked') !== block.checked) blockMap.set('checked', block.checked);
        if (blockMap.get('language') !== block.language) blockMap.set('language', block.language);
        if (blockMap.get('emoji') !== block.emoji) blockMap.set('emoji', block.emoji);
        if (blockMap.get('indent') !== block.indent) blockMap.set('indent', block.indent);
        if (blockMap.get('isExpanded') !== block.isExpanded) blockMap.set('isExpanded', block.isExpanded);
        if (blockMap.get('syncedBlockId') !== block.syncedBlockId) blockMap.set('syncedBlockId', block.syncedBlockId);
        if (blockMap.get('subPageId') !== block.subPageId) blockMap.set('subPageId', block.subPageId);
        
        const metaStr = block.meta ? JSON.stringify(block.meta) : undefined;
        if (blockMap.get('meta') !== metaStr) blockMap.set('meta', metaStr);

        const tableDataStr = block.tableData ? JSON.stringify(block.tableData) : undefined;
        if (blockMap.get('tableData') !== tableDataStr) blockMap.set('tableData', tableDataStr);
        
        const mediaDataStr = block.mediaData ? JSON.stringify(block.mediaData) : undefined;
        if (blockMap.get('mediaData') !== mediaDataStr) blockMap.set('mediaData', mediaDataStr);

        // Content sync with Bengali-safe diff
        const yText = blockMap.get('content') as Y.Text;
        const currentContent = yText.toString();
        if (currentContent !== block.content) {
          this.applySafeDiff(yText, currentContent, block.content);
        }

        this.blockMetaSnapshot.set(block.id, sig);
      });

      // Cleanup removed blocks
      const nextIdSet = new Set(nextOrder);
      currentOrder.forEach(id => {
        if (!nextIdSet.has(id)) {
          this.data.delete(id);
          this.blockMetaSnapshot.delete(id);
        }
      });
    });
  }

  private applySafeDiff(yText: Y.Text, oldStr: string, newStr: string): void {
    let commonPrefix = 0;
    while (commonPrefix < oldStr.length && commonPrefix < newStr.length && oldStr[commonPrefix] === newStr[commonPrefix]) {
      commonPrefix++;
    }

    // Unicode / Bengali safety: Walk backwards to avoid splitting graphemes
    while (commonPrefix > 0) {
      const charCode = oldStr.charCodeAt(commonPrefix - 1);
      if (this.isUnsafeBoundary(charCode)) {
        commonPrefix--;
      } else {
        break;
      }
    }

    let commonSuffix = 0;
    while (
      commonSuffix < oldStr.length - commonPrefix &&
      commonSuffix < newStr.length - commonPrefix &&
      oldStr[oldStr.length - 1 - commonSuffix] === newStr[newStr.length - 1 - commonSuffix]
    ) {
      commonSuffix++;
    }

    // Unicode / Bengali safety for suffix
    while (commonSuffix > 0) {
      const charCode = oldStr.charCodeAt(oldStr.length - commonSuffix);
      if (this.isUnsafeBoundary(charCode)) {
        commonSuffix--;
      } else {
        break;
      }
    }

    const deletionLength = oldStr.length - commonPrefix - commonSuffix;
    if (deletionLength > 0) {
      yText.delete(commonPrefix, deletionLength);
    }
    const insertionText = newStr.slice(commonPrefix, newStr.length - commonSuffix);
    if (insertionText.length > 0) {
      yText.insert(commonPrefix, insertionText);
    }
  }

  private isUnsafeBoundary(charCode: number): boolean {
    return isBengaliBoundary(charCode);
  }

  public getDocUpdate(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  public applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update);
  }

  public getStateVector(): Uint8Array {
    return Y.encodeStateVector(this.doc);
  }

  public getDiff(stateVector: Uint8Array): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc, stateVector);
  }

  public destroy(): void {
    this.listeners.clear();
    this.doc.destroy();
  }
}
