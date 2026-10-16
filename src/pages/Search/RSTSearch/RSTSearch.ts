/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Note, SearchResult } from './types';
import { StorageBuffer, normalizeText, stripHtml } from './core/StorageBuffer';
import { InvertedIndex } from './index/InvertedIndex';
import { expandQueryTerm } from './index/SynonymEngine';
import { calculateFuzzyScore, calculateBM25, getTermFrequency } from './core/Scorer';
import { calculateProximityBonus, calculateStructureBonus } from './ranking/Ranker';

let indexedNotes: Note[] | null = null;
let globalStorage: StorageBuffer | null = null;
let globalIndex: InvertedIndex | null = null;

export function initializeRST(notes: Note[]): void {
  indexedNotes = notes;
  globalStorage = new StorageBuffer(notes);
  globalIndex = new InvertedIndex(globalStorage);
}

export function invalidateRST(): void {
  indexedNotes = null;
  globalStorage = null;
  globalIndex = null;
}

/** Search a cached index; callers replace the dataset or invalidate after mutations. */
export function searchWithRST(notes: Note[], query: string, isAccurate: boolean = false): Note[] {
  if (!query || query.trim().length === 0) return notes;

  if (!globalStorage || indexedNotes !== notes) {
    initializeRST(notes);
  }

  const storage = globalStorage!;
  const index = globalIndex!;
  const queryLower = normalizeText(query);
  const queryWords = queryLower.split(/\s+/).filter(t => t.length > 0);
  
  if (queryWords.length === 0) return [];

  const candidateIndices = new Set<number>();

  if (isAccurate) {
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordPrefixRegex = new RegExp(`(?:^|\\b|\\s)${escapeRegExp(queryLower)}`, 'i');
    for (let i = 0; i < storage.size; i++) {
      const text = storage.getRawText(i);
      if (wordPrefixRegex.test(text)) candidateIndices.add(i);
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
        for (let i = 0; i < storage.size; i++) {
          const rawText = storage.getRawText(i);
          if (rawText.includes(word) || calculateFuzzyScore(rawText, word) < 0.4) {
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
      for (let i = 0; i < storage.size; i++) {
        const docText = storage.getRawText(i);
        if (
          docText.includes(queryLower) ||
          calculateFuzzyScore(docText, queryLower) < 0.4
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

/** Compatibility entry point. Real off-main-thread execution lives in SearchWorker. */
export async function searchWithRSTParallel(notes: Note[], query: string, isAccurate = false): Promise<Note[]> {
  return searchWithRST(notes, query, isAccurate);
}
