/**
 * Scorer.ts - World-Class BM25 & Bitwise Fuzzy Ranking Engine
 */

/**
 * Fuse.js core inspired Bitwise Fuzzy Matcher (Bitap Algorithm)
 * Returns a score between 0 (exact) and 1 (no match)
 */
export function calculateFuzzyScore(text: string, pattern: string): number {
  if (pattern.length === 0) return 0;
  
  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();
  
  // Quick direct contains check
  if (textLower.includes(patternLower)) {
    return (patternLower.length / textLower.length) * 0.1; // Very low score (good)
  }

  // Bitap bitwise approximate matching (distance = 1)
  const m = patternLower.length;
  if (m > 31) return textLower.includes(patternLower) ? 0 : 1;

  const charMask: number[] = new Array(256).fill(~0);
  for (let i = 0; i < m; i++) {
    charMask[patternLower.charCodeAt(i) & 0xff] &= ~(1 << i);
  }

  let R = ~1;
  for (let i = 0; i < textLower.length; i++) {
    R |= charMask[textLower.charCodeAt(i) & 0xff];
    R <<= 1;
    if ((R & (1 << m)) === 0) return 0.4; // Found with 1 error or bitshift offset
  }

  return 1.0; // No match
}

/**
 * Okapi BM25 implementation
 */
export function calculateBM25(
  termFreq: number,
  docLength: number,
  avgDocLength: number,
  totalDocs: number,
  docsWithTerm: number
): number {
  const k1 = 1.2;
  const b = 0.75;
  
  const idf = Math.log((totalDocs - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1);
  const tf = (termFreq * (k1 + 1)) / (termFreq + k1 * (1 - b + b * (docLength / avgDocLength)));
  
  return idf * tf;
}

export function getTermFrequency(text: string, term: string): number {
  if (!text.includes(term)) return 0;
  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  return (text.match(regex) || []).length;
}
