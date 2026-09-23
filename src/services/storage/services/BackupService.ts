/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../DexieDB';
import { SettingsService, encryptText, decryptText } from './SettingsService';
import { blobToBase64, base64ToBlob } from '../../../utils/binaryUtils';
import { Note } from '../../../types';

export const BackupService = {
  async exportAllData(): Promise<string> {
    const notes = await db.notes.toArray();
    const workspaces = await db.workspaces.toArray();
    const media = await db.media.toArray();
    const settings = await SettingsService.getAISettings();
    const preferences = await SettingsService.getUserPreferences();
    const userName = await SettingsService.getFullUserName();

    // Convert media blobs to base64 using chunked reader
    const mediaWithBase64 = [];
    for (const m of media) {
      if (m.blob) {
        try {
          const base64 = await blobToBase64(m.blob);
          mediaWithBase64.push({ id: m.id, base64, mimeType: m.blob.type });
        } catch (e) {
          console.error('BackupService: Failed to export media item:', m.id, e);
        }
      }
    }

    const backupData = {
      notes,
      workspaces,
      media: mediaWithBase64,
      settings,
      preferences,
      userName,
      timestamp: Date.now(),
      version: '3.0.0-anon'
    };

    const json = JSON.stringify(backupData);
    return await encryptText(json);
  },

  async saveInternalBackup(data: string): Promise<void> {
    const backupsRecord = await db.key_value_pairs.get('internal_backups');
    const backups = backupsRecord ? backupsRecord.value : [];

    const newBackup = {
      id: crypto.randomUUID(),
      data,
      timestamp: Date.now(),
      size: new Blob([data]).size
    };

    const updatedBackups = [newBackup, ...backups].slice(0, 10);
    await db.key_value_pairs.put({ key: 'internal_backups', value: updatedBackups });
  },

  async getInternalBackups(): Promise<any[]> {
    const record = await db.key_value_pairs.get('internal_backups');
    return record ? record.value : [];
  },

  async deleteInternalBackup(id: string): Promise<void> {
    const record = await db.key_value_pairs.get('internal_backups');
    if (record) {
      const updated = record.value.filter((b: any) => b.id !== id);
      await db.key_value_pairs.put({ key: 'internal_backups', value: updated });
    }
  },

  async importAllData(anonData: string): Promise<void> {
    const json = await decryptText(anonData);
    const data = JSON.parse(json);

    if (!data || !Array.isArray(data.notes) || !Array.isArray(data.workspaces)) {
      throw new Error("Invalid backup file: 'notes' and 'workspaces' are required arrays.");
    }

    const { notes, workspaces, media, settings, preferences, userName } = data;

    const config = await SettingsService.getSystemConfig();
    const maxLimit = config?.noteLimitPerWorkspace || 10000;

    const clampedNotes: Note[] = [];
    const notesByWorkspace = new Map<string, Note[]>();
    for (const note of notes) {
      const ws = note.workspaceId || 'default';
      let list = notesByWorkspace.get(ws);
      if (!list) {
        list = [];
        notesByWorkspace.set(ws, list);
      }
      list.push(note);
    }
    for (const [_, list] of notesByWorkspace.entries()) {
      clampedNotes.push(...list.slice(0, maxLimit));
    }

    const restoredNoteIds = clampedNotes.map(n => n.id);

    await db.transaction('rw', [db.notes, db.workspaces, db.media, db.key_value_pairs, db.deleted_notes], async () => {
      await db.notes.clear();
      await db.workspaces.clear();
      await db.media.clear();

      // Clear tombstones for restored note IDs so they aren't blocked from appearing/editing
      if (restoredNoteIds.length > 0) {
        await db.deleted_notes.where('id').anyOf(restoredNoteIds).delete();
      }

      await db.notes.bulkPut(clampedNotes);
      await db.workspaces.bulkPut(workspaces);

      if (media && Array.isArray(media)) {
        const mediaRecords = media.map((m: any) => {
          if (m.base64 && m.mimeType) {
            return { id: m.id, blob: base64ToBlob(m.base64, m.mimeType) };
          }
          return m;
        });
        await db.media.bulkPut(mediaRecords);
      }

      if (settings) await SettingsService.saveAISettings(settings);
      if (preferences) await SettingsService.saveUserPreferences(preferences);
      if (userName) await SettingsService.saveUserName(userName);
    });
  }
};
