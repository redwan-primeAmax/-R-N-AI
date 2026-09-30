/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const BENGALI_REGEX = /[\u0980-\u09FF]/;
export const BENGALI_GLOBAL_REGEX = /[\u0980-\u09FF]+/g;

export function isBengali(text: string): boolean {
  if (!text) return false;
  return BENGALI_REGEX.test(text);
}

export function extractBengaliWords(text: string): string[] {
  if (!text) return [];
  return text.match(BENGALI_GLOBAL_REGEX) || [];
}

export function isBengaliBoundary(charCode: number): boolean {
  if (charCode >= 0xDC00 && charCode <= 0xDFFF) return true;
  if (charCode === 0x09CD) return true;
  if (charCode >= 0x09BE && charCode <= 0x09CC) return true;
  if (charCode === 0x09BC || charCode === 0x0981 || charCode === 0x0982 || charCode === 0x0983) return true;
  return false;
}
