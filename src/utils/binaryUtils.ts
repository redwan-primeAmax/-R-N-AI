/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts a Uint8Array or ArrayBuffer to Base64 in safe chunks
 * to avoid "Maximum call stack size exceeded" errors with large files.
 */
export function uint8ArrayToBase64(uint8: Uint8Array): string {
  const CHUNK_SIZE = 0x8000; // 32KB chunking
  let result = '';
  for (let i = 0; i < uint8.length; i += CHUNK_SIZE) {
    const chunk = uint8.subarray(i, i + CHUNK_SIZE);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(result);
}

/**
 * Converts a Base64 string back to Uint8Array safely.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a Blob to Base64 using FileReader
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts Base64 to Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = base64ToUint8Array(base64);
  return new Blob([bytes], { type: mimeType });
}
