/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import localforage from 'localforage';
import { db, runMigrationFromLocalForage } from './DexieDB';
import { iconsDb } from '../../components/icon/IconManager';
import { HistoryManager } from './HistoryManager';
import { NoteService } from './services/NoteService';
import { WorkspaceService } from './services/WorkspaceService';
import { MediaService } from './services/MediaService';
import { BackupService } from './services/BackupService';
import { SettingsService, encryptText, decryptText } from './services/SettingsService';
import { AIServiceStorage } from './services/AIServiceStorage';

const AppStore = {
  reloadWorkspaces: () => {},
  reloadNotes: (_force?: boolean) => {}
};

import type { 
  Note, Workspace, NoteVersion, ChatMessage, 
  AITask, ContextSummary, AISettings, UserPreferences, BookmarkFolder
} from '../../types';

export type { Note, Workspace, NoteVersion, ChatMessage, AITask, ContextSummary, AISettings, UserPreferences, BookmarkFolder };

// Trigger background migration seamlessly on load
runMigrationFromLocalForage().then(() => {
  console.log('DataManager: Dexie migration completed.');
}).catch(err => {
  console.error('DataManager: Dexie migration error:', err);
});

localforage.config({
  name: 'NotionClone',
  storeName: 'notes_store'
});

const syncChannel = new BroadcastChannel('notion_sync');
const clientId = crypto.randomUUID();

window.addEventListener('beforeunload', () => {
  syncChannel.close();
});

const localSyncEmitter = new EventTarget();

syncChannel.onmessage = (event) => {
  if (event.data?.senderId === clientId) return;
  const type = event.data?.type || '';
  if (type.includes('NOTE') || type.includes('CACHE_INVALIDATED') || type.includes('PERMANENT')) {
    DataManager.invalidateNotesCache(`broadcast:${type}`);
  }
  if (type.includes('SETTINGS')) {
    SettingsService.invalidateSettingsCache();
  }

  const customEvent = new CustomEvent('sync', { detail: event.data });
  localSyncEmitter.dispatchEvent(customEvent);
};

const notifySync = (data: any) => {
  syncChannel.postMessage({ ...data, senderId: clientId });
  const customEvent = new CustomEvent('sync', { detail: { ...data, senderId: clientId } });
  localSyncEmitter.dispatchEvent(customEvent);
};

let cachedStorageUsage: { used: number; quota: number } | null = null;
let lastStorageCheck = 0;
const CUSTOM_EXTENSION = '.redwan';

export const encrypt = encryptText;
export const decrypt = decryptText;

