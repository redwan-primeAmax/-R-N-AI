/**
 * Tokenizer.ts - World-Class Bengali & English Segmentation
 */

import { normalizeText, stripHtml } from './StorageBuffer';

// Native V8 Segmenter for perfect word boundaries
const segmenter = typeof Intl !== 'undefined' && (Intl as any).Segmenter 
  ? new (Intl as any).Segmenter(['bn', 'en'], { granularity: 'word' })
  : null;

/**
 * World-Class Feature: Custom Bengali & English Phonetic Compression (Soundex Engine)
 */
export function getPhoneticKey(word: string): string {
  const normalized = word.toLowerCase().trim().normalize('NFC');
  if (!normalized) return '';
  
  // 1. Detect Bengali character range \u0980-\u09FF
  if (/[\u0980-\u09FF]/.test(normalized)) {
    let key = normalized;
    // Compress phonetically equivalent Bengali glyphs
    key = key.replace(/[শষ]/g, 'স');
    key = key.replace(/[ড়ঢ়]/g, 'র');
    key = key.replace(/[ইঈৈ]/g, 'ই');
    key = key.replace(/[উঊৌ]/g, 'উ');
    key = key.replace(/[তৎ]/g, 'ত');
    key = key.replace(/[ভ]/g, 'ব');
    key = key.replace(/[জঝয]/g, 'জ');
    key = key.replace(/[ণ]/g, 'ন');
    // Remove vowel signs at the end of words for root-stem extraction
    if (key.length > 2) {
      key = key.replace(/[াকারীতিুূেোৌ]$/, '');
    }
    return 'BN_' + key;
  }
  
  // 2. Standard soundex for Latin/English inputs
  const first = normalized[0].toUpperCase();
  const map: Record<string, string> = {
    b: '1', f: '1', p: '1', v: '1',
    c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
    d: '3', t: '3',
    l: '4',
    m: '5', n: '5',
    r: '6'
  };
  
  let key = first;
  let lastCode = map[normalized[0]] || '';
  for (let i = 1; i < normalized.length && key.length < 5; i++) {
    const char = normalized[i];
    const code = map[char] || '';
    if (code) {
      if (code !== lastCode) {
        key += code;
        lastCode = code;
      }
    } else {
      lastCode = '';
    }
  }
  return 'EN_' + key.padEnd(5, '0');
}

/**
 * Strips formatting and breaks text into unique searchable tokens
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(stripHtml(text));
  if (!normalized) return [];

  const tokens: string[] = [];
  
  if (segmenter) {
    const segments = segmenter.segment(normalized);
    for (const segment of segments) {
      if (segment.isWordLike) {
        const word = segment.segment.trim();
        if (word.length > 1) {
          tokens.push(word);
          // Also index phonetic variant
          const p = getPhoneticKey(word);
          if (p) tokens.push(p);
        }
      }
    }
  } else {
    // Fallback split that preserves hyphens for accuracy (e.g. to-do)
    const words = normalized.split(/[^a-z0-9\-\u0980-\u09FF]+/).filter(w => w.length > 1);
    for(const w of words) {
      tokens.push(w);
      const p = getPhoneticKey(w);
      if (p) tokens.push(p);
    }
  }

  return Array.from(new Set(tokens));
}
