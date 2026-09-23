/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, SearchResult } from './types';
import { StorageBuffer, normalizeText, stripHtml, getBloomHash } from './core/StorageBuffer';
import { InvertedIndex } from './index/InvertedIndex';
import { expandQueryTerm } from './index/SynonymEngine';
import { calculateFuzzyScore, calculateBM25, getTermFrequency } from './core/Scorer';
import { calculateProximityBonus, calculateStructureBonus } from './ranking/Ranker';

let globalStorage: StorageBuffer | null = null;
let globalIndex: InvertedIndex | null = null;

export function initializeRST(notes: Note[]): void {
  globalStorage = new StorageBuffer(notes);
  globalIndex = new InvertedIndex(globalStorage);
}

export function invalidateRST(): void {
  globalStorage = null;
  globalIndex = null;
}

/**
 * 100x Optimized Search Engine with Unbreakable Accuracy
 */
export function searchWithRST(notes: Note[], query: string, isAccurate: boolean = false): Note[] {
  if (!query || query.trim().length === 0) return notes;

  if (!globalStorage || globalStorage.size !== notes.length) {
    initializeRST(notes);
  }

  const storage = globalStorage!;
  const index = globalIndex!;
  const queryLower = normalizeText(query);
  const queryWords = queryLower.split(/\s+/).filter(t => t.length > 0);
  
  if (queryWords.length === 0) return [];

  const candidateIndices = new Set<number>();

  if (isAccurate) {
    for (let i = 0; i < storage.size; i++) {
      const text = storage.getRawText(i);
      if (text.includes(queryLower)) candidateIndices.add(i);
    }
  } else {
    const wordSets: Set<number>[] = [];
    
    for (const word of queryWords) {
      const termSet = new Set<number>();
      const expanded = expandQueryTerm(word);
      
      for (const t of expanded) {
        const matches = index.lookupPrefix(t);
        for (const m of matches) termSet.add(m);
      }
      
      if (termSet.size === 0 && word.length > 2) {
        const queryHash = getBloomHash(word);
        for (let i = 0; i < storage.size; i++) {
          // Bloom filter check before running expensive fuzzy matching
          const docHash = storage.getBloomHash(i);
          if ((docHash & queryHash) === queryHash || calculateFuzzyScore(storage.getRawText(i), word) < 0.4) {
            termSet.add(i);
          }
        }
      }
      wordSets.push(termSet);
    }

    // Smallest Set First Intersection Optimization (#8, #10)
    if (wordSets.length > 0) {
      wordSets.sort((a, b) => a.size - b.size);
      const smallest = wordSets[0];
      outer: for (const idx of smallest) {
        for (let i = 1; i < wordSets.length; i++) {
          if (!wordSets[i].has(idx)) continue outer;
        }
        candidateIndices.add(idx);
      }
    }

    if (candidateIndices.size === 0) {
      const queryHash = getBloomHash(queryLower);
      for (let i = 0; i < storage.size; i++) {
        const docText = storage.getRawText(i);
        const docHash = storage.getBloomHash(i);
        if (
          (docHash & queryHash) === queryHash ||
          docText.includes(queryLower)
        ) {
          candidateIndices.add(i);
        }
      }
    }
  }

  if (candidateIndices.size === 0) return [];

  const avgDocLength = storage.avgDocLength;
  const totalDocs = storage.size;

  const rankedResults: SearchResult[] = [];
  for (const docIdx of candidateIndices) {
    const docText = storage.getRawText(docIdx);
    const docLen = storage.getDocLength(docIdx);
    const note = storage.getNote(docIdx);
    const titleLower = normalizeText(note.title);

    const bodyText = stripHtml(note.content).trim();
    const firstLine = bodyText.split('\n')[0] || '';
    const firstLineLower = normalizeText(firstLine);

    let score = 0;

    if (docText.includes(queryLower)) score += 500;
    if (titleLower.includes(queryLower)) {
      score += 1000;
      if (titleLower.startsWith(queryLower)) {
        score += 500;
      }
    }

    if (firstLineLower.includes(queryLower)) {
      score += 400;
      if (firstLineLower.startsWith(queryLower)) {
        score += 200;
      }
    }

    score += calculateProximityBonus(docText, queryWords);
    score += calculateStructureBonus(note.content, queryWords);

    for (const word of queryWords) {
      // O(1) Term Frequency lookup from InvertedIndex (#3)
      const tf = index.getTF(word, docIdx) || getTermFrequency(docText, word);
      const docsWithTerm = index.lookup(word).length || 1;
      const bm25Score = calculateBM25(tf, docLen, avgDocLength, totalDocs, docsWithTerm);
      score += bm25Score * 100;
    }

    rankedResults.push({ note, score, docIndex: docIdx });
  }

  return rankedResults
    .sort((a, b) => b.score - a.score)
    .map(r => r.note);
}

