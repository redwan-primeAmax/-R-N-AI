/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
