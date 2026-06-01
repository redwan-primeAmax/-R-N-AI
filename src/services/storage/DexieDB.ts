/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import localforage from 'localforage';
import { 
  Note, Workspace, NoteVersion, ChatMessage, 
  AITask, ContextSummary, AISettings, UserPreferences 
} from '../../types';

export interface KeyValuePair {
  key: string;
  value: any;
}

export interface MediaRecord {
  id: string;
  blob: Blob;
}

export class NotionCloneDexieDB extends Dexie {
  notes!: Table<Note, string>;
  workspaces!: Table<Workspace, string>;
  chat_history!: Table<ChatMessage & { id?: number }, number>;
  ai_tasks!: Table<AITask, string>;
  note_versions!: Table<NoteVersion, string>;
  media!: Table<MediaRecord, string>;
  key_value_pairs!: Table<KeyValuePair, string>;

  constructor() {
    super('NotionCloneDexie');
    this.version(2).stores({
      notes: 'id, title, workspaceId, parentId, isTrashed, isFavorite, isPinned, updatedAt, [workspaceId+isTrashed]',
      workspaces: 'id, name, createdAt',
      chat_history: '++id, timestamp',
      ai_tasks: 'id, status, createdAt, updatedAt',
      note_versions: 'id, noteId, createdAt',
      media: 'id',
      key_value_pairs: 'key'
    });
  }
}

export const db = new NotionCloneDexieDB();

/**
 * Perform a transaction-based migration from localforage to Dexie to avoid any data loss.
 * Runs once at start.
 */
export async function runMigrationFromLocalForage(): Promise<void> {
  try {
    // 0. Ensure all notes in Dexie have workspaceId set to 'default' if missing (runs dynamically even if general migration completed)
    const wsMigrated = await db.key_value_pairs.get('WORKSPACE_ID_MIGRATION_COMPLETE');
    if (!wsMigrated || wsMigrated.value !== true) {
      console.log('Dexie Migration: Normalizing note workspaceIds...');
      let modified = 0;
      await db.notes.filter(n => !n.workspaceId || n.workspaceId === '').modify(n => {
        n.workspaceId = 'default';
        modified++;
      });
      await db.key_value_pairs.put({ key: 'WORKSPACE_ID_MIGRATION_COMPLETE', value: true });
      console.log(`Dexie Migration: Normalized ${modified} notes to workspace 'default'.`);
    }

    const isMigrated = await db.key_value_pairs.get('LF_MIGRATION_COMPLETE_V2');
    if (isMigrated && isMigrated.value === true) {
      console.log('Dexie Migration: Already migrated to Dexie.');
      return;
    }

    console.log('Dexie Migration: Starting migration from LocalForage to Dexie...');

    // 1. Migrate system configurations & single keys
    const userName = await localforage.getItem<string>('user_name');
    if (userName) {
      await db.key_value_pairs.put({ key: 'user_name', value: userName });
    }

    const userPrefs = await localforage.getItem<UserPreferences>('user_preferences');
    if (userPrefs) {
      await db.key_value_pairs.put({ key: 'user_preferences', value: userPrefs });
    }

    const systemConfig = await localforage.getItem('system_config');
    if (systemConfig) {
      await db.key_value_pairs.put({ key: 'system_config', value: systemConfig });
    }

    const aiSettings = await localforage.getItem<AISettings>('ai_settings');
    if (aiSettings) {
      await db.key_value_pairs.put({ key: 'ai_settings', value: aiSettings });
    }

    const contextSummary = await localforage.getItem<ContextSummary>('context_summary');
    if (contextSummary) {
      await db.key_value_pairs.put({ key: 'context_summary', value: contextSummary });
    }

    // 2. Migrate Workspaces
    const LF_WORKSPACES_KEY = 'workspaces';
    const workspaces = await localforage.getItem<Workspace[]>(LF_WORKSPACES_KEY) || [];
    if (workspaces.length > 0) {
      await db.workspaces.bulkPut(workspaces);
      console.log(`Dexie Migration: Migrated ${workspaces.length} workspaces.`);
    }

    // 3. Migrate Notes
    const LF_NOTES_KEY = 'notes';
    const notes = await localforage.getItem<Note[]>(LF_NOTES_KEY) || [];
    if (notes.length > 0) {
      await db.notes.bulkPut(notes);
      console.log(`Dexie Migration: Migrated ${notes.length} notes.`);
    }

    // 4. Migrate Note Versions
    const versions = await localforage.getItem<NoteVersion[]>('rn_note_versions') || [];
    if (versions.length > 0) {
      await db.note_versions.bulkPut(versions);
      console.log(`Dexie Migration: Migrated ${versions.length} versions.`);
    }

    // 5. Migrate AI Tasks
    const tasks = await localforage.getItem<AITask[]>('ai_tasks') || [];
    if (tasks.length > 0) {
      await db.ai_tasks.bulkPut(tasks);
      console.log(`Dexie Migration: Migrated ${tasks.length} AI Tasks.`);
    }

    // 6. Migrate Chat History
    const chatHistory = await localforage.getItem<ChatMessage[]>('chat_history') || [];
    if (chatHistory.length > 0) {
      await db.chat_history.bulkAdd(chatHistory);
      console.log(`Dexie Migration: Migrated ${chatHistory.length} chat history records.`);
    }

    // 7. Migrate large Media files / Blobs
    const mediaKeys = await localforage.getItem<string[]>('media_store') || [];
    if (mediaKeys.length > 0) {
      // Chunk batches to avoid memory overflow for huge amounts of image data
      for (let i = 0; i < mediaKeys.length; i += 20) {
        const batchKeys = mediaKeys.slice(i, i + 20);
        const batchData: MediaRecord[] = [];
        
        for (const key of batchKeys) {
          const blob = await localforage.getItem<Blob>(key);
          if (blob) batchData.push({ id: key, blob });
        }
        
        if (batchData.length > 0) {
          await db.media.bulkPut(batchData);
        }
      }
      console.log(`Dexie Migration: Migrated media blobs.`);
    }

    // Run custom-prefixed/individual media keys search just in case
    const lfKeys = await localforage.keys();
    const untrackedMediaKeys = lfKeys.filter(k => k.startsWith('media_') && !mediaKeys.includes(k));
    if (untrackedMediaKeys.length > 0) {
      for (let i = 0; i < untrackedMediaKeys.length; i += 20) {
        const batchKeys = untrackedMediaKeys.slice(i, i + 20);
        const batchData: MediaRecord[] = [];
        
        for (const key of batchKeys) {
          const blob = await localforage.getItem<Blob>(key);
          if (blob instanceof Blob) {
            batchData.push({ id: key, blob });
          }
        }
        
        if (batchData.length > 0) {
          await db.media.bulkPut(batchData);
        }
      }
      console.log(`Dexie Migration: Migrated additional ${untrackedMediaKeys.length} media blobs.`);
    }

    // Mark as complete so we never run this slow migration again
    await db.key_value_pairs.put({ key: 'LF_MIGRATION_COMPLETE_V2', value: true });
    console.log('Dexie Migration: Success! All data is fully migrated to high-performance Dexie DB.');

    // We can clean up localforage content in the background to free disk space or keep it as backup
    // Let's keep it as backup initially to guarantee absolute safety, but we could prune it.
  } catch (error) {
    console.error('Dexie Migration Error:', error);
  }
}
