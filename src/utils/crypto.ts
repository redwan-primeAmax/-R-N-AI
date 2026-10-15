/** Password verifiers are versioned; legacy formats are read-only migration paths. */
import { uint8ArrayToBase64, base64ToUint8Array } from './binaryUtils';

export const PASSWORD_ITERATIONS = 600_000;
export const newSalt = () => uint8ArrayToBase64(crypto.getRandomValues(new Uint8Array(16)));

async function passwordMaterial(password: string) {
  if (!crypto.subtle) throw new Error('A secure context (HTTPS) is required for encryption.');
  return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
}
export async function deriveVaultKey(password: string, salt: string): Promise<CryptoKey> {
  const saltBytes = base64ToUint8Array(salt);
  if (saltBytes.length !== 16) throw new Error('Invalid vault salt');
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PASSWORD_ITERATIONS }, await passwordMaterial(password), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function hashPassword(password: string): Promise<string> {
  if (!password) throw new Error('Password must not be empty');
  const salt = newSalt();
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: base64ToUint8Array(salt), iterations: PASSWORD_ITERATIONS }, await passwordMaterial(password), 256);
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${uint8ArrayToBase64(new Uint8Array(bits))}`;
}
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export async function verifyPassword(password: string, stored: string, allowLegacyPlaintext = false): Promise<boolean> {
  if (!password || !stored) return false;
  if (stored.startsWith('pbkdf2$')) {
    const [format, count, salt, expected, extra] = stored.split('$');
    const iterations = Number(count);
    if (extra || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
    try {
      const bytes = base64ToUint8Array(salt);
      if (bytes.length !== 16 || base64ToUint8Array(expected).length !== 32) return false;
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes, iterations }, await passwordMaterial(password), 256);
      return equal(uint8ArrayToBase64(new Uint8Array(bits)), expected);
    } catch { return false; }
  }
  // Previous SHA-256 / 32-bit verifiers, accepted only to migrate after successful authentication.
  const oldSalt = 'redwan_vault_salt_v1_#987!';
  if (/^[0-9a-f]{64}$/.test(stored)) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + '::' + oldSalt));
    return equal(Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join(''), stored);
  }
  const oldHash = (input: string) => { let hash = 0; for (const char of input.split('')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0; return Math.abs(hash).toString(16); };
  if (stored.startsWith('salted-fallback-')) return equal('salted-fallback-' + oldHash(password + oldSalt), stored);
  if (stored.includes('$')) {
    const [salt, hash, extra] = stored.split('$');
    return !extra && equal(oldHash(password + salt), hash);
  }
  return allowLegacyPlaintext && equal(password, stored);
}
export async function encryptVaultText(value: string, key: CryptoKey, context: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) }, key, new TextEncoder().encode(value));
  const bytes = new Uint8Array(iv.length + data.byteLength);
  bytes.set(iv); bytes.set(new Uint8Array(data), iv.length);
  return 'RNV1:' + uint8ArrayToBase64(bytes);
}
export async function decryptVaultText(value: string, key: CryptoKey, context: string): Promise<string> {
  if (!value.startsWith('RNV1:')) throw new Error('Invalid encrypted content');
  const bytes = base64ToUint8Array(value.slice(5));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode(context) }, key, bytes.slice(12));
  return new TextDecoder().decode(plain);
}
