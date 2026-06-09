/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import localforage from 'localforage';
import { db, runMigrationFromLocalForage } from './DexieDB';
import { HistoryManager } from './HistoryManager';

console.log('DataManager: File loaded');

// Trigger background migration seamlessly on load
runMigrationFromLocalForage().then(() => {
  console.log('DataManager: Dexie migration completed.');
}).catch(err => {
  console.error('DataManager: Dexie migration error:', err);
});

import { 
  Note, Workspace, NoteVersion, ChatMessage, 
  AITask, ContextSummary, AISettings, UserPreferences 
} from '../../types';

export type { Note, Workspace, NoteVersion, ChatMessage, AITask, ContextSummary, AISettings, UserPreferences };

// Configure localforage for temporary fallbacks if needed
localforage.config({
  name: 'NotionClone',
  storeName: 'notes_store'
});

// BroadcastChannel for multi-tab sync
const syncChannel = new BroadcastChannel('notion_sync');
const clientId = crypto.randomUUID();

// Local event emitter for same-tab sync
const localSyncEmitter = new EventTarget();

syncChannel.onmessage = (event) => {
  if (event.data.type?.includes('NOTE')) {
    // Background refresh from Dexie storage
    DataManager.getAllNotes().then(notes => {
      if (notes) cachedNotes = notes;
    });
  }
  if (event.data.type?.includes('SETTINGS')) cachedSettings = null;
  
  // Forward to local listeners
  const customEvent = new CustomEvent('sync', { detail: event.data });
  localSyncEmitter.dispatchEvent(customEvent);
};

// Internal helper to trigger sync both locally and remotely
const notifySync = (data: any) => {
  // Remote
  syncChannel.postMessage({ ...data, senderId: clientId });
  // Local
  const customEvent = new CustomEvent('sync', { detail: { ...data, senderId: clientId } });
  localSyncEmitter.dispatchEvent(customEvent);
};

// In-memory cache for speed
let cachedNotes: Note[] | null = null;
let cachedSettings: AISettings | null = null;
let isSyncing = false;
let pendingSync = false;
let isFullyIndexed = false;

let cachedStorageUsage: { used: number; quota: number } | null = null;
let lastStorageCheck = 0;

// Internal helper to trigger sync both locally and remotely
const CHAT_HISTORY_KEY = 'chat_history';
const TASKS_KEY = 'ai_tasks';
const CONTEXT_SUMMARY_KEY = 'context_summary';
const USER_NAME_KEY = 'user_name';
const AI_SETTINGS_KEY = 'ai_settings';
const WORKSPACES_KEY = 'workspaces';
const VERSIONS_KEY = 'note_versions';
const MEDIA_KEY = 'media_store';
const CUSTOM_EXTENSION = '.redwan';

// Debounce indexing to avoid performance issues during rapid typing
let indexingTimeout: NodeJS.Timeout | null = null;
const scheduleIndexing = (note: Note) => {
  // RST Search handles indexing via worker sync, so we just clear legacy placeholders here
};

// Encryption/decryption helpers (AES-GCM for better security)
const ENCRYPTION_KEY_RAW = 'redwan-ai-super-secret-key-2024';
const SALT = 'redwan-salt';

async function getEncryptionKey() {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY_RAW),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

const encrypt = async (text: string) => {
  if (!text) return '';
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(text)
    );
    
    // Combine IV and Encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error('Encryption failed:', e);
    return '';
  }
};

const decrypt = async (encoded: string) => {
  if (!encoded) return '';
  try {
    // If it's too short to be a valid AES-GCM payload (12 IV + 16 Tag = 28 bytes)
    // Base64 of 28 bytes is around 38-40 characters.
    // If it's much shorter, it's likely a plain text key from an older version.
    if (encoded.length < 28) return encoded;

    let binaryString;
    try {
      binaryString = atob(encoded);
    } catch (e) {
      // Not valid base64
      return encoded;
    }
    
    const combined = new Uint8Array(
      binaryString.split('').map(char => char.charCodeAt(0))
    );

    if (combined.length < 28) {
      return encoded;
    }

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const key = await getEncryptionKey();
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    // Silently return original if decryption fails (likely plain text or old format)
    return encoded;
  }
};

// Request persistent storage
if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(persistent => {
    if (persistent) {
      console.log("Storage will not be cleared except by explicit user action");
    } else {
      console.log("Storage may be cleared by the UA under storage pressure.");
    }
  });
}

