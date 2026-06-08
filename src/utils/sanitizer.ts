/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sanitizes a search query or input string to prevent XSS and limit length.
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  return query
    .replace(/[<>]/g, '') // Basic tag removal
    .trim()
    .slice(0, 100);
}

/**
 * Validates a message origin against allowed origins.
 */
export function isValidOrigin(origin: string): boolean {
  const allowed = [window.location.origin];
  return allowed.includes(origin) || origin === 'null';
}
