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
  fontFamily?: string;
  isFavorite?: boolean;
  publishedCode?: string;
  lastPublishedContent?: string;
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
      retrySettings: settings.retrySettings || defaultSettings.retrySettings
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
    if (!notes || notes.length === 0) {
      const defaults = await this.initializeDefaultNotes();
      cachedNotes = defaults;
      return defaults;
    }
    cachedNotes = notes;
    return notes;
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

    const suiterNote: Note = {
      id: 'suiter-integration-note',
      title: '🛠️ Suiter Integration Guide',
      content: `
        <h1>Suiter Integration Instructions</h1>
        <p>এই নোটটি Mistral AI এবং Suiter Integration-এর জন্য তৈরি করা হয়েছে।</p>
        
        <h3>১. Suiter App ID Call:</h3>
        <p>Suiter Integration এখন App ID-তে কল সাপোর্ট করে। এটি ব্যবহার করতে আপনার App ID এবং প্রয়োজনীয় প্যারামিটারগুলো কনফিগার করুন।</p>
        
        <h3>২. Mistral AI JSON Output:</h3>
        <p>Mistral AI এখন থেকে JSON ফরম্যাটে আউটপুট প্রদান করবে। নিচের প্রম্পটটি কপি করে Mistral সার্ভারে পেস্ট করুন:</p>
        
        <pre style="background: #1a1a1a; color: #4ade80; padding: 1rem; border-radius: 0.5rem; border: 1px solid #333;">
{
"instruction": "Generate response in valid JSON format based on the provided schema.",
"schema": {
  "type": "object",
  "properties": {
    "answer": { "type": "string" },
    "status": { "type": "string" }
  }
}
}
        </pre>
        
        <p>উপরে দেওয়া কপি বাটনটি ব্যবহার করে এই নোটের কন্টেন্ট দ্রুত কপি করতে পারেন।</p>
      `,
      emoji: '🛠️',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
    };

    const notes = [welcomeNote, suiterNote];
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
    const notes = await this.getAllNotes();
    
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
    cachedNotes = [...notes];
    
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
    const notes = await this.getAllNotes();
    const filteredNotes = notes.filter(n => n.id !== id);
    await localforage.setItem(NOTES_KEY, filteredNotes);
    cachedNotes = filteredNotes;
    
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
    const notes = await this.getAllNotes();
    const filteredNotes = notes.filter(n => !ids.includes(n.id));
    await localforage.setItem(NOTES_KEY, filteredNotes);
    cachedNotes = filteredNotes;
    
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
  }
};
