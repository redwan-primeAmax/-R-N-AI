/**
 * RSTSearch.ts - The Orchestrator
 */

import { Note, SearchResult } from './types';
import { StorageBuffer, normalizeText, stripHtml } from './core/StorageBuffer';
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
 * Custom context snippet generator with keyword alignment logic
 */
function generateSnippet(contentHtml: string, queryWords: string[], queryLower: string): string {
  if (!contentHtml) return '';
  const content = stripHtml(contentHtml).trim().replace(/\s+/g, ' ');
  if (!content) return '';
  const contentLower = content.toLowerCase();

  // Try to find exact query match index first
  let matchIdx = contentLower.indexOf(queryLower);

  // If not found, try to find any first matching query word
  if (matchIdx === -1 && queryWords.length > 0) {
    for (const word of queryWords) {
      if (word.length > 1) {
        matchIdx = contentLower.indexOf(word);
        if (matchIdx !== -1) break;
      }
    }
  }

  // Fallback to start
  if (matchIdx === -1) {
    return content.substring(0, 150) + (content.length > 150 ? '...' : '');
  }

  const start = Math.max(0, matchIdx - 60);
  const end = Math.min(content.length, matchIdx + 90);
  let snippet = content.substring(start, end);
  
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  
  return snippet;
}

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
  (globalStorage as any).lastUpdate = Date.now();
  globalIndex = new InvertedIndex(globalStorage);
}

/**
 * Nuclear invalidation for when notes are permanently deleted.
 * Forces re-initialization on next searchWithRST call.
 */
export function invalidateRST(): void {
  globalStorage = null;
  globalIndex = null;
  console.warn('[RSTSearch] Global storage & index invalidated (permanent delete or major mutation).');
}

/**
 * 100x Optimized Search Engine with Unbreakable Accuracy
 */
export function searchWithRST(notes: Note[], query: string, isAccurate: boolean = false): Note[] {
  if (!query || query.trim().length === 0) return notes;

  // Re-init if we have no storage OR size mismatch OR a significant time has passed (basic safety)
  if (!globalStorage || globalStorage.size !== notes.length || (globalStorage as any).lastUpdate < (Date.now() - 30000)) {
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
        const words = docText.split(/[^a-z0-9\-\u0980-\u09FF]+/);
        // Robust check: match if query is part of any word, or word is part of query, or fuzzy match
        if (docText.includes(queryLower) || 
            words.some(w => w.includes(queryLower) || queryLower.includes(w) || calculateFuzzyScore(w, queryLower) < 0.6)) {
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

    // Extract first line of the body content for enhanced relevance scoring
    const bodyText = stripHtml(note.content).trim();
    const firstLine = bodyText.split('\n')[0] || '';
    const firstLineLower = normalizeText(firstLine);

    let score = 0;

    if (docText.includes(queryLower)) score += 500;
    if (titleLower.includes(queryLower)) {
      score += 1000;
      if (titleLower.startsWith(queryLower)) {
        score += 500; // Boost starting matches for perfect UX
      }
    }

    // Boost if match lies in the first line of note body
    if (firstLineLower.includes(queryLower)) {
      score += 400;
      if (firstLineLower.startsWith(queryLower)) {
        score += 200;
      }
    }

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

      if (firstLineLower.includes(term)) {
        bmScore *= 3.0; // Boost first-line word alignment
      }
      score += bmScore;
    }

    rankedResults.push({ note, score });
  }

  return rankedResults
    .sort((a, b) => b.score - a.score)
    .map(r => {
      const note = r.note;
      (note as any).snippet = generateSnippet(note.content, queryWords, queryLower);
      return note;
    });
}

/**
 * Asynchronously searches a slice/chunk of notes
 */
