/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../DexieDB';

const activeObjectUrls = new Set<string>();
const objectUrlToMediaId = new Map<string, string>();

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
    const allMedia = await db.media.toArray();
    if (allMedia.length === 0) return { unusedMediaCount: 0, unusedMediaSize: 0 };

    const allNotes = await db.notes.toArray();
    const referencedMediaIds = new Set<string>();

    for (const note of allNotes) {
      if (!note.content) continue;
      const matches = note.content.match(/blob-id:([a-zA-Z0-9_-]+)/g);
      if (matches) {
        matches.forEach(m => referencedMediaIds.add(m.replace('blob-id:', '')));
      }
    }

    let unusedMediaCount = 0;
    let unusedMediaSize = 0;

    for (const item of allMedia) {
      if (!referencedMediaIds.has(item.id)) {
        unusedMediaCount++;
        unusedMediaSize += item.blob.size;
      }
    }

    return { unusedMediaCount, unusedMediaSize };
  },

  async cleanUnusedMedia(): Promise<{ count: number; savedSize: number }> {
    const allMedia = await db.media.toArray();
    if (allMedia.length === 0) return { count: 0, savedSize: 0 };

    const allNotes = await db.notes.toArray();
    const referencedMediaIds = new Set<string>();

    for (const note of allNotes) {
      if (!note.content) continue;
      const matches = note.content.match(/blob-id:([a-zA-Z0-9_-]+)/g);
      if (matches) {
        matches.forEach(m => referencedMediaIds.add(m.replace('blob-id:', '')));
      }
    }

    const idsToDelete: string[] = [];
    let savedSize = 0;

    for (const item of allMedia) {
      if (!referencedMediaIds.has(item.id)) {
        idsToDelete.push(item.id);
        savedSize += item.blob.size;
      }
    }

    if (idsToDelete.length > 0) {
      await db.media.bulkDelete(idsToDelete);
    }

    return { count: idsToDelete.length, savedSize };
  }
};

// Global cleanup on exit to prevent leaks (Problem 9)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    MediaService.revokeMediaUrls();
  });
}
