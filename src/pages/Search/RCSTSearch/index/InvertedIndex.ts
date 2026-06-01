import { IndexEntry, InvertedIndexMap } from '../types';

export class InvertedIndex {
  private index: InvertedIndexMap = {};
  private vocabulary: string[] = [];
  private vocabularyByLength: Map<number, string[]> = new Map();

  /**
   * Clears and builds the inverted index from given tokens list
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

    // Convert temp index mapping into sorted fast IndexEntry arrays for dual-pointer intersection
    for (const term in tempIndex) {
      const entries: IndexEntry[] = [];
      for (const docIdxStr in tempIndex[term]) {
        const docIndex = parseInt(docIdxStr, 10);
        entries.push({
          docIndex,
          frequency: tempIndex[term][docIndex]
        });
      }
      entries.sort((a, b) => a.docIndex - b.docIndex);
      this.index[term] = entries;
    }

    this.rebuildVocabulary();
  }

  /**
   * Delta Inverted Index: Surgical in-place removal of docIndex elements
   */
  public removeDocIndex(docIndex: number, terms: Set<string>, skipRebuild = false): void {
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
    if (!skipRebuild) {
      this.rebuildVocabulary();
    }
  }

  /**
   * Delta Inverted Index: Surgical in-place insertion/updates of docIndex terms
   */
  public addDocIndexTerms(docIndex: number, termsWithFreq: Map<string, number>, skipRebuild = false): void {
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
    if (!skipRebuild) {
      this.rebuildVocabulary();
    }
  }

  public rebuildVocabulary(): void {
    this.vocabulary = Object.keys(this.index);
    this.vocabularyByLength.clear();
    for (let i = 0; i < this.vocabulary.length; i++) {
      const term = this.vocabulary[i];
      const len = term.length;
      let group = this.vocabularyByLength.get(len);
      if (!group) {
        group = [];
        this.vocabularyByLength.set(len, group);
      }
      group.push(term);
    }
  }

  /**
   * Retrieves terms matching a specific character length directly in O(1)
   */
  public getVocabularyByLength(len: number): string[] | undefined {
    return this.vocabularyByLength.get(len);
  }

  /**
   * Get exact matches for a term
   */
  public getEntries(term: string): IndexEntry[] | undefined {
    return this.index[term];
  }

  /**
   * Retrieves the full vocabulary list for prefix/fuzzy match evaluations
   */
  public getVocabulary(): string[] {
    return this.vocabulary;
  }

  /**
   * Merges multiple index arrays (OR behavior, aggregating frequencies)
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
   * High speed dual-pointer array intersection O(A + B) for multi-term queries
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
          frequency: listA[pA].frequency + listB[pB].frequency
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
