/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DEFAULT_SALT = 'redwan_vault_salt_v1_#987!';

/**
 * Generates a salted SHA-256 hash of a string to avoid storing plaintext passwords or unsalted hashes.
 */
export async function hashPassword(password: string, salt: string = DEFAULT_SALT): Promise<string> {
  if (!password) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '::' + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('Password hashing failed, falling back safely:', err);
    // Simple fallback salted hash if crypto is not supported in non-secure context
    let hash = 0;
    const combined = password + salt;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'salted-fallback-' + Math.abs(hash).toString(16);
  }
}
