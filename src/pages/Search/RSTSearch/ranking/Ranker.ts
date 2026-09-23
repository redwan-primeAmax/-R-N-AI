/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function calculateProximityBonus(text: string, words: string[]): number {
  if (!text || words.length <= 1) return 0;
  
  const textLower = text.toLowerCase();
  let bonus = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const pair = `${words[i]} ${words[i + 1]}`;
    if (textLower.includes(pair)) {
      bonus += 300;
    }
  }

  return bonus;
}

export function calculateStructureBonus(content: string, words: string[]): number {
  if (!content || words.length === 0) return 0;

  let bonus = 0;
  const contentLower = content.toLowerCase();

  for (const word of words) {
    if (!word) continue;
    if (contentLower.includes(`<h1`) && contentLower.includes(word)) bonus += 250;
    if (contentLower.includes(`<h2`) && contentLower.includes(word)) bonus += 150;
    if (contentLower.includes(`<b>`) || contentLower.includes(`<strong>`)) bonus += 50;
  }

  return bonus;
}
