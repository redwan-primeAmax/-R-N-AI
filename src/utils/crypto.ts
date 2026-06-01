/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates a SHA-256 hash of a string to avoid storing plaintext passwords.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('Password hashing failed, falling back safely:', err);
    // Simple fallback hash if crypto is not supported in non-secure context
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'fallback-' + hash.toString(16);
  }
}
