import { IndexEntry, InvertedIndexMap } from '../types';

export class InvertedIndex {
  private index: InvertedIndexMap = {};
  private vocabulary: string[] = [];

  /**
   * Clears and builds the inverted index from tokens extracted from document blocks
   */
  public build(docTokens: { docIndex: number; tokens: { term: string }[] }[]): void {
    this.index = {};
    const tempIndex: { [term: string]: { [docIndex: number]: number } } = {};

    for (const item of docTokens) {
      const docIdx = item.docIndex;
      for (const t of item.tokens) {
        const term = t.term;
        if (!tempIndex[term]) {
          tempIndex[term] = {};
        }
        tempIndex[term][docIdx] = (tempIndex[term][docIdx] || 0) + 1;
      }
    }

    // Convert temp index map to structured arrays for quick index traversing
    for (const term in tempIndex) {
      const entries: IndexEntry[] = [];
      for (const docIdxStr in tempIndex[term]) {
        const docIndex = parseInt(docIdxStr, 10);
        entries.push({
          docIndex,
          frequency: tempIndex[term][docIndex]
        });
      }
      // Sort entries by docIndex to allow O(N) dual-pointer intersection
      entries.sort((a, b) => a.docIndex - b.docIndex);
      this.index[term] = entries;
    }

    this.vocabulary = Object.keys(this.index);
  }

  /**
   * Delta Inverted Index: In-place removal of document entries for specified terms
   */
  public removeDocIndex(docIndex: number, terms: Set<string>): void {
    for (const term of terms) {
      const entries = this.index[term];
      if (entries) {
        const filtered = entries.filter(e => e.docIndex !== docIndex);
        if (filtered.length === 0) {
          delete this.index[term];
        } else {
          this.index[term] = filtered;
        }
      }
    }
    this.rebuildVocabulary();
  }

  /**
   * Delta Inverted Index: In-place insertion of document entries with term frequencies
   */
  public addDocIndexTerms(docIndex: number, termsWithFreq: Map<string, number>): void {
    for (const [term, freq] of termsWithFreq.entries()) {
      if (!this.index[term]) {
        this.index[term] = [];
      }
      const entries = this.index[term];
      const existingIdx = entries.findIndex(e => e.docIndex === docIndex);
      if (existingIdx !== -1) {
        entries[existingIdx].frequency = freq;
      } else {
        entries.push({ docIndex, frequency: freq });
        entries.sort((a, b) => a.docIndex - b.docIndex);
      }
    }
    this.rebuildVocabulary();
  }

  public rebuildVocabulary(): void {
    this.vocabulary = Object.keys(this.index);
  }

  /**
   * Retrieves exact matches for a term
   */
  public getEntries(term: string): IndexEntry[] | undefined {
    return this.index[term];
  }

  /**
   * Returns whole vocabulary list for prefix/edit-distance matching
   */
  public getVocabulary(): string[] {
    return this.vocabulary;
  }

  /**
   * Merges multiple index entries (OR behavior for prefix/fuzzy matches)
   * Collates duplicates by accumulating frequencies.
   */
  public mergeEntries(lists: IndexEntry[][]): IndexEntry[] {
    if (lists.length === 0) return [];
    if (lists.length === 1) return lists[0];

    const mergedMap: { [docIdx: number]: number } = {};
    for (const list of lists) {
      for (const entry of list) {
        mergedMap[entry.docIndex] = (mergedMap[entry.docIndex] || 0) + entry.frequency;
      }
    }

    const result: IndexEntry[] = [];
    for (const docIdxStr in mergedMap) {
      result.push({
        docIndex: parseInt(docIdxStr, 10),
        frequency: mergedMap[docIdxStr]
      });
    }

    return result.sort((a, b) => a.docIndex - b.docIndex);
  }

  /**
   * Performs an ultra-fast O(A + B) two-pointer intersection (AND behavior for multi-word queries)
   */
  public intersectEntries(listA: IndexEntry[], listB: IndexEntry[]): IndexEntry[] {
    const result: IndexEntry[] = [];
    let pA = 0;
    let pB = 0;

    while (pA < listA.length && pB < listB.length) {
      const docA = listA[pA].docIndex;
      const docB = listB[pB].docIndex;

      if (docA === docB) {
        result.push({
          docIndex: docA,
          frequency: listA[pA].frequency + listB[pB].frequency // Aggregate relevance
        });
        pA++;
        pB++;
      } else if (docA < docB) {
        pA++;
      } else {
        pB++;
      }
    }

    return result;
  }
}
