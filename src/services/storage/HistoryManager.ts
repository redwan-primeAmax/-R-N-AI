/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './DexieDB';

const RECENT_NOTES_KEY = 'recent_notes_history';
const MAX_RECENT_NOTES = 10;

export interface RecentNote {
  id: string;
  title: string;
  emoji: string;
  timestamp: number;
}

export class HistoryManager {
  static async addNoteToHistory(note: { id: string; title: string; emoji: string }) {
    const history = await this.getRecentNotes();
    const filtered = history.filter(n => n.id !== note.id);
    const newEntry: RecentNote = {
      ...note,
      timestamp: Date.now()
    };
    
    const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_NOTES);
    await db.key_value_pairs.put({ key: RECENT_NOTES_KEY, value: updated });
    window.dispatchEvent(new CustomEvent('history-updated'));
  }

  static async getRecentNotes(): Promise<RecentNote[]> {
    const record = await db.key_value_pairs.get(RECENT_NOTES_KEY);
    return (record ? record.value : null) || [];
  }
}
