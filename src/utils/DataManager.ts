/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import localforage from 'localforage';
import { Index } from 'flexsearch';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LogManager } from './LogManager';

console.log('DataManager: File loaded');

export interface Note {
  id: string;
  title: string;
  content: string;
  emoji: string;
  createdAt: number;
  updatedAt: number;
  workspaceId?: string;
  fontFamily?: string;
  isFavorite?: boolean;
  publishedCode?: string;
  lastPublishedContent?: string;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
}

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  content: string;
  emoji: string;
  version: string; // e.g., "1.0", "1.1"
  createdAt: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  debugInfo?: {
    fullPrompt: string;
    systemPrompt: string;
    mentionedPages?: { id: string; title: string; content: string }[];
  };
}

export interface AITask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  parts: {
    id: string;
    title: string;
    status: 'pending' | 'completed';
    result?: string;
  }[];
  createdAt: number;
  updatedAt: number;
}

export interface ContextSummary {
  text: string;
  timestamp: number;
}

export interface AISettings {
  controlMode: 'auto' | 'manual';
  selectedProvider: 'picoapps' | 'gemini' | 'openrouter';
  selectedModels: {
    gemini: string;
    openrouter: string;
  };
  apiKeys: {
    gemini?: string;
    openrouter?: string;
  };
  enabledProviders: string[];
  dataCheckingEnabled: boolean;
  dataCheckingModel: 'selected' | 'free' | 'custom';
  dataCheckingCustomProvider?: 'gemini' | 'openrouter';
  retrySettings: {
    enabled: boolean;
    errorCodes: string;
  };
  selectedAppID?: string;
  customAppIDs?: { id: string; name: string }[];
  models: {
    gemini: string;
    openrouter: string;
    [key: string]: string;
  };
}

// Configure localforage
localforage.config({
  name: 'NotionClone',
  storeName: 'notes_store'
});

// BroadcastChannel for multi-tab sync
const syncChannel = new BroadcastChannel('notion_sync');
const clientId = crypto.randomUUID();

// In-memory cache for speed
let cachedNotes: Note[] | null = null;
let cachedSettings: AISettings | null = null;

// Initialize FlexSearch index
let searchIndex: Index;
try {
  searchIndex = new Index({
    preset: 'score',
    tokenize: 'forward',
    cache: true
  });
  console.log('FlexSearch index initialized successfully');
} catch (e) {
  console.error('Failed to initialize FlexSearch index:', e);
}

const NOTES_KEY = 'notes';
const CHAT_HISTORY_KEY = 'chat_history';
const TASKS_KEY = 'ai_tasks';
const CONTEXT_SUMMARY_KEY = 'context_summary';
const USER_NAME_KEY = 'user_name';
const AI_SETTINGS_KEY = 'ai_settings';
const WORKSPACES_KEY = 'workspaces';
const CURRENT_WORKSPACE_KEY = 'current_workspace_id';
const VERSIONS_KEY = 'note_versions';
const CUSTOM_EXTENSION = '.redwan';

// Helper for background indexing to prevent battery drain and UI lag
const scheduleIndexing = (note: Note) => {
  const indexTask = () => {
    if (searchIndex) {
      searchIndex.add(note.id, `${note.title} ${note.content.replace(/<[^>]*>/g, '')}`);
      console.log(`Note ${note.id} indexed in background`);
    }
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(indexTask, { timeout: 2000 });
  } else {
    setTimeout(indexTask, 100);
  }
};

// Simple encryption/decryption for API keys
const ENCRYPTION_KEY = 'redwan-ai-secret-key';
const encrypt = (text: string) => {
  if (!text) return '';
  const result = [];
  for (let i = 0; i < text.length; i++) {
    result.push(String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)));
  }
  return btoa(result.join(''));
};

