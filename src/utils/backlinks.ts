/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note } from '../types/note';

export interface BacklinkItem {
  noteId: string;
  title: string;
  emoji: string;
  snippet: string;
}

export function findBacklinks(noteId: string, allNotes: Note[]): BacklinkItem[] {
  if (!noteId || !allNotes || allNotes.length === 0) return [];

  const backlinks: BacklinkItem[] = [];

  for (const otherNote of allNotes) {
    if (otherNote.id === noteId || otherNote.isTrashed) continue;

    const content = otherNote.content || '';
    
    // Check for references in HTML data attributes, editor URLs, or markdown links
    const isLinked = 
      content.includes(`data-note-id="${noteId}"`) ||
      content.includes(`data-note-id='${noteId}'`) ||
      content.includes(`/editor/${noteId}`) ||
      content.includes(`[[${noteId}]]`);

    if (isLinked) {
      // Extract a text snippet around the match
      let snippet = 'সংযুক্ত নোট...';
      const matchIndex = content.indexOf(noteId);
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 40);
        const end = Math.min(content.length, matchIndex + 60);
        const rawSnippet = content.substring(start, end).replace(/<[^>]*>/g, ' ').trim();
        if (rawSnippet) snippet = `...${rawSnippet}...`;
      }

      backlinks.push({
        noteId: otherNote.id,
        title: otherNote.title || 'শিরোনামহীন',
        emoji: otherNote.emoji || '📄',
        snippet
      });
    }
  }

  return backlinks;
}