export const DataManager = {
  getClientId: () => clientId,
  async encryptValue(text: string): Promise<string> {
    return encrypt(text);
  },
  async decryptValue(encoded: string): Promise<string> {
    return decrypt(encoded);
  },
  async getUserName(): Promise<string | null> {
    const record = await db.key_value_pairs.get('user_name');
    const name = record ? record.value : null;
    if (!name) return null;
    if (name.length > 8) {
      return name.substring(0, 8) + '...';
    }
    return name;
  },

  async getFullUserName(): Promise<string | null> {
    const record = await db.key_value_pairs.get('user_name');
    return record ? record.value : null;
  },

  async saveUserName(name: string): Promise<void> {
    await db.key_value_pairs.put({ key: 'user_name', value: name });
  },

  async getUserPreferences(): Promise<UserPreferences> {
    const record = await db.key_value_pairs.get('user_preferences');
    const prefs = record ? record.value : null;
    return prefs || { reducedMotion: false, theme: 'dark' };
  },

  async saveUserPreferences(prefs: UserPreferences): Promise<void> {
    await db.key_value_pairs.put({ key: 'user_preferences', value: prefs });
    this.triggerSync('SYNC_COMPLETE');
  },

  // --- Workspace Operations ---
  async getWorkspaces(): Promise<Workspace[]> {
    let workspaces = await db.workspaces.toArray();
    
    if (!workspaces || workspaces.length === 0) {
      const defaultWorkspace: Workspace = {
        id: 'default',
        name: 'Default Workspace',
        createdAt: Date.now()
      };
      workspaces = [defaultWorkspace];
      await db.workspaces.put(defaultWorkspace);
      await this.setActiveWorkspaceId(defaultWorkspace.id);
    }
    return workspaces;
  },

  async getActiveWorkspaceId(): Promise<string> {
    const config = await this.getSystemConfig();
    return config?.activeWorkspaceId || 'default';
  },

  async setActiveWorkspaceId(id: string): Promise<void> {
    const config = await this.getSystemConfig();
    const newConfig = { ...config, activeWorkspaceId: id };
    await this.saveSystemConfig(newConfig);
    cachedNotes = null;
    window.dispatchEvent(new CustomEvent('workspace-notes-changed'));
  },

  async getSystemConfig(): Promise<any> {
    const record = await db.key_value_pairs.get('system_config');
    const config = record ? record.value : null;
    if (!config) {
      const defaultConfig = { activeWorkspaceId: 'default' };
      await db.key_value_pairs.put({ key: 'system_config', value: defaultConfig });
      return defaultConfig;
    }
    return config;
  },

  async saveSystemConfig(config: any): Promise<void> {
    await db.key_value_pairs.put({ key: 'system_config', value: config });
  },

  async saveWorkspace(workspace: Workspace): Promise<void> {
    workspace.updatedAt = Date.now();
    await db.workspaces.put(workspace);
    notifySync({ type: 'SYNC_COMPLETE' });
  },

  async deleteWorkspace(id: string): Promise<void> {
    await db.transaction('rw', [db.workspaces, db.notes, db.key_value_pairs, db.note_versions], async () => {
      // 1. Delete the workspace
      await db.workspaces.delete(id);

      // 2. Identify and delete all notes in this workspace
      const notesToDelete = await db.notes.where('workspaceId').equals(id).toArray();
      const noteIdsToDelete = notesToDelete.map(n => n.id);
      if (noteIdsToDelete.length > 0) {
        await db.notes.bulkDelete(noteIdsToDelete);
        // Delete all versions for these notes
        await db.note_versions.where('noteId').anyOf(noteIdsToDelete).delete();
      }
    });

    cachedNotes = null;

    // Check workspaces to swap active one
    const remainingWorkspaces = await db.workspaces.toArray();
    const currentId = await this.getActiveWorkspaceId();
    if (currentId === id) {
      if (remainingWorkspaces.length > 0) {
        await this.setActiveWorkspaceId(remainingWorkspaces[0].id);
      } else {
        const config = await this.getSystemConfig();
        await this.saveSystemConfig({ ...config, activeWorkspaceId: 'default' });
      }
    }
  },

  async getNoteCountForWorkspaces(): Promise<Record<string, number>> {
    const ws = await this.getWorkspaces();
    const counts: Record<string, number> = {};
    for (const w of ws) {
      counts[w.id] = await db.notes.where('workspaceId').equals(w.id).count();
    }
    return counts;
  },

  // --- AI Settings Operations ---
  async getAISettings(): Promise<AISettings> {
    if (cachedSettings) return cachedSettings;

    const record = await db.key_value_pairs.get('ai_settings');
    const settings = record ? record.value as AISettings : null;
    const defaultSettings: AISettings = {
      controlMode: 'auto',
      selectedProvider: 'gemini',
      selectedModels: {
        gemini: 'gemini-1.5-flash',
        openrouter: '',
        fireworks: 'accounts/fireworks/models/deepseek-v3p1',
        local: ''
      },
      apiKeys: {},
      enabledProviders: ['gemini', 'openrouter', 'fireworks'],
      dataCheckingEnabled: false,
      dataCheckingModel: 'free',
      retrySettings: {
        enabled: false,
        errorCodes: ''
      },
      selectedAppID: 'threat-all',
      customAppIDs: [],
      models: {
        gemini: 'gemini-1.5-flash',
        openrouter: '',
        fireworks: 'accounts/fireworks/models/deepseek-v3p1',
        local: ''
      },
      systemPrompt: 'আপনি একজন দক্ষ ব্যক্তিগত সহকারী। আপনি ব্যবহারকারীকে নিখুঁত এবং স্মার্ট উত্তর দিতে সাহায্য করেন।'
    };

    if (!settings) {
      await db.key_value_pairs.put({ key: 'ai_settings', value: defaultSettings });
      return defaultSettings;
    }

    // Decrypt API keys
    const decryptedKeys: any = {};
    if (settings.apiKeys) {
      await Promise.all(Object.keys(settings.apiKeys).map(async key => {
        const val = (settings.apiKeys as any)[key];
        decryptedKeys[key] = await decrypt(val);
      }));
    }

    // Merge stored settings with defaults to handle migrations from older versions
    const mergedSettings: AISettings = {
      ...defaultSettings,
      ...settings,
      selectedModels: {
        ...defaultSettings.selectedModels,
        ...(settings.selectedModels || {})
      },
      apiKeys: decryptedKeys,
      enabledProviders: ['gemini', 'openrouter', 'fireworks'],
      dataCheckingEnabled: settings.dataCheckingEnabled !== undefined ? settings.dataCheckingEnabled : defaultSettings.dataCheckingEnabled,
      dataCheckingModel: settings.dataCheckingModel || defaultSettings.dataCheckingModel,
      dataCheckingCustomProvider: settings.dataCheckingCustomProvider || 'gemini',
      retrySettings: settings.retrySettings || defaultSettings.retrySettings,
      selectedAppID: settings.selectedAppID || defaultSettings.selectedAppID,
      customAppIDs: settings.customAppIDs || defaultSettings.customAppIDs,
      models: settings.models || defaultSettings.models,
      systemPrompt: settings.systemPrompt || defaultSettings.systemPrompt
    };

    if (mergedSettings.selectedProvider as any === 'picoapps' || mergedSettings.selectedProvider === 'local') {
      mergedSettings.selectedProvider = 'gemini';
    }

    cachedSettings = mergedSettings;
    return mergedSettings;
  },

  async saveAISettings(settings: AISettings): Promise<void> {
    cachedSettings = settings;
    // Encrypt API keys before saving
    const encryptedKeys: any = {};
    if (settings.apiKeys) {
      await Promise.all(Object.keys(settings.apiKeys).map(async key => {
        const val = (settings.apiKeys as any)[key];
        encryptedKeys[key] = await encrypt(val);
      }));
    }

    const settingsToSave = {
      ...settings,
      apiKeys: encryptedKeys
    };
    await db.key_value_pairs.put({ key: 'ai_settings', value: settingsToSave });
  },

  // --- Notes Operations ---
  
  async getAllNotes(): Promise<Note[]> {
    if (cachedNotes !== null) {
      return cachedNotes;
    }
    const currentWorkspaceId = await this.getActiveWorkspaceId();
    
    // Memory-safe active workspace note loading with support for deep indexing
    let notes = await db.notes.where('workspaceId').equals(currentWorkspaceId).toArray();

    if (notes.length === 0) {
      const allNotesCount = await db.notes.count();
      if (allNotesCount === 0) {
        const defaults = await this.initializeDefaultNotes();
        const filteredDefault = defaults.filter(n => n.workspaceId === currentWorkspaceId || (currentWorkspaceId === 'default' && !n.workspaceId));
        cachedNotes = filteredDefault;
        return filteredDefault;
      }
    }

    cachedNotes = notes;
    return notes;
  },

  // --- Storage Usage ---
  
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
      
      // Fallback manual calculation if estimate is not available
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
    const notes = await db.notes.toArray();
    const workspaces = await db.workspaces.toArray();
    const media = await db.media.toArray();
    const settings = await this.getAISettings();
    const preferences = await this.getUserPreferences();
    const userName = await this.getFullUserName();

    const backupData = {
      notes,
      workspaces,
      media: media.map(m => ({ id: m.id, blob: m.blob })),
      settings,
      preferences,
      userName,
      timestamp: Date.now(),
      version: '3.0.0-anon'
    };

    // Serialize and encrypt for "impossible to decode" feel
    const json = JSON.stringify(backupData);
    const encrypted = await encrypt(json);
    
    // Obfuscate further by adding random noise or different encoding if needed
    // For now, AES-GCM + Base64 is quite strong.
    return encrypted;
  },

  async saveInternalBackup(data: string): Promise<void> {
    const backupsRecord = await db.key_value_pairs.get('internal_backups');
    const backups = backupsRecord ? backupsRecord.value : [];
    
    const newBackup = {
      id: crypto.randomUUID(),
      data: data,
      timestamp: Date.now(),
      size: new Blob([data]).size
    };

    // Keep only last 10 backups
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
    const json = await decrypt(anonData);
    const data = JSON.parse(json);
    
    const { notes, workspaces, media, settings, preferences, userName } = data;

    // Robustly filter/clamp notes so no workspace has more than 10,000 notes
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
    for (const [ws, list] of notesByWorkspace.entries()) {
      // Keep only up to 10000 notes
      const kept = list.slice(0, 10000);
      clampedNotes.push(...kept);
    }

    await db.transaction('rw', [db.notes, db.workspaces, db.media, db.key_value_pairs], async () => {
      await db.notes.clear();
      await db.workspaces.clear();
      await db.media.clear();
      
      await db.notes.bulkPut(clampedNotes);
      await db.workspaces.bulkPut(workspaces);
      
      if (media && Array.isArray(media)) {
        await db.media.bulkPut(media);
      }
      
      if (settings) await this.saveAISettings(settings);
      if (preferences) await this.saveUserPreferences(preferences);
      if (userName) await this.saveUserName(userName);
    });
    
    // Reset cache
    cachedNotes = null;
    isFullyIndexed = false;
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'SYNC_COMPLETE' });
    window.location.reload(); // Refresh to ensure all states are clean
  },

  async getNotesPaginated(page: number, pageSize: number): Promise<{ notes: Note[], hasMore: boolean }> {
    const currentWorkspaceId = await this.getActiveWorkspaceId();
    const start = page * pageSize;
    
    let paginatedNotes = await db.notes
      .where('workspaceId')
      .equals(currentWorkspaceId)
      .reverse()
      .offset(start)
      .limit(pageSize)
      .toArray();

    if (currentWorkspaceId === 'default') {
      const countNoWorkspace = await db.notes.filter(n => !n.workspaceId).count();
      if (countNoWorkspace > 0) {
        const allWorkspaceNotes = await this.getAllNotes();
        const sliced = allWorkspaceNotes.slice(start, start + pageSize);
        return {
          notes: sliced,
          hasMore: start + pageSize < allWorkspaceNotes.length
        };
      }
    }

    const totalNotes = await db.notes.where('workspaceId').equals(currentWorkspaceId).count();
    return {
      notes: paginatedNotes,
      hasMore: start + pageSize < totalNotes
    };
  },

  async initializeDefaultNotes(): Promise<Note[]> {
    const welcomeNote: Note = {
      id: 'welcome-note',
      title: 'স্বাগতম RETWAN Assistant-এ!',
      content: 'আপনার প্রথম নোটটি এখানে শুরু করুন। আপনি বাম পাশের মেনু থেকে নতুন নোট তৈরি করতে পারেন এবং সেটিংস থেকে এআই কনফিগার করতে পারেন।',
      emoji: '',
      workspaceId: 'default',
      isPinned: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isTrashed: false,
      isFavorite: false,
      isLocked: false,
      tags: ['Welcome', 'Guide']
    };
    await db.notes.put(welcomeNote);
    return [welcomeNote];
  },

  async clearMemory(): Promise<void> {
    console.log('Memory cleared');
  },

  async getNoteById(id: string): Promise<Note | null> {
    const note = await db.notes.get(id);
    if (note) {
      // Update lastOpenedAt in background
      db.notes.update(id, { lastOpenedAt: Date.now() }).then(() => {
        cachedNotes = null;
      });

      // Add to recent notes history
      HistoryManager.addNoteToHistory({
        id: note.id,
        title: note.title || 'Untitled',
        emoji: note.emoji || ''
      });
    }
    return note || null;
  },

  async createNote(workspaceId: string = 'default', parentId?: string): Promise<Note> {
    const wsId = workspaceId || 'default';
    const totalNotes = await db.notes.where('workspaceId').equals(wsId).count();
    if (totalNotes >= 10000) {
      throw new Error('Workspace Note Limit Reached (Max 10,000)! Please switch or create a new workspace.');
    }

    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      emoji: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      workspaceId,
      parentId,
      isTrashed: false,
      isFavorite: false,
      isLocked: false,
      tags: []
    };
    return await this.saveNote(newNote);
  },

  async saveNote(note: Note): Promise<Note> {
    const usage = await this.getStorageUsage();
    if (usage.used > usage.quota * 0.9) {
      const msg = usage.used > usage.quota * 0.98 
        ? "সঞ্চয়স্থান প্রায় পূর্ণ! দয়া করে কিছু ডাটা ডিলিট করুন অথবা ক্লাউড সংযোগ করুন।"
        : "সঞ্চয়স্থান পূর্ণ হতে চলেছে।";
      window.dispatchEvent(new CustomEvent('storage-warning', { detail: { message: msg, severity: usage.used > usage.quota * 0.98 ? 'error' : 'warning' } }));
    }

    const currentWorkspaceId = await this.getActiveWorkspaceId();
    if (!note.workspaceId) {
      note.workspaceId = currentWorkspaceId;
    }

    const wsId = note.workspaceId || currentWorkspaceId;
    const existing = await db.notes.get(note.id);
    const isNew = !existing;

    // Hacker-proof verification & database truncation sweep
    const notesCountInWorkspace = await db.notes.where('workspaceId').equals(wsId).count();
    
    if (notesCountInWorkspace > 10000) {
      // If limit exceeded, we only refetch to delete the excess (rare case)
      let notesInWorkspace = await db.notes.where('workspaceId').equals(wsId).toArray();
      // Sort oldest first and delete any excess notes exceeding 10,000
      notesInWorkspace.sort((a, b) => a.createdAt - b.createdAt);
      const deleteList = notesInWorkspace.slice(10000);
      const idsToDelete = deleteList.map(n => n.id);
      await db.notes.bulkDelete(idsToDelete);
      cachedNotes = null;
      if (idsToDelete.includes(note.id)) {
        throw new Error('Workspace Note Limit Reached (Max 10,000)! Note is discarded to maintain device stability.');
      }
    }

    if (isNew && notesCountInWorkspace >= 10000) {
      throw new Error('Workspace Note Limit Reached (Max 10,000)! Note creation blocked.');
    }

    if (isNew) {
      let finalTitle = note.title;
      let counter = 1;
      
      const checkTitleExists = async (title: string) => {
        const found = await db.notes
          .where('workspaceId')
          .equals(note.workspaceId || currentWorkspaceId)
          .filter(n => n.title.toLowerCase() === title.toLowerCase())
          .first();
        return !!found;
      };

      while (await checkTitleExists(finalTitle)) {
        finalTitle = `${note.title} (${counter})`;
        counter++;
      }
      note.title = finalTitle;
    }

    const processedContent = await this.extractMediaFromContent(note.content);
    const now = Date.now();
    const updatedNote = { 
      ...note, 
      content: processedContent, 
      updatedAt: now,
      createdAt: isNew ? now : (existing.createdAt || now)
    };

    const contentSize = new Blob([updatedNote.content]).size;
    if (contentSize > 2 * 1024 * 1024) {
      console.warn("DataManager: Large note content detected (> 2MB).");
    }

    try {
      await db.notes.put(updatedNote);
    } catch (e: any) {
      console.error('DataManager: Save failed!', e);
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        throw new Error('Storage quota exceeded. Your notes are too large (maybe too many images). Try deleting some old notes.');
      }
      throw e;
    }
    cachedNotes = null;
    
    scheduleIndexing(updatedNote);
    notifySync({ type: 'UPDATE_NOTE', id: note.id });
    window.dispatchEvent(new CustomEvent('workspace-notes-changed'));

    return updatedNote;
  },

  async checkDuplicateTitle(title: string): Promise<string> {
    let finalTitle = title;
    let counter = 1;
    
    const checkExists = async (t: string) => {
      const match = await db.notes.where('title').equalsIgnoreCase(t).first();
      return !!match;
    };

    while (await checkExists(finalTitle)) {
      finalTitle = `${title} (${counter})`;
      counter++;
    }
    return finalTitle;
  },

  async duplicateNote(id: string): Promise<Note | null> {
    const noteToDuplicate = await db.notes.get(id);
    if (noteToDuplicate) {
      const duplicatedNote: Note = {
        ...noteToDuplicate,
        id: `copy-${Date.now()}`,
        title: `${noteToDuplicate.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.notes.put(duplicatedNote);
      cachedNotes = null;
      return duplicatedNote;
    }
    return null;
  },

  async toggleFavorite(id: string): Promise<void> {
    const note = await db.notes.get(id);
    if (note) {
      await db.notes.update(id, { isFavorite: !note.isFavorite });
      cachedNotes = null;
    }
  },

  async getNotes(): Promise<Note[]> {
    return this.getAllNotes();
  },

  async deleteNote(id: string): Promise<void> {
    await db.notes.delete(id);
    cachedNotes = null;
    
    // Garbage Collection: Remove local note backups efficiently
    const prefix = `note_backup_${id}`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    notifySync({ type: 'DELETE_NOTE', id });
    window.dispatchEvent(new CustomEvent('workspace-notes-changed'));
  },

  async deleteNotePermanent(id: string): Promise<void> {
    await db.notes.delete(id);
    cachedNotes = null;
    
    // Garbage Collection
    const prefix = `note_backup_${id}`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    notifySync({ type: 'PERMANENT_DELETE_NOTE', id });
    window.dispatchEvent(new CustomEvent('workspace-notes-changed'));
  },

  async deleteNotes(ids: string[]): Promise<void> {
    await db.notes.bulkDelete(ids);
    cachedNotes = null;
    
    const allKeys = Object.keys(localStorage);
    for (const id of ids) {
      const prefix = `note_backup_${id}`;
      allKeys
        .filter(k => k.startsWith(prefix))
        .forEach(k => localStorage.removeItem(k));
    }
    
    notifySync({ type: 'DELETE_NOTES', ids });
    window.dispatchEvent(new CustomEvent('workspace-notes-changed'));
  },

  async bulkTrashNotes(ids: string[]): Promise<void> {
    const now = Date.now();
    await db.notes.where('id').anyOf(ids).modify({ isTrashed: true, updatedAt: now });
    cachedNotes = null;
    notifySync({ type: 'UPDATE_NOTES', ids });
    window.dispatchEvent(new CustomEvent('workspace-notes-changed'));
  },

  async bulkDeleteNotesPermanent(ids: string[]): Promise<void> {
    await db.notes.bulkDelete(ids);
    cachedNotes = null;

    // Collect all keys once for efficiency
    const allKeys = Object.keys(localStorage);
    for (const id of ids) {
      const prefix = `note_backup_${id}`;
      allKeys
        .filter(k => k.startsWith(prefix))
        .forEach(k => localStorage.removeItem(k));
    }

    notifySync({ type: 'PERMANENT_DELETE_NOTES', ids });
    window.dispatchEvent(new CustomEvent('workspace-notes-changed'));
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
    let note = await db.notes.get(idOrTitle);
    if (!note) {
      note = await db.notes.where('title').equalsIgnoreCase(idOrTitle).first();
    }

    if (note) {
      note.content = note.content.replace(search, replacement);
      note.updatedAt = Date.now();
      await db.notes.put(note);
      cachedNotes = null;
    }
  },

  async searchNotes(query: string): Promise<Note[]> {
    const notes = await this.getAllNotes();
    if (!query) return notes;

    const lowerQuery = query.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(lowerQuery) || 
      n.content.toLowerCase().includes(lowerQuery)
    );
  },

  // --- Chat History Operations ---

  async getChatHistory(): Promise<ChatMessage[]> {
    return await db.chat_history.toArray();
  },

  async saveChatMessage(message: ChatMessage): Promise<void> {
    await db.chat_history.add(message);
    syncChannel.postMessage({ type: 'UPDATE_CHAT' });
  },

  async clearChatHistory(): Promise<void> {
    await db.chat_history.clear();
    await db.key_value_pairs.delete('context_summary');
    syncChannel.postMessage({ type: 'CLEAR_CHAT' });
  },

  // --- AI Task Operations ---

  async getTasks(): Promise<AITask[]> {
    return await db.ai_tasks.toArray();
  },

  async saveTask(task: AITask): Promise<void> {
    task.updatedAt = Date.now();
    if (!task.createdAt) task.createdAt = Date.now();
    await db.ai_tasks.put(task);
    syncChannel.postMessage({ type: 'UPDATE_TASKS' });
  },

  async deleteTask(id: string): Promise<void> {
    await db.ai_tasks.delete(id);
    syncChannel.postMessage({ type: 'DELETE_TASK', id });
  },

  async updateTaskPartStatus(taskId: string, partTitle: string, status: 'pending' | 'completed'): Promise<void> {
    let task = await db.ai_tasks.get(taskId);
    if (!task) {
      task = await db.ai_tasks.where('title').equalsIgnoreCase(taskId).first();
    }
    
    if (task) {
      const partIndex = task.parts.findIndex(p => p.title.toLowerCase() === partTitle.toLowerCase());
      
      if (partIndex > -1) {
        task.parts[partIndex].status = status;
        const allDone = task.parts.every(p => p.status === 'completed');
        task.status = allDone ? 'completed' : 'in-progress';
        
        task.updatedAt = Date.now();
        await db.ai_tasks.put(task);
        syncChannel.postMessage({ type: 'UPDATE_TASKS' });
      }
    }
  },

  // --- Context Summary Operations ---

  async getContextSummary(): Promise<ContextSummary | null> {
    const record = await db.key_value_pairs.get('context_summary');
    return record ? record.value as ContextSummary : null;
  },

  async saveContextSummary(summary: ContextSummary): Promise<void> {
    await db.key_value_pairs.put({ key: 'context_summary', value: summary });
  },

  async deleteOldMessages(count: number): Promise<void> {
    const all = await db.chat_history.toArray();
    if (all.length > count) {
      const toDeleteCount = all.length - count;
      const idsToDelete = all.slice(0, toDeleteCount).map(c => c.id).filter((id): id is number => id !== undefined);
      if (idsToDelete.length > 0) {
        await db.chat_history.bulkDelete(idsToDelete);
      }
    }
    
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

  // --- Storage & Media (RN AI 2.5) ---
  async uploadMedia(file: File, _path: string): Promise<string> {
    const id = await this.saveMedia(file);
    return `media:${id}`;
  },

  async resolveMediaUrls(content: string): Promise<string> {
    if (!content) return '';
    
    const blobIdRegex = /blob-id:([a-zA-Z0-9_-]+)/g;
    let resolved = content;
    const matches = Array.from(content.matchAll(blobIdRegex));
    
    for (const match of matches) {
      const mediaId = match[1];
      const blob = await this.getMedia(mediaId);
      if (blob) {
        const url = URL.createObjectURL(blob);
        resolved = resolved.replace(match[0], url);
      }
    }
    
    return resolved;
  },

  async extractMediaFromContent(content: string): Promise<string> {
    if (!content) return '';
    if (!content.includes('data:image/')) return content;
    
    const base64Regex = /src="data:image\/([a-zA-Z]*);base64,([^"]*)"/g;
    let processed = content;
    const matches = Array.from(content.matchAll(base64Regex));
    
    for (const match of matches) {
      const mimeType = `image/${match[1]}`;
      const base64Data = match[2];
      
      try {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        
        const mediaId = await this.saveMedia(blob);
        processed = processed.replace(match[0], `src="blob-id:${mediaId}"`);
      } catch (e) {
        console.error('Failed to extract media:', e);
      }
    }
    
    return processed;
  },

  // --- Version Control Operations ---
  async saveVersion(version: NoteVersion): Promise<void> {
    const id = `v-${Date.now()}`;
    await db.note_versions.put({ ...version, id, createdAt: Date.now() });
    
    const noteVersions = await db.note_versions.where('noteId').equals(version.noteId).sortBy('createdAt');
    if (noteVersions.length > 10) {
      const toRemoveCount = noteVersions.length - 10;
      const idsToRemove = noteVersions.slice(0, toRemoveCount).map(v => v.id);
      await db.note_versions.bulkDelete(idsToRemove);
    }
  },

  async getVersions(noteId: string): Promise<NoteVersion[]> {
    return await db.note_versions.where('noteId').equals(noteId).reverse().sortBy('createdAt');
  },

  async deleteVersion(id: string): Promise<void> {
    await db.note_versions.delete(id);
  },

  // --- Media/Large File Store ---
  
  async saveMedia(blob: Blob): Promise<string> {
    const id = `media_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    // Reconstruct input blob as a clean, serializable, native Blob to avoid browser-specific File class storage issues
    const cleanBlob = new Blob([blob], { type: blob.type });
    await db.media.put({ id, blob: cleanBlob });
    return id;
  },

  async getMedia(id: string): Promise<Blob | null> {
    const record = await db.media.get(id);
    return record ? record.blob : null;
  },

  async deleteMedia(id: string): Promise<void> {
    await db.media.delete(id);
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
      },
      {
        id: crypto.randomUUID(),
        title: 'Deleted Note',
        content: '<p>This note was deleted for testing purposes.</p>',
        emoji: '',
        createdAt: Date.now() - 500000,
        updatedAt: Date.now(),
        workspaceId: wsId,
        isTrashed: true
      }
    ];

    await db.transaction('rw', db.notes, async () => {
      await db.notes.bulkPut(demoNotes);
    });
    cachedNotes = null;
    this.triggerSync('NOTES_UPDATE');
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
    // 1. Trashed notes
    const trashedNotes = await db.notes.filter(n => !!n.isTrashed).toArray();
    const trashedNotesCount = trashedNotes.length;

    // 2. Unused Media Files
    const allMedia = await db.media.toArray();
    const allNotes = await db.notes.toArray();
    const combinedContent = allNotes.map(n => n.content || '').join(' ');
    
    let unusedMediaCount = 0;
    let unusedMediaSize = 0;
    
    for (const item of allMedia) {
      if (!combinedContent.includes(item.id)) {
        unusedMediaCount++;
        unusedMediaSize += item.blob.size;
      }
    }

    // 3. Outdated Versions
    const outdatedVersionsCount = await db.note_versions.count();

    // 4. Legacy localforage keys check
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

    // 5. Search Index (Deprecated)
    const searchIndexSize = 0;

    return {
      trashedNotesCount,
      unusedMediaCount,
      unusedMediaSize,
      outdatedVersionsCount,
      legacyCacheSize,
      searchIndexSize
    };
  },

  async cleanTrashedNotes(): Promise<number> {
    const trashedNotes = await db.notes.filter(n => !!n.isTrashed).toArray();
    const ids = trashedNotes.map(n => n.id);
    if (ids.length > 0) {
      await db.notes.bulkDelete(ids);
      await db.note_versions.where('noteId').anyOf(ids).delete();
      cachedNotes = null;
      this.resetStorageCache();
    }
    return ids.length;
  },

  /**
   * Comprehensive Storage Optimization per User Request.
   * Purges extra data (cache, media, versions, chat) while preserving 
   * critical notes, hierarchy (sub-pages), recent activity, and recycle bin.
   */
  async optimizeStorage(): Promise<void> {
    console.log('DataManager: Full Storage Optimization initiated...');
    
    try {
      // 1. Clean Unused Media (saves significant space)
      await this.cleanUnusedMedia();
      
      // 2. Clean Outdated Note Versions (not the current ones)
      await this.cleanOutdatedVersions();
      
      // 3. Clear Chat History & AI Context (extra data)
      await this.clearChatHistory();
      
      // 4. Clean Legacy Cache (LocalForage duplicates)
      await this.cleanLegacyCache();
      
      // 5. Clear huge internal backups that multiply storage size unexpectedly
      await db.key_value_pairs.delete('internal_backups');
      
      // 6. Re-index search properly for speed (sync)
      isFullyIndexed = false;

      this.resetStorageCache();
      console.log('DataManager: Optimization successful.');
    } catch (e) {
      console.error('DataManager: Optimization failed', e);
      throw e;
    }
  },

  async cleanUnusedMedia(): Promise<{ count: number; savedSize: number }> {
    const allMedia = await db.media.toArray();
    const allNotes = await db.notes.toArray();
    const combinedContent = allNotes.map(n => n.content || '').join(' ');
    
    const idsToDelete: string[] = [];
    let savedSize = 0;
    
    for (const item of allMedia) {
      if (!combinedContent.includes(item.id)) {
        idsToDelete.push(item.id);
        savedSize += item.blob.size;
      }
    }
    
    if (idsToDelete.length > 0) {
      await db.media.bulkDelete(idsToDelete);
      this.resetStorageCache();
    }
    return { count: idsToDelete.length, savedSize };
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
    window.dispatchEvent(new CustomEvent('workspace-notes-changed'));
    return count;
  },

  async reindexAll(): Promise<void> {
    isFullyIndexed = false;
  }
};
