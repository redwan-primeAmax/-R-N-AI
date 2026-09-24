/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mocked WasmBridgeService for AI Studio environment.
 * Original was likely a C++ WebAssembly module for crypto.
 */
export const WasmBridgeService = {
  init: async () => {
    console.log('[WasmBridgeService] Mock initialized');
    return true;
  },

  generateSalt: (length: number = 16): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  hashPassword: (password: string, salt: string): string => {
    // Simple deterministic mock hash (In production this would be argon2 or similar)
    // We combine password and salt and do a simple transformation
    const combined = password + salt;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  },

  verifyPassword: (password: string, hash: string, salt: string): boolean => {
    const calculated = WasmBridgeService.hashPassword(password, salt);
    return calculated === hash;
  }
};
