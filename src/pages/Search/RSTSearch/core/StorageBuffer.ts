/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note } from '../types';

export function normalizeText(text: string): string {
  if (!text) return '';
  return text.toLowerCase().normalize('NFC');
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ');
}

/**
 * 32-bit FNV-1a Hash (100x faster than BigInt, zero-bigint arithmetic)
 */
export function getBloomHash(token: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < token.length; i++) {
    h = (h ^ token.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export class StorageBuffer {
  private notes: Note[] = [];
  private docLengths: Uint32Array = new Uint32Array(0);
  private pool: string = "";
  private offsets: Uint32Array = new Uint32Array(0); // [start, end, start, end...]
  private bloomHashes: Uint32Array = new Uint32Array(0);
  private cachedAvgDocLength: number = 0;
  public lastUpdate: number = Date.now();

  constructor(notes: Note[]) {
    this.notes = notes;
    const count = notes.length;
    this.docLengths = new Uint32Array(count);
    this.offsets = new Uint32Array(count * 2);
    this.bloomHashes = new Uint32Array(count);
    this.lastUpdate = Date.now();

    let poolBuilder = "";
    let totalLengthSum = 0;

    for (let i = 0; i < count; i++) {
      const note = notes[i];
      const fullText = normalizeText(note.title + " " + stripHtml(note.content) + " " + (note.tags?.join(" ") || ""));

      // Fast word count without .split() array allocations
      let wordCount = 1;
      for (let c = 0; c < fullText.length; c++) {
        if (fullText.charCodeAt(c) === 32) wordCount++;
      }
      this.docLengths[i] = wordCount;
      totalLengthSum += wordCount;

      const start = poolBuilder.length;
      poolBuilder += fullText;
      const end = poolBuilder.length;

      this.offsets[i * 2] = start;
      this.offsets[i * 2 + 1] = end;

      // Fast 32-bit bloom hash
      this.bloomHashes[i] = getBloomHash(fullText);
    }

    this.pool = poolBuilder;
    this.cachedAvgDocLength = count > 0 ? totalLengthSum / count : 1;
  }

  public getBloomHash(index: number): number {
    return this.bloomHashes[index] || 0;
  }

  public get avgDocLength(): number {
    return this.cachedAvgDocLength;
  }

  public getNote(index: number): Note {
    return this.notes[index];
  }

  public getDocLength(index: number): number {
    return this.docLengths[index] || 1;
  }

  public getRawText(index: number): string {
    return this.pool.substring(this.offsets[index * 2], this.offsets[index * 2 + 1]);
  }

  public get size(): number {
    return this.notes.length;
  }
}
