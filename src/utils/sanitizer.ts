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
  return origin !== 'null' && allowed.includes(origin);
}
