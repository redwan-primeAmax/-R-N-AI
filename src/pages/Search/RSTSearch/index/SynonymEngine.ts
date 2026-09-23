/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