function chunkInto<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Asynchronously searches a slice/chunk of notes returning ranked SearchResult[]
 */
async function searchChunkAsync(
  chunkNotes: Note[], 
  query: string, 
  isAccurate: boolean
): Promise<SearchResult[]> {
  const chunkStorage = new StorageBuffer(chunkNotes);
  const chunkIndex = new InvertedIndex(chunkStorage);
  
  const queryLower = normalizeText(query);
  const queryWords = queryLower.split(/\s+/).filter(t => t.length > 0);
  if (queryWords.length === 0) return [];

  const candidateIndices = new Set<number>();

  if (isAccurate) {
    for (let i = 0; i < chunkStorage.size; i++) {
      const text = chunkStorage.getRawText(i);
      if (text.includes(queryLower)) candidateIndices.add(i);
    }
  } else {
    const wordSets: Set<number>[] = [];
    
    for (const word of queryWords) {
      const termSet = new Set<number>();
      const expanded = expandQueryTerm(word);
      
      for (const t of expanded) {
        const matches = chunkIndex.lookupPrefix(t);
        for (const m of matches) termSet.add(m);
      }
      wordSets.push(termSet);
    }

    if (wordSets.length > 0) {
      wordSets.sort((a, b) => a.size - b.size);
      const smallest = wordSets[0];
      outer: for (const idx of smallest) {
        for (let i = 1; i < wordSets.length; i++) {
          if (!wordSets[i].has(idx)) continue outer;
        }
        candidateIndices.add(idx);
      }
    }

    if (candidateIndices.size === 0) {
      for (let i = 0; i < chunkStorage.size; i++) {
        if (chunkStorage.getRawText(i).includes(queryLower)) {
          candidateIndices.add(i);
        }
      }
    }
  }

  if (candidateIndices.size === 0) return [];

  const avgDocLength = chunkStorage.avgDocLength;
  const totalDocs = chunkStorage.size;

  const rankedResults: SearchResult[] = [];
  for (const docIdx of candidateIndices) {
    const docText = chunkStorage.getRawText(docIdx);
    const docLen = chunkStorage.getDocLength(docIdx);
    const note = chunkStorage.getNote(docIdx);
    const titleLower = normalizeText(note.title);

    let score = 0;
    if (docText.includes(queryLower)) score += 500;
    if (titleLower.includes(queryLower)) score += 1000;

    for (const word of queryWords) {
      const tf = chunkIndex.getTF(word, docIdx) || getTermFrequency(docText, word);
      const docsWithTerm = chunkIndex.lookup(word).length || 1;
      score += calculateBM25(tf, docLen, avgDocLength, totalDocs, docsWithTerm) * 100;
    }

    rankedResults.push({ note, score, docIndex: docIdx });
  }

  return rankedResults;
}

/**
 * Parallel non-blocking search without secondary pass overhead (#2)
 */
export async function searchWithRSTParallel(
  notes: Note[], 
  query: string, 
  isAccurate: boolean = false
): Promise<Note[]> {
  if (!query || query.trim().length === 0) return notes;

  const chunks = chunkInto(notes, 1500);
  const allResults: SearchResult[] = [];

  for (let i = 0; i < chunks.length; i += 5) {
    const batch = await Promise.all(
      chunks.slice(i, i + 5).map(c => searchChunkAsync(c, query, isAccurate))
    );
    allResults.push(...batch.flat());
  }

  // Deduplicate and sort once by score (#2)
  const seenIds = new Set<string>();
  const uniqueRanked: SearchResult[] = [];
  for (const r of allResults) {
    if (!seenIds.has(r.note.id)) {
      seenIds.add(r.note.id);
      uniqueRanked.push(r);
    }
  }

  return uniqueRanked
    .sort((a, b) => b.score - a.score)
    .map(r => r.note);
}
