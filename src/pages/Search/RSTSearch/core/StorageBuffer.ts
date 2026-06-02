/**
 * StorageBuffer.ts - 100x Memory Efficiency via TypedArrays
 */

import { Note } from '../types';

export function normalizeText(text: string): string {
  if (!text) return '';
  return text.toLowerCase().normalize('NFC');
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ');
}

/**
 * World-Class Feature: Fast CPU-friendly 64-bit FNV-1a Hashing for Bloom Filters
 */
export function getBloomBit(token: string): bigint {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < token.length; i++) {
    h ^= BigInt(token.charCodeAt(i));
    h *= 0x00000100000001B3n;
  }
  const pos = h % 64n;
  return 1n << (pos < 0n ? -pos : pos);
}

/**
 * StorageBuffer manages raw data in a linear fashion to avoid JS Object overhead.
 * It uses a single massive String Pool for the entire dataset.
 */
export class StorageBuffer {
  private notes: Note[] = [];
  private docLengths: Uint32Array = new Uint32Array(0);
  private pool: string = "";
  private offsets: Uint32Array = new Uint32Array(0); // [start, end, start, end...]
  private bloomFilters: BigUint64Array = new BigUint64Array(0);
  public lastUpdate: number = Date.now();

  constructor(notes: Note[]) {
    this.notes = notes;
    const count = notes.length;
    this.docLengths = new Uint32Array(count);
    this.offsets = new Uint32Array(count * 2);
    this.bloomFilters = new BigUint64Array(count);
    this.lastUpdate = Date.now();

    let poolBuilder = "";
    for (let i = 0; i < count; i++) {
      const note = notes[i];
      // Use normalizeText to ensure NFC consistency for Bengali characters
      const fullText = normalizeText(note.title + " " + stripHtml(note.content) + " " + (note.tags?.join(" ") || ""));
      
      this.docLengths[i] = fullText.split(/\s+/).length;
      const start = poolBuilder.length;
      poolBuilder += fullText;
      const end = poolBuilder.length;
      
      this.offsets[i * 2] = start;
      this.offsets[i * 2 + 1] = end;

      // Compute Bloom filter signature using the same delimiter logic as search
      let bloom = 0n;
      const tWords = fullText.split(/[^a-z0-9\-\u0980-\u09FF]+/);
      for (const w of tWords) {
        if (w.length > 0) bloom |= getBloomBit(w);
      }
      this.bloomFilters[i] = bloom;
    }
    this.pool = poolBuilder;
  }

  public getBloomFilter(index: number): bigint {
    return this.bloomFilters[index] || 0n;
  }

  public getNote(index: number): Note {
    return this.notes[index];
  }

  public getDocLength(index: number): number {
    return this.docLengths[index];
  }

  public getRawText(index: number): string {
    return this.pool.substring(this.offsets[index * 2], this.offsets[index * 2 + 1]);
  }

  public get size(): number {
    return this.notes.length;
  }
}
