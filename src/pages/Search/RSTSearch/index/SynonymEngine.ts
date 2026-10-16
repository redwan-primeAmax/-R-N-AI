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
 * Expand query terms with basic synonyms and variations
 */
export function expandQueryTerm(term: string): string[] {
  if (!term) return [];
  const normalized = term.toLowerCase().trim();
  if (!normalized) return [];

  const expanded = new Set<string>([normalized]);

  // Common synonym mappings
  const synonyms: Record<string, string[]> = {
    'todo': ['task', 'todos', 'tasks'],
    'note': ['page', 'document', 'notes'],
    'work': ['job', 'office', 'project'],
    'idea': ['thought', 'plan']
  };

  if (synonyms[normalized]) {
    synonyms[normalized].forEach(s => expanded.add(s));
  }

  return Array.from(expanded);
}
