/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { db } from '../DexieDB';

const activeObjectUrls = new Set<string>();
const objectUrlToMediaId = new Map<string, string>();

/** Scan references once for both stats and deletion. Encrypted payloads are
 * deliberately conservative: without decryption we cannot prove any blob unused.
 * The caller's transaction prevents a note save racing garbage collection.
 */
async function collectUnusedMedia(): Promise<{ ids: string[]; size: number }> {
  const referenced = new Set<string>();
  let opaque = false;
  const scan = (value: unknown) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (!text) return;
    if (text.includes('RNV1:')) opaque = true;
    for (const match of text.matchAll(/(?:blob-id:|media:)([a-zA-Z0-9_-]+)/g)) referenced.add(match[1]);
  };
  await db.notes.each(note => {
    if (note.isLocked) opaque = true;
    scan(note); // Includes snapshots, comments and cover images, not just body.
    note.mediaRefs?.forEach(ref => referenced.add(ref.localId));
  });
  await db.note_versions.each(scan);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('note_draft_') || key?.startsWith('note_backup_')) scan(localStorage.getItem(key));
  }
  if (opaque) return { ids: [], size: 0 };
  const ids: string[] = [];
  let size = 0;
  await db.media.each(item => {
    if (!referenced.has(item.id)) { ids.push(item.id); size += item.blob.size; }
  });
  return { ids, size };
}

export const MediaService = {
  async saveMedia(blob: Blob): Promise<string> {
    const id = `media_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const cleanBlob = new Blob([blob], { type: blob.type });
    await db.media.put({ id, blob: cleanBlob });
    return id;
  },

  async getMedia(id: string): Promise<Blob | null> {
    const record = await db.media.get(id);
    return record ? record.blob : null;
  },

  async deleteMedia(id: string): Promise<void> {
    await db.media.delete(id);
  },

  async uploadMedia(file: File, _path?: string): Promise<string> {
    const id = await this.saveMedia(file);
    return `media:${id}`;
  },

  async resolveMediaUrls(content: string): Promise<string> {
    if (!content || !content.includes('blob-id:')) return content;

    const blobIdRegex = /blob-id:([a-zA-Z0-9_-]+)/g;
    const matches = Array.from(content.matchAll(blobIdRegex));
    if (matches.length === 0) return content;

    let resolved = content;
    const uniqueIds = Array.from(new Set(matches.map(m => m[1])));
    
    // Batch fetch media to reduce DB roundtrips
    const mediaItems = await db.media.where('id').anyOf(uniqueIds).toArray();
    const idToUrlMap = new Map<string, string>();

    mediaItems.forEach(item => {
      const url = URL.createObjectURL(item.blob);
      activeObjectUrls.add(url);
      objectUrlToMediaId.set(url, item.id);
      idToUrlMap.set(item.id, url);
    });

    return content.replace(blobIdRegex, (match, id) => {
      return idToUrlMap.get(id) || match;
    });
  },

  /**
   * Revokes all active object URLs to prevent memory leaks
   */
  revokeMediaUrls(): void {
    if (activeObjectUrls.size === 0) return;
    activeObjectUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // Ignore errors for already revoked URLs
      }
    });
    activeObjectUrls.clear();
    objectUrlToMediaId.clear();
  },

  /**
   * Extracts data URIs (images, videos, audio) from HTML content
   * and stores them as separate Blob records to keep notes lightweight.
   */
  async extractMediaFromContent(content: string): Promise<string> {
    if (!content) return '';

    // ⚡ Fast bail-out: if no data URIs or blob URLs, skip entirely
    if (!content.includes('data:image/') && 
        !content.includes('data:video/') && 
        !content.includes('data:audio/') &&
        !content.includes('blob-id:') &&
        objectUrlToMediaId.size === 0) {
      return content;
    }

    let processed = content;
    if (objectUrlToMediaId.size > 0) {
      objectUrlToMediaId.forEach((mediaId, url) => {
        if (processed.includes(url)) {
          processed = processed.split(url).join(`blob-id:${mediaId}`);
        }
      });
    }

    if (!processed.includes('data:image/') && !processed.includes('data:video/') && !processed.includes('data:audio/')) {
      return processed;
    }

    const dataUriRegex = /src="data:(image|video|audio)\/([a-zA-Z0-9\+\-]+);base64,([^"]*)"/g;
    const matches = Array.from(processed.matchAll(dataUriRegex));
    if (matches.length === 0) return processed;

    for (const match of matches) {
      const category = match[1];
      const subtype = match[2];
      const mimeType = `${category}/${subtype}`;
      const base64Data = match[3];

      try {
        // Optimized base64 to blob conversion
        const blob = await fetch(`data:${mimeType};base64,${base64Data}`).then(res => res.blob());
        const mediaId = await this.saveMedia(blob);
        processed = processed.replace(match[0], `src="blob-id:${mediaId}"`);
      } catch (e) {
        console.error('MediaService: Failed to extract media:', e);
      }
    }

    return processed;
  },

  /**
   * Optimized garbage collection check ($O(N)$ Set lookup instead of $O(N \times M)$ string search)
   */
  async getUnusedMediaStats(): Promise<{ unusedMediaCount: number; unusedMediaSize: number }> {
    return db.transaction('r', [db.notes, db.note_versions, db.media], async () => {
      const { ids, size } = await collectUnusedMedia();
      return { unusedMediaCount: ids.length, unusedMediaSize: size };
    });
  },

  async cleanUnusedMedia(): Promise<{ count: number; savedSize: number }> {
    return db.transaction('rw', [db.notes, db.note_versions, db.media], async () => {
      const { ids, size } = await collectUnusedMedia();
      await db.media.bulkDelete(ids);
      return { count: ids.length, savedSize: size };
    });
  }
};

// Global cleanup on exit to prevent leaks (Problem 9)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    MediaService.revokeMediaUrls();
  });
}
