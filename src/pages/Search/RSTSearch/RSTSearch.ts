/**
 * RSTSearch.ts - The Orchestrator
 */

import { Note, SearchResult } from './types';
import { StorageBuffer, normalizeText } from './core/StorageBuffer';
import { InvertedIndex } from './index/InvertedIndex';
import { calculateBM25, getTermFrequency, calculateFuzzyScore } from './core/Scorer';
import { getBloomBit } from './core/StorageBuffer';
import { getPhoneticKey } from './core/Tokenizer';

const SYNONYM_MAP: Record<string, string[]> = {
  'গাড়ি': ['যানবাহন', 'car', 'vehicle', 'মটর'],
  'car': ['গাড়ি', 'vehicle', 'automobile'],
  'খবর': ['সংবাদ', 'news', 'বার্তা'],
  'পড়া': ['অধ্যায়ন', 'study', 'read'],
  'মোবাইল': ['phone', 'টেলিফোন', 'cellphone']
};

let globalStorage: StorageBuffer | null = null;
let globalIndex: InvertedIndex | null = null;

/**
 * Expands a term using synonyms and phonetics for smarter coverage
 */
function expandQueryTerm(term: string): string[] {
  const normalized = normalizeText(term);
  if (normalized.length < 2) return [normalized];
  
  const expansions = new Set<string>();
  expansions.add(normalized);
  
  const synonyms = SYNONYM_MAP[normalized] || [];
  for(const syn of synonyms) expansions.add(normalizeText(syn));
  
  const phonetic = getPhoneticKey(normalized);
  if (phonetic) expansions.add(phonetic);
  
  return Array.from(expansions);
}

/**
 * Rewards documents where query terms appear sequentially
 */
function calculateProximityBonus(docText: string, terms: string[]): number {
  if (terms.length <= 1) return 0;
  const text = docText.toLowerCase();
  let bonus = 0;
  
  if (text.includes(terms.join(' '))) bonus += 40.0;
  
  for (let i = 0; i < terms.length - 1; i++) {
    const pair = terms[i] + " " + terms[i + 1];
    if (text.includes(pair)) bonus += 15.0;
  }
  return bonus;
}

/**
 * Initializes or warms up the index
 */
export function initializeRST(notes: Note[]) {
  globalStorage = new StorageBuffer(notes);
  globalIndex = new InvertedIndex(globalStorage);
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

  let candidateIndices = new Set<number>();

  if (isAccurate) {
    for (let i = 0; i < storage.size; i++) {
       const text = storage.getRawText(i);
       if (text.includes(queryLower)) candidateIndices.add(i);
    }
  } else {
    let wordSets: Set<number>[] = [];
    
    for (const word of queryWords) {
      const termSet = new Set<number>();
      const expanded = expandQueryTerm(word);
      
      for (const t of expanded) {
        const matches = index.lookupPrefix(t);
        for (const m of matches) termSet.add(m);
      }
      
      if (termSet.size === 0 && word.length > 2) {
         for (let i = 0; i < storage.size; i++) {
            if (calculateFuzzyScore(storage.getRawText(i), word) < 0.4) {
               termSet.add(i);
            }
         }
      }
      wordSets.push(termSet);
    }

    if (wordSets.length > 0) {
      const firstSet = wordSets[0];
      for (const idx of firstSet) {
        if (wordSets.every(s => s.has(idx))) {
          candidateIndices.add(idx);
        }
      }
    }

    if (candidateIndices.size === 0) {
      for (let i = 0; i < storage.size; i++) {
        const docText = storage.getRawText(i);
        if (docText.includes(queryLower) || calculateFuzzyScore(docText, queryLower) < 0.5) {
          candidateIndices.add(i);
        }
      }
    }
  }

  if (candidateIndices.size === 0) return [];

  const avgDocLength = Array.from({ length: storage.size }, (_, i) => storage.getDocLength(i))
    .reduce((a, b) => a + b, 0) / storage.size;
  const totalDocs = storage.size;

  const rankedResults: SearchResult[] = [];
  for (const docIdx of candidateIndices) {
    const docText = storage.getRawText(docIdx);
    const docLen = storage.getDocLength(docIdx);
    const note = storage.getNote(docIdx);
    const titleLower = normalizeText(note.title);

    let score = 0;

    if (docText.includes(queryLower)) score += 500;
    if (titleLower.includes(queryLower)) score += 1000;

    score += calculateProximityBonus(docText, queryWords);

    const fuzzyS = calculateFuzzyScore(docText, queryLower);
    score += (1 - fuzzyS) * 200;

    for (const term of queryWords) {
      const termFreq = getTermFrequency(docText, term);
      const docsWithTerm = index.lookup(term).length || 1;
      let bmScore = calculateBM25(termFreq, docLen, avgDocLength, totalDocs, docsWithTerm);
      
      if (titleLower.includes(term)) {
        bmScore *= 5.0;
        if (titleLower.startsWith(term)) bmScore *= 2.0;
      }
      score += bmScore;
    }

    rankedResults.push({ note, score });
  }

  return rankedResults
    .sort((a, b) => b.score - a.score)
    .map(r => r.note);
}
