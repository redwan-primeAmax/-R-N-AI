/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import localforage from 'localforage';

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
  selectedProvider: 'picoapps' | 'chatgpt' | 'claude' | 'gemini' | 'openrouter';
  selectedModels: {
    chatgpt: string;
    claude: string;
    gemini: string;
    openrouter: string;
  };
  apiKeys: {
    claude?: string;
    chatgpt?: string;
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
  autoCreatePage: boolean;
}

// Configure localforage
localforage.config({
  name: 'NotionClone',
  storeName: 'notes_store'
});

const NOTES_KEY = 'notes';
const CHAT_HISTORY_KEY = 'chat_history';
const TASKS_KEY = 'ai_tasks';
const CONTEXT_SUMMARY_KEY = 'context_summary';
const USER_NAME_KEY = 'user_name';
const AI_SETTINGS_KEY = 'ai_settings';
const CUSTOM_EXTENSION = '.redwan';

export const DataManager = {
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
        chatgpt: 'gpt-4o',
        claude: 'claude-3-5-sonnet-20241022',
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
      },
      autoCreatePage: false
    };

    if (!settings) {
      await localforage.setItem(AI_SETTINGS_KEY, defaultSettings);
      return defaultSettings;
    }

    // Merge stored settings with defaults to handle migrations from older versions
    return {
      ...defaultSettings,
      ...settings,
      selectedModels: {
        ...defaultSettings.selectedModels,
        ...(settings.selectedModels || {})
      },
      apiKeys: {
        ...defaultSettings.apiKeys,
        ...(settings.apiKeys || {})
      },
      enabledProviders: settings.enabledProviders || defaultSettings.enabledProviders,
      dataCheckingEnabled: settings.dataCheckingEnabled !== undefined ? settings.dataCheckingEnabled : defaultSettings.dataCheckingEnabled,
      dataCheckingModel: settings.dataCheckingModel || defaultSettings.dataCheckingModel,
      retrySettings: settings.retrySettings || defaultSettings.retrySettings,
      autoCreatePage: settings.autoCreatePage !== undefined ? settings.autoCreatePage : defaultSettings.autoCreatePage
    };
  },

  async saveAISettings(settings: AISettings): Promise<void> {
    await localforage.setItem(AI_SETTINGS_KEY, settings);
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
  },

  async deleteNotes(ids: string[]): Promise<void> {
    const notes = await localforage.getItem<Note[]>(NOTES_KEY) || [];
    const filteredNotes = notes.filter(n => !ids.includes(n.id));
    await localforage.setItem(NOTES_KEY, filteredNotes);
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
    const lowerQuery = query.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(lowerQuery) || 
      n.content.toLowerCase().includes(lowerQuery)
    );
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
  },

  async clearChatHistory(): Promise<void> {
    await localforage.removeItem(CHAT_HISTORY_KEY);
    await localforage.removeItem(CONTEXT_SUMMARY_KEY);
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
  },

  async deleteTask(id: string): Promise<void> {
    const tasks = await this.getTasks();
    const filtered = tasks.filter(t => t.id !== id);
    await localforage.setItem(TASKS_KEY, filtered);
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
  }
};
