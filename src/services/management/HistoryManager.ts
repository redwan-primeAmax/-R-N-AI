/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import localforage from 'localforage';

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
    await localforage.setItem(RECENT_NOTES_KEY, updated);
    window.dispatchEvent(new CustomEvent('history-updated'));
  }

  static async getRecentNotes(): Promise<RecentNote[]> {
    return (await localforage.getItem<RecentNote[]>(RECENT_NOTES_KEY)) || [];
  }
}
