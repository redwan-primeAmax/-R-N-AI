import { IndexEntry } from '../types';

// Standard Okapi BM25 constants
const K1 = 1.2;
const B = 0.75;

// Shared thread-safe distance row to avoid any heap/garbage collector allocations during keypresses
const maxWordLength = 128;
const rowBuffer = new Int32Array(maxWordLength);

/**
 * Calculates Okapi BM25 IDF (Inverse Document Frequency)
 */
export function calculateIDF(docContainingCount: number, totalDocsCount: number): number {
  return Math.log(1 + (totalDocsCount - docContainingCount + 0.5) / (docContainingCount + 0.5));
}

/**
 * Calculates the Okapi BM25 score for a term in a document
 */
export function calculateBM25Score(
  termFreq: number,
  docLength: number,
  avgDocLength: number,
  idf: number
): number {
  const numerator = termFreq * (K1 + 1);
  const denominator = termFreq + K1 * (1 - B + B * (docLength / (avgDocLength || 1)));
  return idf * (numerator / denominator);
}

/**
 * High-performance, zero-allocation Wagner-Fischer Edit Distance
 * 
 * Optimized to run directly within the CPU cache using static Int32Array buffer
 * without triggering any garbage collection (GC) sweeps.
 */
export function getFastEditDistance(s1: string, s2: string, maxLimit: number): number {
  const len1 = s1.length;
  const len2 = s2.length;

  if (Math.abs(len1 - len2) > maxLimit) {
    return maxLimit + 1;
  }
  
  if (s1 === s2) return 0;
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Use thread-safe row buffer inside safe boundaries
  const n = Math.min(len2, maxWordLength - 1);
  const row = rowBuffer;

  // Initialize first row
  for (let j = 0; j <= n; j++) {
    row[j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    let prev = i;
    const char1 = s1[i - 1];
    
    for (let j = 1; j <= n; j++) {
      const char2 = s2[j - 1];
      let val = row[j - 1]; // substitution cost
      
      if (char1 !== char2) {
        // Find minimum of (deletion, insertion, substitution) + 1
        const deletion = row[j] + 1;
        const insertion = prev + 1;
        const substitution = val + 1;
        val = Math.min(deletion, insertion, substitution);
      }
      
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }

  return row[n];
}