async function searchChunkAsync(
  chunkNotes: Note[], 
  query: string, 
  isAccurate: boolean
): Promise<Note[]> {
  // Yield execution to the event loop so other parallel chunks can start and share CPU time
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // Create virtual Storage buffers and indices for this isolated chunk to prevent race conditions
  const chunkStorage = new StorageBuffer(chunkNotes);
  const chunkIndex = new InvertedIndex(chunkStorage);
  
  const queryLower = normalizeText(query);
  const queryWords = queryLower.split(/\s+/).filter(t => t.length > 0);
  if (queryWords.length === 0) return [];

  let candidateIndices = new Set<number>();

  if (isAccurate) {
    for (let i = 0; i < chunkStorage.size; i++) {
       const text = chunkStorage.getRawText(i);
       if (text.includes(queryLower)) candidateIndices.add(i);
    }
  } else {
    let wordSets: Set<number>[] = [];
    
    for (const word of queryWords) {
      const termSet = new Set<number>();
      const expanded = expandQueryTerm(word);
      
      for (const t of expanded) {
        const matches = chunkIndex.lookupPrefix(t);
        for (const m of matches) termSet.add(m);
      }
      
      if (termSet.size === 0 && word.length > 2) {
         for (let i = 0; i < chunkStorage.size; i++) {
            if (calculateFuzzyScore(chunkStorage.getRawText(i), word) < 0.4) {
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
      for (let i = 0; i < chunkStorage.size; i++) {
        const docText = chunkStorage.getRawText(i);
        const words = docText.split(/[^a-z0-9\-\u0980-\u09FF]+/);
        if (docText.includes(queryLower) || 
            words.some(w => w.includes(queryLower) || queryLower.includes(w) || calculateFuzzyScore(w, queryLower) < 0.6)) {
          candidateIndices.add(i);
        }
      }
    }
  }

  if (candidateIndices.size === 0) return [];

  const avgDocLength = Array.from({ length: chunkStorage.size }, (_, i) => chunkStorage.getDocLength(i))
    .reduce((a, b) => a + b, 0) / chunkStorage.size;
  const totalDocs = chunkStorage.size;

  const rankedResults: SearchResult[] = [];
  for (const docIdx of candidateIndices) {
    const docText = chunkStorage.getRawText(docIdx);
    const docLen = chunkStorage.getDocLength(docIdx);
    const note = chunkStorage.getNote(docIdx);
    const titleLower = normalizeText(note.title);

    // Extract first line of the body content for enhanced relevance scoring
    const bodyText = stripHtml(note.content).trim();
    const firstLine = bodyText.split('\n')[0] || '';
    const firstLineLower = normalizeText(firstLine);

    let score = 0;

    if (docText.includes(queryLower)) score += 500;
    if (titleLower.includes(queryLower)) {
      score += 1000;
      if (titleLower.startsWith(queryLower)) {
        score += 500; // Boost starting matches for perfect UX
      }
    }

    // Boost if match lies in the first line of note body
    if (firstLineLower.includes(queryLower)) {
      score += 400;
      if (firstLineLower.startsWith(queryLower)) {
        score += 200;
      }
    }

    score += calculateProximityBonus(docText, queryWords);

    const fuzzyS = calculateFuzzyScore(docText, queryLower);
    score += (1 - fuzzyS) * 200;

    for (const term of queryWords) {
      const termFreq = getTermFrequency(docText, term);
      const docsWithTerm = chunkIndex.lookup(term).length || 1;
      let bmScore = calculateBM25(termFreq, docLen, avgDocLength, totalDocs, docsWithTerm);
      
      if (titleLower.includes(term)) {
        bmScore *= 5.0;
        if (titleLower.startsWith(term)) bmScore *= 2.0;
      }

      if (firstLineLower.includes(term)) {
        bmScore *= 3.0; // Boost first-line word alignment
      }
      score += bmScore;
    }

    rankedResults.push({ note, score });
  }

  return rankedResults
    .sort((a, b) => b.score - a.score)
    .map(r => r.note);
}

/**
 * Searches across all notes by chunking them into partitions of 2000 notes,
 * and running up to 5 processes/promises concurrently in the background.
 */
export async function searchWithRSTParallel(
  notes: Note[],
  query: string,
  isAccurate: boolean = false
): Promise<Note[]> {
  if (!query || query.trim().length === 0) return notes;

  const CHUNK_SIZE = 2000;
  const chunks: Note[][] = [];
  for (let i = 0; i < notes.length; i += CHUNK_SIZE) {
    chunks.push(notes.slice(i, i + CHUNK_SIZE));
  }

  const allResults: Note[][] = [];
  const CONCURRENCY_LIMIT = 5;

  for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
    const batch = chunks.slice(i, i + CONCURRENCY_LIMIT);
    // Launch these chunk searches concurrently (up to 5 in parallel)
    const batchPromises = batch.map(chunk => searchChunkAsync(chunk, query, isAccurate));
    const batchResults = await Promise.all(batchPromises);
    allResults.push(...batchResults);
  }

  // Merge results from all parallel executions
  const mergedNotes = allResults.flat();

  // Re-rank the merged result pool globally
  if (mergedNotes.length <= 1) return mergedNotes;

  // Score and sort using standard searchWithRST
  return searchWithRST(mergedNotes, query, isAccurate);
}