export const DataManager = {
  getClientId: () => clientId,
  
  async encryptValue(text: string): Promise<string> {
    return encryptText(text);
  },
  
  async decryptValue(encoded: string): Promise<string> {
    return decryptText(encoded);
  },

  async getUserName(): Promise<string | null> {
    return SettingsService.getUserName();
  },

  async getFullUserName(): Promise<string | null> {
    return SettingsService.getFullUserName();
  },

  async saveUserName(name: string): Promise<void> {
    await SettingsService.saveUserName(name);
  },

  async getUserPreferences(): Promise<UserPreferences> {
    return SettingsService.getUserPreferences();
  },

  async saveUserPreferences(prefs: UserPreferences): Promise<void> {
    await SettingsService.saveUserPreferences(prefs);
    this.triggerSync('SYNC_COMPLETE');
  },

  async getUser(): Promise<any> {
    return SettingsService.getUserProfile();
  },

  async updateUser(user: any): Promise<void> {
    await SettingsService.updateUserProfile(user);
  },

  async updateNote(id: string, updates: Partial<Note>): Promise<void> {
    await NoteService.updateNote(id, updates);
    this.invalidateNotesCache(`update-note:${id}`);
  },

  // --- Workspace Operations ---
  async getWorkspaces(): Promise<Workspace[]> {
    return WorkspaceService.getWorkspaces();
  },

  async getActiveWorkspaceId(): Promise<string> {
    return WorkspaceService.getActiveWorkspaceId();
  },

  async setActiveWorkspaceId(id: string): Promise<void> {
    await WorkspaceService.setActiveWorkspaceId(id);
    this.invalidateNotesCache(`switch-workspace:${id}`);
    window.dispatchEvent(new CustomEvent('workspace-notes-changed'));
  },

  async getSystemConfig(): Promise<any> {
    return SettingsService.getSystemConfig();
  },

  async saveSystemConfig(config: any): Promise<void> {
    await SettingsService.saveSystemConfig(config);
  },

  async saveWorkspace(workspace: Workspace): Promise<void> {
    await WorkspaceService.saveWorkspace(workspace);
    notifySync({ type: 'SYNC_COMPLETE' });
    AppStore.reloadWorkspaces();
  },

  async deleteWorkspace(id: string): Promise<void> {
    await WorkspaceService.deleteWorkspace(id);
    this.invalidateNotesCache(`delete-workspace:${id}`);
    AppStore.reloadWorkspaces();
  },

  async getNoteCountForWorkspaces(): Promise<Record<string, number>> {
    return WorkspaceService.getNoteCountForWorkspaces();
  },

  // --- AI Settings Operations ---
  async getAISettings(): Promise<AISettings> {
    return SettingsService.getAISettings();
  },

  async saveAISettings(settings: AISettings): Promise<void> {
    await SettingsService.saveAISettings(settings);
  },

  // --- Notes Operations ---
  async getAllNotes(forceRefresh: boolean = false): Promise<Note[]> {
    return NoteService.getAllNotes(forceRefresh);
  },

  invalidateNotesCache(reason: string = 'mutation') {
    NoteService.invalidateCache();
    this.resetStorageCache();

    try {
      import('../../pages/Search/RSTSearch/RSTSearch').then(mod => {
        if (mod && typeof mod.invalidateRST === 'function') {
          mod.invalidateRST();
        }
      }).catch(() => {});
    } catch {}

    if (!reason.startsWith('broadcast:')) {
      notifySync({ type: 'NOTES_CACHE_INVALIDATED', reason });
    }
    window.dispatchEvent(new CustomEvent('workspace-notes-changed', { detail: { reason } }));
    window.dispatchEvent(new CustomEvent('notes-cache-invalidated', { detail: { reason } }));
    AppStore.reloadNotes(true);
  },

  resetStorageCache() {
    cachedStorageUsage = null;
    lastStorageCheck = 0;
  },

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    const now = Date.now();
    if (cachedStorageUsage && (now - lastStorageCheck < 2000)) {
      return cachedStorageUsage;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          const result = { used: estimate.usage, quota: estimate.quota };
          cachedStorageUsage = result;
          lastStorageCheck = now;
          return result;
        }
      }

      let total = 0;
      const notesCount = await db.notes.count();
      if (notesCount > 0) {
        const sampleNotes = await db.notes.limit(10).toArray();
        const sampleSize = sampleNotes.reduce((acc, note) => acc + (note.title?.length || 0) * 2 + (note.content?.length || 0) * 2 + 250, 0);
        const avgSize = sampleNotes.length > 0 ? sampleSize / sampleNotes.length : 1000;
        total += Math.round(avgSize * notesCount);
      }

      const result = { used: total, quota: 1024 * 1024 * 1024 };
      cachedStorageUsage = result;
      lastStorageCheck = now;
      return result;
    } catch (e) {
      console.error('Storage estimate check failed:', e);
      return { used: 1024 * 50, quota: 1024 * 1024 * 1024 };
    }
  },

  async exportAllData(): Promise<string> {
    return BackupService.exportAllData();
  },

  async saveInternalBackup(data: string): Promise<void> {
    return BackupService.saveInternalBackup(data);
  },

  async getInternalBackups(): Promise<any[]> {
    return BackupService.getInternalBackups();
  },

  async deleteInternalBackup(id: string): Promise<void> {
    return BackupService.deleteInternalBackup(id);
  },

  async importAllData(anonData: string): Promise<void> {
    await BackupService.importAllData(anonData);
    this.invalidateNotesCache('import-all-data');
    notifySync({ type: 'SYNC_COMPLETE' });
    setTimeout(() => {
      window.location.reload();
    }, 100);
  },

  async getNotesPaginated(page: number, pageSize: number): Promise<{ notes: Note[], hasMore: boolean }> {
    return NoteService.getNotesPaginated(page, pageSize);
  },

  async clearMemory(): Promise<void> {
    console.log('Memory cleared');
  },

  async getNoteById(id: string, recordHistory: boolean = false): Promise<Note | null> {
    return NoteService.getNoteById(id, recordHistory);
  },

  async createNote(workspaceId: string = 'default', parentId?: string): Promise<Note> {
    const note = await NoteService.createNote(workspaceId, parentId);
    this.invalidateNotesCache(`create-note:${note.id}`);
    notifySync({ type: 'UPDATE_NOTE', id: note.id });
    return note;
  },

  async saveNote(note: Note): Promise<Note> {
    const usage = await this.getStorageUsage();
    if (usage.used > usage.quota * 0.9) {
      const msg = usage.used > usage.quota * 0.98 
        ? "সঞ্চয়স্থান প্রায় পূর্ণ! দয়া করে কিছু ডাটা ডিলিট করুন অথবা ক্লাউড সংযোগ করুন।"
        : "সঞ্চয়স্থান পূর্ণ হতে চলেছে।";
      window.dispatchEvent(new CustomEvent('storage-warning', { detail: { message: msg, severity: usage.used > usage.quota * 0.98 ? 'error' : 'warning' } }));
    }

    const saved = await NoteService.saveNote(note);
    HistoryManager.addNoteToHistory({
      id: saved.id,
      title: saved.title || 'Untitled',
      emoji: saved.emoji || ''
    }).catch(() => {});

    this.invalidateNotesCache(`save-note:${saved.id}`);
    notifySync({ type: 'UPDATE_NOTE', id: saved.id });
    return saved;
  },

  async checkDuplicateTitle(title: string, workspaceId?: string): Promise<string> {
    return NoteService.checkDuplicateTitle(title, workspaceId);
  },

  async duplicateNote(id: string): Promise<Note | null> {
    const dup = await NoteService.duplicateNote(id);
    if (dup) {
      this.invalidateNotesCache(`duplicate-note:${id}`);
    }
    return dup;
  },

  async toggleFavorite(id: string): Promise<void> {
    await NoteService.toggleFavorite(id);
    this.invalidateNotesCache(`toggle-favorite:${id}`);
  },

  async getNotes(): Promise<Note[]> {
    return this.getAllNotes();
  },

  async deleteNote(id: string): Promise<void> {
    await NoteService.deleteNote(id);
    this.invalidateNotesCache(`soft-delete:${id}`);
    notifySync({ type: 'DELETE_NOTE', id });
  },

  async deleteNotePermanent(id: string): Promise<void> {
    await NoteService.deleteNotePermanent(id);
    this.invalidateNotesCache(`permanent-delete:${id}`);
    notifySync({ type: 'PERMANENT_DELETE_NOTE', id });
  },

  async bulkDeleteNotesPermanent(ids: string[]): Promise<void> {
    await NoteService.bulkDeleteNotesPermanent(ids);
    this.invalidateNotesCache(`bulk-permanent-delete:${ids.length} notes`);
    notifySync({ type: 'PERMANENT_DELETE_NOTES', ids });
  },

  async deleteNotes(ids: string[]): Promise<void> {
    await NoteService.deleteNotes(ids);
    this.invalidateNotesCache(`bulk-soft-delete:${ids.length} notes`);
    notifySync({ type: 'DELETE_NOTES', ids });
  },

  async bulkTrashNotes(ids: string[]): Promise<void> {
    await NoteService.bulkTrashNotes(ids);
    this.invalidateNotesCache(`bulk-trash:${ids.length} notes`);
    notifySync({ type: 'UPDATE_NOTES', ids });
  },

  async exportNote(note: Note): Promise<void> {
    const data = JSON.stringify(note, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'untitled'}${CUSTOM_EXTENSION}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async exportNoteAsTxt(note: Note): Promise<void> {
    const plainText = note.content.replace(/<[^>]*>/g, '');
    const content = `${note.emoji} ${note.title || 'Untitled'}\n${'='.repeat(40)}\n\n${plainText}`;
    
    const blob = new Blob(["\ufeff", content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'untitled'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async replaceContent(idOrTitle: string, search: string, replacement: string): Promise<void> {
    await NoteService.replaceContent(idOrTitle, search, replacement);
    this.invalidateNotesCache(`replace-content:${idOrTitle}`);
  },

  async searchNotes(query: string): Promise<Note[]> {
    return NoteService.searchNotes(query);
  },

  // --- Bookmark Operations ---
  async getBookmarkFolders(): Promise<BookmarkFolder[]> {
    return NoteService.getBookmarkFolders();
  },

  async createBookmarkFolder(name: string, parentId?: string): Promise<BookmarkFolder> {
    return NoteService.createBookmarkFolder(name, parentId);
  },

  async deleteBookmarkFolder(id: string): Promise<void> {
    await NoteService.deleteBookmarkFolder(id);
    this.invalidateNotesCache(`delete-bookmark-folder:${id}`);
  },

  async toggleLock(noteId: string): Promise<boolean> {
    const newState = await NoteService.toggleLock(noteId);
    this.invalidateNotesCache(`lock:${noteId}`);
    return newState;
  },

  async addNoteToBookmark(noteId: string, folderId?: string): Promise<void> {
    await NoteService.addNoteToBookmark(noteId, folderId);
    this.invalidateNotesCache(`add-bookmark:${noteId}`);
  },

  async removeNoteFromBookmark(noteId: string): Promise<void> {
    await NoteService.removeNoteFromBookmark(noteId);
    this.invalidateNotesCache(`remove-bookmark:${noteId}`);
  },

  async wasPermanentlyDeleted(id: string): Promise<boolean> {
    return NoteService.wasPermanentlyDeleted(id);
  },

  // --- Chat History Operations ---
  async getChatHistory(): Promise<ChatMessage[]> {
    return AIServiceStorage.getChatHistory();
  },

  async saveChatMessage(message: ChatMessage): Promise<void> {
    await AIServiceStorage.saveChatMessage(message);
    syncChannel.postMessage({ type: 'UPDATE_CHAT' });
  },

  async clearChatHistory(): Promise<void> {
    await AIServiceStorage.clearChatHistory();
    syncChannel.postMessage({ type: 'CLEAR_CHAT' });
  },

  // --- AI Task Operations ---
  async getTasks(): Promise<AITask[]> {
    return AIServiceStorage.getTasks();
  },

  async saveTask(task: AITask): Promise<void> {
    await AIServiceStorage.saveTask(task);
    syncChannel.postMessage({ type: 'UPDATE_TASKS' });
  },

  async deleteTask(id: string): Promise<void> {
    await AIServiceStorage.deleteTask(id);
    syncChannel.postMessage({ type: 'DELETE_TASK', id });
  },

  async updateTaskPartStatus(taskId: string, partTitle: string, status: 'pending' | 'completed'): Promise<void> {
    await AIServiceStorage.updateTaskPartStatus(taskId, partTitle, status);
    syncChannel.postMessage({ type: 'UPDATE_TASKS' });
  },

  // --- Context Summary Operations ---
  async getContextSummary(): Promise<ContextSummary | null> {
    return AIServiceStorage.getContextSummary();
  },

  async saveContextSummary(summary: ContextSummary): Promise<void> {
    return AIServiceStorage.saveContextSummary(summary);
  },

  async deleteOldMessages(count: number): Promise<void> {
    await AIServiceStorage.deleteOldMessages(count);
    syncChannel.postMessage({ type: 'UPDATE_CHAT' });
  },

  onSync(callback: (event: any) => void) {
    const handler = (e: any) => callback(e.detail);
    localSyncEmitter.addEventListener('sync', handler);
    return handler;
  },

  offSync(handler: any) {
    if (handler) {
      localSyncEmitter.removeEventListener('sync', handler);
    }
  },

  triggerSync(type: string, data?: any) {
    notifySync({ type, ...data });
  },

  // --- Storage & Media ---
  async uploadMedia(file: File, path: string): Promise<string> {
    return MediaService.uploadMedia(file, path);
  },

  async resolveMediaUrls(content: string): Promise<string> {
    return MediaService.resolveMediaUrls(content);
  },

  revokeMediaUrls(): void {
    MediaService.revokeMediaUrls();
  },

  async extractMediaFromContent(content: string): Promise<string> {
    return MediaService.extractMediaFromContent(content);
  },

  async saveMedia(blob: Blob): Promise<string> {
    return MediaService.saveMedia(blob);
  },

  async getMedia(id: string): Promise<Blob | null> {
    return MediaService.getMedia(id);
  },

  async deleteMedia(id: string): Promise<void> {
    return MediaService.deleteMedia(id);
  },

  // --- Version Control Operations ---
  async saveVersion(version: NoteVersion): Promise<void> {
    return NoteService.saveVersion(version);
  },

  async getVersions(noteId: string): Promise<NoteVersion[]> {
    return NoteService.getVersions(noteId);
  },

  async deleteVersion(id: string): Promise<void> {
    return NoteService.deleteVersion(id);
  },

  async createDemoData(): Promise<void> {
    const wsId = await this.getActiveWorkspaceId();
    const demoNotes: Note[] = [
      {
        id: crypto.randomUUID(),
        title: 'Project Alpha',
        content: '<p>Initial brainstorm for project alpha.</p>',
        emoji: '',
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000,
        workspaceId: wsId,
        tags: ['strategy', 'demo']
      },
      {
        id: crypto.randomUUID(),
        title: 'Meeting Notes',
        content: '<p>Discussed the quarterly goals.</p>',
        emoji: '',
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now() - 172800000,
        workspaceId: wsId,
        tags: ['meeting']
      }
    ];

    await db.transaction('rw', db.notes, async () => {
      await db.notes.bulkPut(demoNotes);
    });
    this.invalidateNotesCache('demo-data-seed');
  },

  // --- Garbage Collector Methods ---
  async getGarbageStats(): Promise<{
    trashedNotesCount: number;
    unusedMediaCount: number;
    unusedMediaSize: number;
    outdatedVersionsCount: number;
    legacyCacheSize: number;
    searchIndexSize: number;
  }> {
    const trashedNotes = await db.notes.filter(n => !!n.isTrashed).toArray();
    const trashedNotesCount = trashedNotes.length;

    const { unusedMediaCount, unusedMediaSize } = await MediaService.getUnusedMediaStats();
    const outdatedVersionsCount = await db.note_versions.count();

    let legacyCacheSize = 0;
    try {
      const lfKeys = await localforage.keys();
      for (const key of lfKeys) {
        if (!['auto_download_enabled', 'offline_download_completed', 'system_tags', 'recent_notes_history', 'user_name'].includes(key)) {
          const item = await localforage.getItem(key);
          if (item) {
            legacyCacheSize += new Blob([JSON.stringify(item)]).size;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    return {
      trashedNotesCount,
      unusedMediaCount,
      unusedMediaSize,
      outdatedVersionsCount,
      legacyCacheSize,
      searchIndexSize: 0
    };
  },

  async cleanTrashedNotes(): Promise<number> {
    const trashedNotes = await db.notes.filter(n => !!n.isTrashed).toArray();
    const ids = trashedNotes.map(n => n.id);
    if (ids.length > 0) {
      await db.notes.bulkDelete(ids);
      await db.note_versions.where('noteId').anyOf(ids).delete();
      this.invalidateNotesCache('clean-trashed-notes');
    }
    return ids.length;
  },

  async optimizeStorage(): Promise<void> {
    try {
      await MediaService.cleanUnusedMedia();
      await db.note_versions.clear();
      await AIServiceStorage.clearChatHistory();

      const lfKeys = await localforage.keys();
      for (const key of lfKeys) {
        if (!['auto_download_enabled', 'offline_download_completed', 'system_tags', 'recent_notes_history', 'user_name'].includes(key)) {
          await localforage.removeItem(key);
        }
      }

      await db.key_value_pairs.delete('internal_backups');
      this.invalidateNotesCache('storage-optimization');
    } catch (e) {
      console.error('DataManager: Optimization failed', e);
      throw e;
    }
  },

  async cleanUnusedMedia(): Promise<{ count: number; savedSize: number }> {
    const res = await MediaService.cleanUnusedMedia();
    this.resetStorageCache();
    return res;
  },

  async cleanOutdatedVersions(): Promise<number> {
    const count = await db.note_versions.count();
    await db.note_versions.clear();
    this.resetStorageCache();
    return count;
  },

  async cleanLegacyCache(): Promise<number> {
    const lfKeys = await localforage.keys();
    let count = 0;
    for (const key of lfKeys) {
      if (!['auto_download_enabled', 'offline_download_completed', 'system_tags', 'recent_notes_history', 'user_name'].includes(key)) {
        await localforage.removeItem(key);
        count++;
      }
    }
    await db.chat_history.clear();
    this.resetStorageCache();
    this.invalidateNotesCache('clean-legacy-cache');
    return count;
  },

  async reindexAll(): Promise<void> {},

  async deleteAllData(): Promise<void> {
    try {
      const tablesToClear = [
        db.notes, db.workspaces, db.chat_history, db.ai_tasks,
        db.note_versions, db.media, db.key_value_pairs,
        db.extension_projects, db.bookmark_folders, db.deleted_notes
      ];

      await Promise.all(tablesToClear.map(t => t.clear().catch(() => {})));
      try { await iconsDb.icons.clear(); } catch {}

      localStorage.clear();
      await localforage.clear();
      window.location.reload();
    } catch (e) {
      console.error('DataManager: Failure deleting data', e);
      window.location.reload();
    }
  }
};
