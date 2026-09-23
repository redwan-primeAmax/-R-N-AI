/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { tokenize } from '../core/Tokenizer';
import { StorageBuffer } from '../core/StorageBuffer';

const EMPTY_SET = new Set<number>();

class TrieNode {
  children: { [char: string]: TrieNode } = {};
  docIndices: Set<number> = new Set();
}

export class InvertedIndex {
  private root: TrieNode = new TrieNode();
  private dictionary: Map<string, number[]> = new Map();
  // Map token -> Map<docIdx, count> for O(1) TF lookups without regex compilation!
  private tfMap: Map<string, Map<number, number>> = new Map();

  constructor(storage: StorageBuffer) {
    const size = storage.size;
    for (let i = 0; i < size; i++) {
      const text = storage.getRawText(i);
      const tokens = tokenize(text);
      
      // Count token frequencies for doc i in a single pass
      const docTokenFreqs = new Map<string, number>();
      for (const t of tokens) {
        docTokenFreqs.set(t, (docTokenFreqs.get(t) || 0) + 1);
      }

      for (const [token, freq] of docTokenFreqs.entries()) {
        if (!this.dictionary.has(token)) {
          this.dictionary.set(token, []);
        }
        this.dictionary.get(token)!.push(i);

        let docTfMap = this.tfMap.get(token);
        if (!docTfMap) {
          docTfMap = new Map<number, number>();
          this.tfMap.set(token, docTfMap);
        }
        docTfMap.set(i, freq);

        // Trie indexing for fast prefix matching
        let node = this.root;
        for (const char of token) {
          if (!node.children[char]) {
            node.children[char] = new TrieNode();
          }
          node = node.children[char];
          node.docIndices.add(i);
        }
      }
    }
  }

  /**
   * Fast O(1) Term Frequency lookup (0 regex compilation!)
   */
  public getTF(token: string, docIdx: number): number {
    return this.tfMap.get(token)?.get(docIdx) || 0;
  }

  /**
   * Returns document indices that contain the exact token
   */
  public lookup(token: string): number[] {
    return this.dictionary.get(token) || [];
  }

  /**
   * Zero-allocation prefix search returning Set<number> directly
   */
  public lookupPrefix(prefix: string): Set<number> {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children[char]) return EMPTY_SET;
      node = node.children[char];
    }
    return node.docIndices;
  }
}
