/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

/**
 * Safely truncates text taking into account Unicode grapheme clusters (such as Bengali ligatures and multi-byte emoji)
 * without splitting combined characters.
 */
export function truncateGraphemes(text: string, maxLength: number): string {
  if (!text) return '';
  
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    // @ts-ignore Segmenter is in modern ES
    const segmenter = new (Intl as any).Segmenter('bn', { granularity: 'grapheme' });
    const segments = Array.from(segmenter.segment(text), (s: any) => s.segment);
    if (segments.length <= maxLength) return text;
    return segments.slice(0, maxLength).join('') + '...';
  }

  // Fallback using Array.from (handles basic surrogate pairs)
  const chars = Array.from(text);
  if (chars.length <= maxLength) return text;
  return chars.slice(0, maxLength).join('') + '...';
}