const decrypt = (encoded: string) => {
  if (!encoded) return '';
  try {
    const text = atob(encoded);
    const result = [];
    for (let i = 0; i < text.length; i++) {
      result.push(String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)));
    }
    return result.join('');
  } catch (e) {
    return '';
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
  // --- User Operations ---
  async getUserName(): Promise<string | null> {
    const name = await localforage.getItem<string>(USER_NAME_KEY);
    if (!name) return null;
    if (name.length > 8) {
      return name.substring(0, 8) + '...';
    }
    return name;
  },

  async getFullUserName(): Promise<string | null> {
    return await localforage.getItem<string>(USER_NAME_KEY);
  },

  async saveUserName(name: string): Promise<void> {
    await localforage.setItem(USER_NAME_KEY, name);
  },

  // --- Workspace Operations ---
  async getWorkspaces(): Promise<Workspace[]> {
    let workspaces = await localforage.getItem<Workspace[]>(WORKSPACES_KEY);
    
    if (!workspaces || workspaces.length === 0) {
      const defaultWorkspace: Workspace = {
        id: 'default-workspace',
        name: 'আমার কাজের ক্ষেত্র',
        createdAt: Date.now()
      };
      workspaces = [defaultWorkspace];
      await localforage.setItem(WORKSPACES_KEY, workspaces);
      await localforage.setItem(CURRENT_WORKSPACE_KEY, defaultWorkspace.id);
    }

    // Migration: Ensure all workspaces have a name
    let changed = false;
    workspaces = workspaces.map((ws, index) => {
      if (!ws.name || ws.name.trim() === '') {
        changed = true;
        return { ...ws, name: `Workspace ${index + 1}` };
      }
      return ws;
    });

    if (changed) {
      await localforage.setItem(WORKSPACES_KEY, workspaces);
    }

    return workspaces;
  },

  async saveWorkspace(workspace: Workspace): Promise<void> {
    const workspaces = await this.getWorkspaces();
    const index = workspaces.findIndex(w => w.id === workspace.id);
    if (index > -1) {
      workspaces[index] = workspace;
    } else {
      workspaces.push(workspace);
    }
    await localforage.setItem(WORKSPACES_KEY, workspaces);
  },

  async deleteWorkspace(id: string): Promise<void> {
    const workspaces = await this.getWorkspaces();
    const filtered = workspaces.filter(w => w.id !== id);
    await localforage.setItem(WORKSPACES_KEY, filtered);

    // Delete all notes in this workspace
    const allNotes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const remainingNotes = allNotes.filter(n => n.workspaceId !== id);
    await localforage.setItem(NOTES_KEY, remainingNotes);
    cachedNotes = null;

    // If current workspace was deleted, switch to the first available one
    const currentId = await this.getCurrentWorkspaceId();
    if (currentId === id) {
      if (filtered.length > 0) {
        await this.setCurrentWorkspaceId(filtered[0].id);
      } else {
        // This should trigger getWorkspaces to create a default one
        await localforage.removeItem(CURRENT_WORKSPACE_KEY);
      }
    }
  },

  async getCurrentWorkspaceId(): Promise<string> {
    const id = await localforage.getItem<string>(CURRENT_WORKSPACE_KEY);
    if (!id) {
      const workspaces = await this.getWorkspaces();
      return workspaces[0].id;
    }
    return id;
  },

  async setCurrentWorkspaceId(id: string): Promise<void> {
    await localforage.setItem(CURRENT_WORKSPACE_KEY, id);
    cachedNotes = null; // Invalidate cache
    syncChannel.postMessage({ type: 'SWITCH_WORKSPACE', id });
  },

  // --- AI Settings Operations ---
  async getAISettings(): Promise<AISettings> {
    if (cachedSettings) return cachedSettings;

    const settings = await localforage.getItem<AISettings>(AI_SETTINGS_KEY);
    const defaultSettings: AISettings = {
      controlMode: 'auto',
      selectedProvider: 'picoapps',
      selectedModels: {
        gemini: 'gemini-1.5-flash',
        openrouter: ''
      },
      apiKeys: {},
      enabledProviders: ['picoapps'],
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
        openrouter: ''
      }
    };

    if (!settings) {
      await localforage.setItem(AI_SETTINGS_KEY, defaultSettings);
      return defaultSettings;
    }

    // Decrypt API keys
    const decryptedKeys: any = {};
    if (settings.apiKeys) {
      Object.keys(settings.apiKeys).forEach(key => {
        const val = (settings.apiKeys as any)[key];
        decryptedKeys[key] = decrypt(val);
      });
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
      enabledProviders: settings.enabledProviders || defaultSettings.enabledProviders,
      dataCheckingEnabled: settings.dataCheckingEnabled !== undefined ? settings.dataCheckingEnabled : defaultSettings.dataCheckingEnabled,
      dataCheckingModel: settings.dataCheckingModel || defaultSettings.dataCheckingModel,
      dataCheckingCustomProvider: settings.dataCheckingCustomProvider || 'gemini',
      retrySettings: settings.retrySettings || defaultSettings.retrySettings,
      selectedAppID: settings.selectedAppID || defaultSettings.selectedAppID,
      customAppIDs: settings.customAppIDs || defaultSettings.customAppIDs,
      models: settings.models || defaultSettings.models
    };

    cachedSettings = mergedSettings;
    return mergedSettings;
  },

  async saveAISettings(settings: AISettings): Promise<void> {
    cachedSettings = settings;
    // Encrypt API keys before saving
    const encryptedKeys: any = {};
    if (settings.apiKeys) {
      Object.keys(settings.apiKeys).forEach(key => {
        const val = (settings.apiKeys as any)[key];
        encryptedKeys[key] = encrypt(val);
      });
    }

    const settingsToSave = {
      ...settings,
      apiKeys: encryptedKeys
    };
    await localforage.setItem(AI_SETTINGS_KEY, settingsToSave);
  },

  // --- Notes Operations ---
  
  async getAllNotes(): Promise<Note[]> {
    if (cachedNotes) return cachedNotes;

    const notes = await localforage.getItem<Note[]>(NOTES_KEY);
    const currentWorkspaceId = await this.getCurrentWorkspaceId();

    if (!notes || notes.length === 0) {
      const defaults = await this.initializeDefaultNotes();
      cachedNotes = defaults.filter(n => n.workspaceId === currentWorkspaceId);
      return cachedNotes;
    }

    const filteredNotes = notes.filter(n => n.workspaceId === currentWorkspaceId);
    cachedNotes = filteredNotes;
    return filteredNotes;
  },

  async exportAllData(): Promise<{ notes: Note[], workspaces: Workspace[] }> {
    const notes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const workspaces = await this.getWorkspaces();
    return { notes, workspaces };
  },

  async importAllData(notes: Note[], workspaces: Workspace[]): Promise<void> {
    await localforage.setItem(NOTES_KEY, notes);
    await localforage.setItem(WORKSPACES_KEY, workspaces);
    
    // Reset cache and index
    cachedNotes = null;
    if (searchIndex) {
      try {
        searchIndex = new Index({
          preset: 'score',
          tokenize: 'forward',
          cache: true
        });
        for (const note of notes) {
          scheduleIndexing(note);
        }
      } catch (e) {
        console.error('Failed to re-index after import:', e);
      }
    }
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'SYNC_COMPLETE' });
    window.location.reload(); // Refresh to ensure all states are clean
  },

  async getNotesPaginated(page: number, pageSize: number): Promise<{ notes: Note[], hasMore: boolean }> {
    const allNotes = await this.getAllNotes();
    const start = page * pageSize;
    const end = start + pageSize;
    const paginatedNotes = allNotes.slice(start, end);
    return {
      notes: paginatedNotes,
      hasMore: end < allNotes.length
    };
  },

  async initializeDefaultNotes(): Promise<Note[]> {
    const currentWorkspaceId = await this.getCurrentWorkspaceId();
    
    const todoTemplate: Note = {
      id: 'todo-template',
      title: '🎯 Weekly Focus & Todo',
      workspaceId: currentWorkspaceId,
      content: `
        <h2>🎯 Weekly High-Level Goals</h2>
        <ul><li>[ ] Main Priority 1</li><li>[ ] Main Priority 2</li></ul>
        
        <hr />
        <h3>📅 Daily Breakdown</h3>
        <p><b>Monday:</b></p>
        <ul><li>[ ] task 1</li></ul>
        <p><b>Tuesday:</b></p>
        <ul><li>[ ] task 1</li></ul>
        
        <hr />
        <p><i>Tip: Use checkmarks to track progress. Keep it simple and focused.</i></p>
      `,
      emoji: '🎯',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const meetingTemplate: Note = {
      id: 'meeting-template',
      title: '🤝 Meeting Notes: Project Sync',
      workspaceId: currentWorkspaceId,
      content: `
        <h2>🤝 Meeting: [Project Name]</h2>
        <p><b>Date:</b> ${new Date().toLocaleDateString()} | <b>Host:</b> Me</p>
        
        <hr />
        <h3>📝 Key Agenda</h3>
        <ul><li>Points to discuss...</li></ul>
        
        <h3>💡 Decisions Made</h3>
        <ul><li>Decision A...</li></ul>
        
        <h3>🔥 Action Items</h3>
        <ul><li>[ ] @Person: Do this by Friday</li></ul>
      `,
      emoji: '🤝',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const dailyTracker: Note = {
      id: 'daily-tracker',
      title: '☀️ Daily Reflection & Health',
      workspaceId: currentWorkspaceId,
      content: `
        <h2>☀️ Morning Intentions</h2>
        <p>How do I want to feel today? [Input]</p>
        
        <hr />
        <h3>🥤 Health Tracker</h3>
        <p>Water: 💧 💧 💧 💧 💧 (5/8 glasses)</p>
        <p>Sleep: 8 Hours</p>
        
        <hr />
        <h3>🌙 Evening Reflection</h3>
        <p><b>Win of the day:</b> [Input]</p>
        <p><b>Lesson learned:</b> [Input]</p>
      `,
      emoji: '☀️',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const notes = [todoTemplate, meetingTemplate, dailyTracker];
    await localforage.setItem(NOTES_KEY, notes);
    return notes;
  },

  async clearMemory(): Promise<void> {
    // Clear temporary caches or large objects from memory if any
    // For now, we just ensure we're not holding onto large arrays globally
    console.log('Memory cleared');
  },

  async getNoteById(id: string): Promise<Note | null> {
    const notes = await this.getAllNotes();
    return notes.find(n => n.id === id) || null;
  },

  async saveNote(note: Note): Promise<void> {
    const allNotes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const currentWorkspaceId = await this.getCurrentWorkspaceId();
    
    // Ensure workspaceId is set
    if (!note.workspaceId) {
      note.workspaceId = currentWorkspaceId;
    }

    // Check for duplicate title (only for new notes in same workspace)
    const isNew = !allNotes.some(n => n.id === note.id);
    if (isNew) {
      let finalTitle = note.title;
      let counter = 1;
      while (allNotes.some(n => n.workspaceId === currentWorkspaceId && n.title.toLowerCase() === finalTitle.toLowerCase())) {
        finalTitle = `${note.title} (${counter})`;
        counter++;
      }
      note.title = finalTitle;
    }

    const index = allNotes.findIndex(n => n.id === note.id);
    
    if (index > -1) {
      allNotes[index] = { ...note, updatedAt: Date.now() };
    } else {
      allNotes.push({ ...note, createdAt: Date.now(), updatedAt: Date.now() });
    }
    
    await localforage.setItem(NOTES_KEY, allNotes);
    cachedNotes = allNotes.filter(n => n.workspaceId === currentWorkspaceId);
    
    // Immediate indexing on save to prevent staleness
    scheduleIndexing(note);
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'UPDATE_NOTE', id: note.id, senderId: clientId });
  },

  async checkDuplicateTitle(title: string): Promise<string> {
    const notes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    let finalTitle = title;
    let counter = 1;
    while (notes.some(n => n.title.toLowerCase() === finalTitle.toLowerCase())) {
      finalTitle = `${title} (${counter})`;
      counter++;
    }
    return finalTitle;
  },

  async duplicateNote(id: string): Promise<Note | null> {
    const notes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const noteToDuplicate = notes.find(n => n.id === id);
    if (noteToDuplicate) {
      const duplicatedNote: Note = {
        ...noteToDuplicate,
        id: `copy-${Date.now()}`,
        title: `${noteToDuplicate.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      notes.push(duplicatedNote);
      await localforage.setItem(NOTES_KEY, notes);
      return duplicatedNote;
    }
    return null;
  },

  async toggleFavorite(id: string): Promise<void> {
    const notes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const index = notes.findIndex(n => n.id === id);
    if (index > -1) {
      notes[index].isFavorite = !notes[index].isFavorite;
      await localforage.setItem(NOTES_KEY, notes);
    }
  },

  async getNotes(): Promise<Note[]> {
    return this.getAllNotes();
  },

  async deleteNote(id: string): Promise<void> {
    const allNotes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const filteredNotes = allNotes.filter(n => n.id !== id);
    await localforage.setItem(NOTES_KEY, filteredNotes);
    
    const currentWorkspaceId = await this.getCurrentWorkspaceId();
    cachedNotes = filteredNotes.filter(n => n.workspaceId === currentWorkspaceId);
    
    // Garbage Collection: Remove backup for this note
    await localforage.removeItem(`note_backup_${id}`);
    
    // Remove from search index
    if (searchIndex) {
      searchIndex.remove(id);
    }
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'DELETE_NOTE', id });
  },

  async deleteNotes(ids: string[]): Promise<void> {
    const allNotes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const filteredNotes = allNotes.filter(n => !ids.includes(n.id));
    await localforage.setItem(NOTES_KEY, filteredNotes);
    
    const currentWorkspaceId = await this.getCurrentWorkspaceId();
    cachedNotes = filteredNotes.filter(n => n.workspaceId === currentWorkspaceId);
    
    // Garbage Collection: Remove backups for these notes
    for (const id of ids) {
      await localforage.removeItem(`note_backup_${id}`);
      if (searchIndex) {
        searchIndex.remove(id);
      }
    }
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'DELETE_NOTES', ids });
  },

  // --- Versioning Operations ---
  async saveVersion(note: Note, version: string): Promise<void> {
    const versions = await localforage.getItem<NoteVersion[]>(VERSIONS_KEY) || [];
    const newVersion: NoteVersion = {
      id: crypto.randomUUID(),
      noteId: note.id,
      title: note.title,
      content: note.content,
      emoji: note.emoji,
      version,
      createdAt: Date.now()
    };
    versions.push(newVersion);
    await localforage.setItem(VERSIONS_KEY, versions);
  },

  async getVersions(noteId: string): Promise<NoteVersion[]> {
    const versions = await localforage.getItem<NoteVersion[]>(VERSIONS_KEY) || [];
    return versions.filter(v => v.noteId === noteId).sort((a, b) => b.createdAt - a.createdAt);
  },

  async restoreVersion(versionId: string): Promise<Note | null> {
    const versions = await localforage.getItem<NoteVersion[]>(VERSIONS_KEY) || [];
    const version = versions.find(v => v.id === versionId);
    if (!version) return null;

    const allNotes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const noteIndex = allNotes.findIndex(n => n.id === version.noteId);
    
    if (noteIndex > -1) {
      allNotes[noteIndex] = {
        ...allNotes[noteIndex],
        title: version.title,
        content: version.content,
        emoji: version.emoji,
        updatedAt: Date.now()
      };
      await localforage.setItem(NOTES_KEY, allNotes);
      cachedNotes = null;
      return allNotes[noteIndex];
    }
    return null;
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
    const plainText = note.content.replace(/<[^>]*>/g, ''); // Strip HTML
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

  // --- Supabase Publish Operations ---
  async publishToSupabase(note: Note): Promise<string> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment settings.');
    }
    try {
      const shortCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { data, error } = await supabase
        .from('published_notes')
        .insert([
          {
            short_code: shortCode,
            title: note.title,
            content: note.content,
            emoji: note.emoji,
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Save the published code and content to the local note for sync tracking
      const updatedNote = { 
        ...note, 
        publishedCode: data.short_code,
        lastPublishedContent: note.content 
      };
      await this.saveNote(updatedNote);
      
      return data.short_code;
    } catch (e) {
      console.error('Supabase Publish error:', e);
      throw e;
    }
  },

  async importFromSupabase(shortCode: string): Promise<Note> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment settings.');
    }
    try {
      const { data, error } = await supabase
        .from('published_notes')
        .select('*')
        .eq('short_code', shortCode.toUpperCase())
        .single();

      if (error) throw new Error('Note not found or network error');

      const note: Note = {
        id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: data.title,
        content: data.content,
        emoji: data.emoji || '📄',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        publishedCode: data.short_code,
        lastPublishedContent: data.content
      };

      await this.saveNote(note);
      return note;
    } catch (e) {
      console.error('Supabase Import error:', e);
      throw e;
    }
  },

  async updatePublishedNote(note: Note): Promise<void> {
    if (!isSupabaseConfigured || !note.publishedCode) return;
    
    try {
      const { error } = await supabase
        .from('published_notes')
        .update({
          title: note.title,
          content: note.content,
          emoji: note.emoji,
          updated_at: new Date().toISOString()
        })
        .eq('short_code', note.publishedCode);

      if (error) throw error;

      // Update local tracking
      const updatedNote = { ...note, lastPublishedContent: note.content };
      await this.saveNote(updatedNote);
    } catch (e) {
      console.error('Update Published Note error:', e);
      throw e;
    }
  },

  getSyncStatus(note: Note): 'synced' | 'changed' | 'none' {
    if (!note.publishedCode) return 'none';
    if (!note.lastPublishedContent) return 'changed';
    
    // Simple content comparison
    return note.content === note.lastPublishedContent ? 'synced' : 'changed';
  },

  async replaceContent(idOrTitle: string, search: string, replacement: string): Promise<void> {
    const notes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const index = notes.findIndex(n => 
      n.id === idOrTitle || 
      n.title.toLowerCase() === idOrTitle.toLowerCase()
    );

    if (index > -1) {
      const note = notes[index];
      // Simple string replacement for now, could be improved with regex if needed
      note.content = note.content.replace(search, replacement);
      note.updatedAt = Date.now();
      await localforage.setItem(NOTES_KEY, notes);
    }
  },

  async searchNotes(query: string): Promise<Note[]> {
    const notes = await this.getAllNotes();
    if (!query) return notes;

    // Build index if empty (simple way for now, could be optimized)
    if (searchIndex) {
      // Use requestIdleCallback for initial heavy indexing if needed
      const indexAll = () => {
        notes.forEach(n => {
          searchIndex.add(n.id, `${n.title} ${n.content.replace(/<[^>]*>/g, '')}`);
        });
      };
      
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(indexAll);
      } else {
        indexAll();
      }

      const results = searchIndex.search(query);
      const resultIds = new Set(results);
      
      return notes.filter(n => resultIds.has(n.id));
    } else {
      // Fallback to simple search if index failed
      const lowerQuery = query.toLowerCase();
      return notes.filter(n => 
        n.title.toLowerCase().includes(lowerQuery) || 
        n.content.toLowerCase().includes(lowerQuery)
      );
    }
  },

  // --- Chat History Operations ---

  async getChatHistory(): Promise<ChatMessage[]> {
    const history = await localforage.getItem<ChatMessage[]>(CHAT_HISTORY_KEY);
    return history || [];
  },

  async saveChatMessage(message: ChatMessage): Promise<void> {
    const history = await this.getChatHistory();
    history.push(message);
    await localforage.setItem(CHAT_HISTORY_KEY, history);
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'UPDATE_CHAT' });
  },

  async clearChatHistory(): Promise<void> {
    await localforage.removeItem(CHAT_HISTORY_KEY);
    await localforage.removeItem(CONTEXT_SUMMARY_KEY);
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'CLEAR_CHAT' });
  },

  // --- AI Task Operations ---

  async getTasks(): Promise<AITask[]> {
    const tasks = await localforage.getItem<AITask[]>(TASKS_KEY);
    return tasks || [];
  },

  async saveTask(task: AITask): Promise<void> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index > -1) {
      tasks[index] = { ...task, updatedAt: Date.now() };
    } else {
      tasks.push({ ...task, createdAt: Date.now(), updatedAt: Date.now() });
    }
    await localforage.setItem(TASKS_KEY, tasks);
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'UPDATE_TASKS' });
  },

  async deleteTask(id: string): Promise<void> {
    const tasks = await this.getTasks();
    const filtered = tasks.filter(t => t.id !== id);
    await localforage.setItem(TASKS_KEY, filtered);
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'DELETE_TASK', id });
  },

  async updateTaskPartStatus(taskId: string, partTitle: string, status: 'pending' | 'completed'): Promise<void> {
    const tasks = await this.getTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId || t.title.toLowerCase() === taskId.toLowerCase());
    
    if (taskIndex > -1) {
      const task = tasks[taskIndex];
      const partIndex = task.parts.findIndex(p => p.title.toLowerCase() === partTitle.toLowerCase());
      
      if (partIndex > -1) {
        task.parts[partIndex].status = status;
        
        // Auto-complete task if all parts are done
        const allDone = task.parts.every(p => p.status === 'completed');
        if (allDone) {
          task.status = 'completed';
        } else {
          task.status = 'in-progress';
        }
        
        task.updatedAt = Date.now();
        await localforage.setItem(TASKS_KEY, tasks);
        syncChannel.postMessage({ type: 'UPDATE_TASKS' });
      }
    }
  },

  // --- Context Summary Operations ---

  async getContextSummary(): Promise<ContextSummary | null> {
    return await localforage.getItem<ContextSummary>(CONTEXT_SUMMARY_KEY);
  },

  async saveContextSummary(summary: ContextSummary): Promise<void> {
    await localforage.setItem(CONTEXT_SUMMARY_KEY, summary);
  },

  async deleteOldMessages(count: number): Promise<void> {
    const history = await this.getChatHistory();
    if (history.length > count) {
      const pruned = history.slice(count);
      await localforage.setItem(CHAT_HISTORY_KEY, pruned);
    } else {
      await this.clearChatHistory();
    }
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'UPDATE_CHAT' });
  },

  // --- Audit Log Operations (RN AI 2.3) ---
  async addLog(log: any) {
    await LogManager.addLog(log);
  },

  async exportAuditLogs() {
    await LogManager.exportLogs();
  },

  // Add listener for components to use
  onSync(callback: (event: any) => void) {
    syncChannel.onmessage = (event) => {
      // Invalidate cache on remote updates
      if (event.data.type.includes('NOTE')) cachedNotes = null;
      if (event.data.type.includes('SETTINGS')) cachedSettings = null;
      callback(event.data);
    };
  },
  
  offSync() {
    syncChannel.onmessage = null;
  },
  
  // --- Storage & Media (RN AI 2.5) ---
  async uploadMedia(file: File, path: string): Promise<string> {
    const settings = await this.getAISettings();
    
    // Check if Supabase is actually configured with valid environment variables
    // In this environment, we check if supabase instance exists
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, using local DataURL');
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    try {
      const { error } = await supabase.storage
        .from('notes-assets')
        .upload(filePath, file);

      if (error) {
        console.error('Upload error details:', error);
        // Fallback to local if bucket is missing or access denied
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('notes-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (e) {
      console.error('Upload catch:', e);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }
  }
};
