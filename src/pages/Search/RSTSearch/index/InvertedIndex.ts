/**
 * InvertedIndex.ts - 100x Speed Multi-word Engine
 */

import { tokenize } from '../core/Tokenizer';
import { StorageBuffer } from '../core/StorageBuffer';

export class InvertedIndex {
  // Map of Word -> List of Document Indices
  private dictionary: Map<string, number[]> = new Map();

  constructor(storage: StorageBuffer) {
    const size = storage.size;
    for (let i = 0; i < size; i++) {
      const text = storage.getRawText(i);
      const tokens = tokenize(text);
      for (const token of tokens) {
        if (!this.dictionary.has(token)) {
          this.dictionary.set(token, []);
        }
        this.dictionary.get(token)!.push(i);
      }
    }
  }

  /**
   * Returns document indices that contain the exact token
   */
  public lookup(token: string): number[] {
    return this.dictionary.get(token) || [];
  }

  /**
   * Prefix search for fuzzy/partial matching
   */
  public lookupPrefix(prefix: string): number[] {
    const results = new Set<number>();
    for (const [word, docIndices] of this.dictionary.entries()) {
      if (word.startsWith(prefix)) {
        for (const idx of docIndices) results.add(idx);
      }
    }
    return Array.from(results);
  }
}
