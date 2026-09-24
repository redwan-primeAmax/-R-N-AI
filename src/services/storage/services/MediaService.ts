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
    if (!content) return '';

    const blobIdRegex = /blob-id:([a-zA-Z0-9_-]+)/g;
    let resolved = content;
    const matches = Array.from(content.matchAll(blobIdRegex));

    for (const match of matches) {
      const mediaId = match[1];
      const blob = await this.getMedia(mediaId);
      if (blob) {
        const url = URL.createObjectURL(blob);
        activeObjectUrls.add(url);
        objectUrlToMediaId.set(url, mediaId);
        resolved = resolved.split(match[0]).join(url);
      }
    }

    return resolved;
  },

  /**
   * Revokes all active object URLs to prevent memory leaks
   */
  revokeMediaUrls(): void {
    activeObjectUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('MediaService: Failed to revoke URL:', e);
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
    objectUrlToMediaId.forEach((mediaId, url) => {
      processed = processed.split(url).join(`blob-id:${mediaId}`);
    });

    if (!processed.includes('data:image/') && !processed.includes('data:video/') && !processed.includes('data:audio/')) {
      return processed;
    }

    // Match image, video, audio data URIs safely
    const dataUriRegex = /src="data:(image|video|audio)\/([a-zA-Z0-9\+\-]+);base64,([^"]*)"/g;
    const matches = Array.from(processed.matchAll(dataUriRegex));

    for (const match of matches) {
      const category = match[1];
      const subtype = match[2];
      const mimeType = `${category}/${subtype}`;
      const base64Data = match[3];

      try {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        const mediaId = await this.saveMedia(blob);
        processed = processed.split(match[0]).join(`src="blob-id:${mediaId}"`);
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
