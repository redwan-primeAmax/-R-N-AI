/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizeText, stripHtml } from './StorageBuffer';

const segmenter = typeof Intl !== 'undefined' && (Intl as any).Segmenter 
  ? new (Intl as any).Segmenter(['bn', 'en'], { granularity: 'word' })
  : null;

const phoneticCache = new Map<string, string>();

/**
 * Custom Bengali & English Phonetic Compression (Soundex Engine)
 */
export function getPhoneticKey(word: string): string {
  if (!word) return '';
  const cached = phoneticCache.get(word);
  if (cached !== undefined) return cached;

  const normalized = word.toLowerCase().trim().normalize('NFC');
  if (!normalized) return '';
  
  let result = '';

  // 1. Detect Bengali character range \u0980-\u09FF
  if (/[\u0980-\u09FF]/.test(normalized)) {
    let key = normalized;
    key = key.replace(/[শষ]/g, 'স');
    key = key.replace(/[ড়ঢ়]/g, 'র');
    key = key.replace(/[ইঈৈ]/g, 'ই');
    key = key.replace(/[উঊৌ]/g, 'উ');
    key = key.replace(/[তৎ]/g, 'ত');
    key = key.replace(/[ভ]/g, 'ব');
    key = key.replace(/[জঝয]/g, 'জ');
    key = key.replace(/[ণ]/g, 'ন');
    if (key.length > 2) {
      key = key.replace(/[াকারীতিুূেোৌ]$/, '');
    }
    result = 'BN_' + key;
  } else {
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
    result = 'EN_' + key.padEnd(5, '0');
  }

  phoneticCache.set(word, result);
  return result;
}

/**
 * Strips formatting and breaks text into unique searchable tokens.
 * Optimized with fast-path for ASCII / simple scripts.
 */
export function tokenize(text: string, includePhonetics: boolean = false): string[] {
  const normalized = normalizeText(stripHtml(text));
  if (!normalized) return [];

  // Fast path for pure ASCII or simple space-separated words (skip Segmenter allocation)
  const isSimpleAscii = /^[\x00-\x7F]+$/.test(normalized);
  const tokenSet = new Set<string>();

  if (isSimpleAscii) {
    const words = normalized.split(/[^a-z0-9\-]+/).filter(w => w.length > 1);
    for (const w of words) {
      tokenSet.add(w);
      if (includePhonetics) {
        const p = getPhoneticKey(w);
        if (p) tokenSet.add(p);
      }
    }
    return Array.from(tokenSet);
  }

  // Segmenter or regex split for complex scripts (Bengali, combined glyphs)
  if (segmenter) {
    const segments = segmenter.segment(normalized);
    for (const segment of segments) {
      if (segment.isWordLike) {
        const word = segment.segment.trim();
        if (word.length > 1) {
          tokenSet.add(word);
          if (includePhonetics) {
            const p = getPhoneticKey(word);
            if (p) tokenSet.add(p);
          }
        }
      }
    }
  } else {
    const words = normalized.split(/[^a-z0-9\-\u0980-\u09FF]+/).filter(w => w.length > 1);
    for (const w of words) {
      tokenSet.add(w);
      if (includePhonetics) {
        const p = getPhoneticKey(w);
        if (p) tokenSet.add(p);
      }
    }
  }

  return Array.from(tokenSet);
}
