/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import localforage from 'localforage';
import { Index } from 'flexsearch';

console.log('DataManager: File loaded');

export interface Note {
  id: string;
  title: string;
  content: string;
  emoji: string;
  createdAt: number;
  updatedAt: number;
  fontFamily?: string;
  isFavorite?: boolean;
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
  dataCheckingModel: 'selected' | 'free';
  retrySettings: {
    enabled: boolean;
    errorCodes: string;
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
    return await localforage.getItem<string>(USER_NAME_KEY);
  },

  async saveUserName(name: string): Promise<void> {
    await localforage.setItem(USER_NAME_KEY, name);
  },

  // --- AI Settings Operations ---
  async getAISettings(): Promise<AISettings> {
    const settings = await localforage.getItem<AISettings>(AI_SETTINGS_KEY);
    const defaultSettings: AISettings = {
      selectedProvider: 'picoapps',
      selectedModels: {
        gemini: 'gemini-3-flash-preview',
        openrouter: ''
      },
      apiKeys: {},
      enabledProviders: ['picoapps'],
      dataCheckingEnabled: true,
      dataCheckingModel: 'free',
      retrySettings: {
        enabled: false,
        errorCodes: ''
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
      retrySettings: settings.retrySettings || defaultSettings.retrySettings
    };

    // One-time migration to fix multiple enabled providers
    const MIGRATION_KEY = 'ai_provider_migration_v1';
    const migrationDone = localStorage.getItem(MIGRATION_KEY);
    
    if (!migrationDone) {
      if (mergedSettings.enabledProviders.length > 1) {
        console.log('DataManager: Running one-time migration to fix multiple enabled providers');
        mergedSettings.enabledProviders = ['picoapps'];
        mergedSettings.selectedProvider = 'picoapps';
        // Save the fixed settings immediately
        await this.saveAISettings(mergedSettings);
      }
      localStorage.setItem(MIGRATION_KEY, 'true');
    }

    return mergedSettings;
  },

  async saveAISettings(settings: AISettings): Promise<void> {
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
    let notes = await localforage.getItem<Note[]>(NOTES_KEY);
    if (!notes || notes.length === 0) {
      // Create a default note for new users
      const welcomeNote: Note = {
        id: 'welcome-note',
        title: '👋 Getting Started on Mobile',
        content: `
          <h1>আমাদের নোট অ্যাপের ফিচার গাইড</h1>
          <p>এই অ্যাপটি আপনার নোট গুছিয়ে রাখতে সাহায্য করবে। নিচে প্রতিটি বাটনের কাজ বাংলায় দেওয়া হলো:</p>
          
          <p><b>বোল্ড (Bold)</b> = লেখা মোটা করে।</p>
          <p><i>ইটালিক (Italic)</i> = লেখা বাঁকা করে।</p>
          <p><u>আন্ডারলাইন (Underline)</u> = লেখার নিচে দাগ দেয়।</p>
          <p><b>হেডিং (Heading)</b> = লেখার আকার বড় করে (H1-H6)।</p>
          <p><b>বুলেট লিস্ট (Bullet List)</b> = ডট দিয়ে তালিকা তৈরি করে।</p>
          <p><b>নাম্বার লিস্ট (Numbered List)</b> = সংখ্যা দিয়ে তালিকা তৈরি করে।</p>
          <p><b>টাস্ক লিস্ট (Task List)</b> = চেক বক্স সহ তালিকা তৈরি করে।</p>
          <p><b>ব্লককোট (Blockquote)</b> = উদ্ধৃতি বা বিশেষ লেখা হাইলাইট করে।</p>
          <p><b>কোড ব্লক (Code Block)</b> = প্রোগ্রামিং কোড লেখার জন্য।</p>
          <p><b>হাইলাইটার (Highlight)</b> = লেখার ব্যাকগ্রাউন্ড কালার পরিবর্তন করে।</p>
          <p><b>অ্যালাইনমেন্ট (Alignment)</b> = লেখা বাম, মাঝ বা ডানে সরায়।</p>
          <p><b>ফন্ট (Font)</b> = লেখার স্টাইল পরিবর্তন করে।</p>
          <p><b>কালার (Color)</b> = লেখার রং পরিবর্তন করে।</p>
          <p><b>স্পিচ-টু-টেক্সট (Speech)</b> = কথা বলে লেখা টাইপ করে।</p>
          <p><b>এক্সপোর্ট (Export)</b> = আপনার নোটটি .redwan ফাইলে সেভ করে।</p>
          
          <p>নতুন নোট তৈরি করতে হোম পেজের প্লাস (+) বাটনে ক্লিক করুন। কোনো নোট ডিলিট করতে সেটির উপর লং-প্রেস করুন।</p>
        `,
        emoji: '👋',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
      };
      notes = [welcomeNote];
      await localforage.setItem(NOTES_KEY, notes);
    }
    return notes;
  },

  async getNoteById(id: string): Promise<Note | null> {
    const notes = await this.getAllNotes();
    return notes.find(n => n.id === id) || null;
  },

  async saveNote(note: Note): Promise<void> {
    const notes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    
    // Check for duplicate title (only for new notes)
    const isNew = !notes.some(n => n.id === note.id);
    if (isNew) {
      let finalTitle = note.title;
      let counter = 1;
      while (notes.some(n => n.title.toLowerCase() === finalTitle.toLowerCase())) {
        finalTitle = `${note.title} (${counter})`;
        counter++;
      }
      note.title = finalTitle;
    }

    const index = notes.findIndex(n => n.id === note.id);
    
    if (index > -1) {
      notes[index] = { ...note, updatedAt: Date.now() };
    } else {
      notes.push({ ...note, createdAt: Date.now(), updatedAt: Date.now() });
    }
    
    await localforage.setItem(NOTES_KEY, notes);
    
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
    const notes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const filteredNotes = notes.filter(n => n.id !== id);
    await localforage.setItem(NOTES_KEY, filteredNotes);
    
    // Garbage Collection: Remove localStorage backup for this note
    localStorage.removeItem(`note_backup_${id}`);
    
    // Remove from search index
    if (searchIndex) {
      searchIndex.remove(id);
    }
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'DELETE_NOTE', id });
  },

  async deleteNotes(ids: string[]): Promise<void> {
    const notes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const filteredNotes = notes.filter(n => !ids.includes(n.id));
    await localforage.setItem(NOTES_KEY, filteredNotes);
    
    // Garbage Collection: Remove localStorage backups for these notes
    ids.forEach(id => {
      localStorage.removeItem(`note_backup_${id}`);
      if (searchIndex) {
        searchIndex.remove(id);
      }
    });
    
    // Notify other tabs
    syncChannel.postMessage({ type: 'DELETE_NOTES', ids });
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

  // --- SQLite Publish Operations ---
  async publishToDB(note: Note): Promise<string> {
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note)
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = `Server Error (${response.status})`;
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch (e) {
          if (text.includes('<!doctype html>') || text.includes('<html>')) {
            errorMsg = 'API route not found (Server returned HTML).';
          } else if (text) {
            errorMsg = text.slice(0, 100);
          }
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.success) {
        return data.id;
      }
      throw new Error(data.error || 'Failed to publish');
    } catch (e) {
      console.error('Publish error:', e);
      throw e;
    }
  },

  async importById(id: string): Promise<Note> {
    try {
      const response = await fetch(`/api/import/${id}`);
      
      if (!response.ok) {
        const text = await response.text();
        let errorMsg = `Import Failed (${response.status})`;
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch (e) {
          if (text.includes('<!doctype html>') || text.includes('<html>')) {
            errorMsg = 'API route not found (Server returned HTML).';
          } else if (text) {
            errorMsg = text.slice(0, 100);
          }
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.success) {
        const note = {
          ...data.note,
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          createdAt: Date.now()
        };
        await this.saveNote(note);
        return note;
      }
      throw new Error(data.error || 'Note not found');
    } catch (e) {
      console.error('Import error:', e);
      throw e;
    }
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

  // Add listener for components to use
  onSync(callback: (event: any) => void) {
    syncChannel.onmessage = (event) => callback(event.data);
  },
  
  offSync() {
    syncChannel.onmessage = null;
  }
};
