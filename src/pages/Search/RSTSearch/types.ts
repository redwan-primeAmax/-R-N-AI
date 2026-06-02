/**
 * RST (Redwan Smart & Tiny) Search - Type Definitions
 */

import { Note } from '../../../types/note';

export type { Note };

export interface SearchToken {
  term: string;
  weight: number;
}

export interface SearchResult {
  note: Note;
  score: number;
}

export interface InvertedIndexEntry {
  docIndex: number;
  frequency: number;
  positions: Uint32Array;
}
