/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
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
