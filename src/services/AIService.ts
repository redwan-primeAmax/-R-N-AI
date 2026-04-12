/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager, ChatMessage, Note, AITask, ContextSummary } from '../utils/DataManager';
import { AIServiceFactory } from '../pages/AI/services/serviceFactory';
import { marked } from 'marked';
import TurndownService from 'turndown';

const turndownService = new TurndownService();

interface TaskState {
  id: string;
  status: 'idle' | 'generating' | 'checking' | 'updating' | 'error';
  reason: string | null;
  progress: number | null;
  streamingText: string | null;
}

class AIManager {
  private static instance: AIManager;
  private activeTasks: Map<string, TaskState> = new Map();
  private listeners: Set<(tasks: Map<string, TaskState>) => void> = new Set();

  private constructor() {}

  private markdownToHtml(markdown: string): string {
    let html = marked.parse(markdown) as string;
    
    // Post-process for Tiptap task lists
    // Convert <li>[ ] to <li data-type="taskItem" data-checked="false">
    // Convert <li>[x] to <li data-type="taskItem" data-checked="true">
    html = html.replace(/<li>\s*\[ \]\s*/g, '<li data-type="taskItem" data-checked="false">');
    html = html.replace(/<li>\s*\[x\]\s*/g, '<li data-type="taskItem" data-checked="true">');
    
    // If we found any task items, wrap the parent <ul> in data-type="taskList"
    if (html.includes('data-type="taskItem"')) {
      // This is a bit naive but works for simple lists
      html = html.replace(/<ul>([\s\S]*?data-type="taskItem"[\s\S]*?)<\/ul>/g, '<ul data-type="taskList">$1</ul>');
    }

    return html;
  }

  static getInstance() {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  subscribe(callback: (tasks: Map<string, TaskState>) => void) {
    this.listeners.add(callback);
    callback(this.activeTasks);
    return () => { this.listeners.delete(callback); };
  }

  private notify() {
    this.listeners.forEach(cb => cb(new Map(this.activeTasks)));
  }

  cancelTask(id: string) {
    this.activeTasks.delete(id);
    this.notify();
  }

  updateTask(id: string, update: Partial<TaskState>) {
    const current = this.activeTasks.get(id) || { id, status: 'idle', reason: null, progress: null, streamingText: null };
    this.activeTasks.set(id, { ...current, ...update });
    this.notify();
  }

  private async sendWithRetry(
    taskId: string,
    p: string,
    prov: string,
    settings: any,
    systemPrompt: string,
    isChecking = false
  ): Promise<string> {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < 5) {
      try {
        const service = AIServiceFactory.getService(prov);
        return await service.sendMessage(p, {
          settings,
          systemPrompt: isChecking ? "Quality Controller" : systemPrompt,
          onToken: (token) => {
            this.updateTask(taskId, { streamingText: token });
          }
        });
      } catch (e: any) {
        attempts++;
        const errorMsg = e.message || String(e);
        console.warn(`AI Attempt ${attempts} failed:`, errorMsg);
        
        const isRetryable = errorMsg.includes('429') || 
                           errorMsg.includes('500') || 
                           errorMsg.includes('503') || 
                           errorMsg.includes('fetch') ||
                           errorMsg.includes('network');

        if (!isRetryable || attempts >= 5) throw e;

        this.updateTask(taskId, { reason: `Retrying (${attempts}/5)... ${errorMsg.slice(0, 20)}` });
        await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempts), 10000)));
      }
    }
    throw new Error("Max retries reached");
  }

  async runTask(
    taskId: string,
    provider: string,
    prompt: string,
    systemPrompt: string,
    onComplete: (result: string) => void
  ) {
    this.updateTask(taskId, { status: 'generating' });
    const startTime = Date.now();
    try {
      const settings = await DataManager.getAISettings();
      const activeProvider = settings.controlMode === 'auto' ? 'picoapps' : provider;
      const fullResponse = await this.sendWithRetry(taskId, prompt, activeProvider, settings, systemPrompt);
      
      // Log Task
      await DataManager.addLog({
        type: 'task',
        prompt,
        response: fullResponse,
        metadata: {
          taskId,
          provider: activeProvider,
          duration: Date.now() - startTime,
          status: 'completed',
          controlMode: settings.controlMode
        }
      });

      onComplete(fullResponse);
      this.updateTask(taskId, { status: 'idle', streamingText: null });
    } catch (error: any) {
      console.error("Task Error:", error);
      
      // Log Error
      await DataManager.addLog({
        type: 'error',
        prompt,
        error: error.message,
        metadata: {
          taskId,
          provider,
          duration: Date.now() - startTime,
          status: 'failed'
        }
      });

      this.updateTask(taskId, { status: 'error', reason: error.message });
    }
  }

  private async processCommands(text: string) {
    const extractTag = (tag: string, source: string) => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi');
      const matches = [];
      let match;
      while ((match = regex.exec(source)) !== null) {
        matches.push(match[1].trim());
      }
      return matches;
    };

    const extractNestedTag = (tag: string, source: string) => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = regex.exec(source);
      return match ? match[1].trim() : '';
    };

    // 1. Create Page
    const createPages = extractTag('create_page', text);
    for (const pageXml of createPages) {
      try {
        const title = extractNestedTag('title', pageXml);
        const content = extractNestedTag('content', pageXml);
        const emoji = extractNestedTag('emoji', pageXml) || '📄';
        const rawId = extractNestedTag('id', pageXml);
        const id = rawId ? rawId.replace(/[^a-z0-9-_]/gi, '_') : `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        const newNote: Note = {
          id,
          title: title || 'Untitled Page',
          content: content ? this.markdownToHtml(content) : '',
          emoji,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await DataManager.saveNote(newNote);
        console.log(`AI: Created page "${title}" with ID ${id}`);
      } catch (e) {
        console.error("Failed to process <create_page>", e);
      }
    }

    // 2. Update Page
    const updatePages = extractTag('update_page', text);
    for (const pageXml of updatePages) {
      try {
        const idOrTitle = extractNestedTag('id', pageXml);
        const content = extractNestedTag('content', pageXml);
        const mode = (pageXml.match(/mode=["'](append|replace)["']/i) || [])[1] || 'replace';
        
        if (!idOrTitle) continue;

        const notes = await DataManager.getAllNotes();
        const targetNote = notes.find(n => 
          n.id === idOrTitle || 
          n.id === idOrTitle.replace(/[^a-z0-9-_]/gi, '_') ||
          n.title.toLowerCase() === idOrTitle.toLowerCase()
        );

        if (targetNote) {
          const htmlContent = content ? this.markdownToHtml(content) : '';
          if (mode === 'append') {
            targetNote.content = (targetNote.content || '') + htmlContent;
          } else {
            targetNote.content = htmlContent;
          }
          targetNote.updatedAt = Date.now();
          await DataManager.saveNote(targetNote);
          console.log(`AI: ${mode === 'append' ? 'Appended to' : 'Updated'} page "${targetNote.title}"`);
        }
      } catch (e) {
        console.error("Failed to process <update_page>", e);
      }
    }

    // 3. Create Task
    const createTasks = extractTag('create_task', text);
    for (const taskXml of createTasks) {
      try {
        const title = extractNestedTag('title', taskXml);
        const description = extractNestedTag('description', taskXml);
        const partsXml = extractNestedTag('parts', taskXml);
        const partTitles = extractTag('part', partsXml);

        const newTask: AITask = {
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: title || 'AI Task',
          description: description || '',
          status: 'in-progress',
          parts: partTitles.map((pt, idx) => ({
            id: `part-${idx}`,
            title: pt,
            status: 'pending'
          })),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await DataManager.saveTask(newTask);
        console.log(`AI: Created task "${title}"`);
      } catch (e) {
        console.error("Failed to process <create_task>", e);
      }
    }

    // 4. Complete Task Part
    const completeParts = extractTag('complete_part', text);
    for (const partXml of completeParts) {
      try {
        const taskId = extractNestedTag('task_id', partXml);
        const partTitle = extractNestedTag('part_title', partXml);
        if (taskId && partTitle) {
          await DataManager.updateTaskPartStatus(taskId, partTitle, 'completed');
          console.log(`AI: Completed part "${partTitle}" for task "${taskId}"`);
        }
      } catch (e) {
        console.error("Failed to process <complete_part>", e);
      }
    }

    // 5. Update Task Status
    const updateTaskStatuses = extractTag('update_task_status', text);
    for (const statusXml of updateTaskStatuses) {
      try {
        const taskId = extractNestedTag('id', statusXml);
        const status = extractNestedTag('status', statusXml) as any;
        if (taskId && status) {
          const tasks = await DataManager.getTasks();
          const task = tasks.find(t => t.id === taskId || t.title.toLowerCase() === taskId.toLowerCase());
          if (task) {
            task.status = status;
            await DataManager.saveTask(task);
            console.log(`AI: Updated task "${task.title}" status to ${status}`);
          }
        }
      } catch (e) {
        console.error("Failed to process <update_task_status>", e);
      }
    }

    // 6. Replace Content
    const replaceContents = extractTag('replace_content', text);
    for (const replaceXml of replaceContents) {
      try {
        const idOrTitle = extractNestedTag('id', replaceXml);
        const search = extractNestedTag('search', replaceXml);
        const replacement = extractNestedTag('replacement', replaceXml);
        
        if (idOrTitle && search) {
          await DataManager.replaceContent(idOrTitle, search, replacement);
          console.log(`AI: Replaced content in "${idOrTitle}"`);
        }
      } catch (e) {
        console.error("Failed to process <replace_content>", e);
      }
    }
  }

  async runChatTask(
    taskId: string,
    input: string,
    messages: ChatMessage[],
    systemPrompt: string,
    contextSummary: ContextSummary | null,
    notes: Note[],
    attachedNotes: Note[] = []
  ) {
    this.updateTask(taskId, { status: 'generating' });
    const startTime = Date.now();

    try {
      const settings = await DataManager.getAISettings();
      const selectedProvider = settings.controlMode === 'auto' ? 'picoapps' : (settings.selectedProvider || 'picoapps');
      
      // Log User Prompt
      await DataManager.addLog({
        type: 'chat',
        prompt: input,
        metadata: {
          taskId,
          provider: selectedProvider,
          attachedNotesCount: attachedNotes.length,
          controlMode: settings.controlMode
        }
      });

      // Load Provider-Specific System Prompt
      let activeSystemPrompt = systemPrompt;
      const promptPath = selectedProvider === 'openrouter' ? '/prompts/openrouter.txt' : 
                         selectedProvider === 'picoapps' ? '/prompts/pico.txt' : null;
      
      if (promptPath) {
        try {
          const response = await fetch(promptPath);
          if (response.ok) activeSystemPrompt = await response.text();
        } catch (e) {
          console.error(`Failed to load ${selectedProvider} prompt`, e);
        }
      }

      // Context Pruning
      let context = "";
      const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
      const allRelevantNotes = [
        ...(attachedNotes || []),
        ...notes.filter(n => input.toLowerCase().includes(n.title.toLowerCase())),
        sortedNotes[0]
      ].filter((note, index, self) => note && self.findIndex(n => n?.id === note.id) === index).slice(0, 5);

      context = allRelevantNotes.map(n => {
        const markdownContent = n.content ? turndownService.turndown(n.content) : "(No content)";
        return `Page ID: ${n.id} | Title: ${n.title}\nContent:\n${markdownContent}`;
      }).join('\n\n---\n\n');

      const history = messages.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
      
      const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      // Combined Low-Context Prompt
      const prompt = `
SYSTEM: ${activeSystemPrompt}
DATE: ${currentDate}
CONTEXT: ${context}
SUMMARY: ${contextSummary?.text || 'None'}
HISTORY: ${history}
USER: ${input}
`;

      const fullResponse = await this.sendWithRetry(taskId, prompt, selectedProvider, settings, activeSystemPrompt);
      
      // Log AI Response
      await DataManager.addLog({
        type: 'chat',
        response: fullResponse,
        metadata: {
          taskId,
          provider: selectedProvider,
          duration: Date.now() - startTime
        }
      });

      const botMessage: ChatMessage = {
        role: 'model',
        text: fullResponse,
        timestamp: Date.now()
      };
      
      await DataManager.saveChatMessage(botMessage);
      
      // Process commands
      await this.processCommands(fullResponse);

      // Checking Flow
      if (settings.dataCheckingEnabled) {
        this.updateTask(taskId, { status: 'checking' });
        const checkPrompt = `Verify if this output fulfills user intent: "${input}"\nOutput: "${fullResponse}"\nRespond with [SCORE: X%] and [REASON: ...]`;
        const checkResult = await this.sendWithRetry(taskId, checkPrompt, settings.dataCheckingModel === 'free' ? 'picoapps' : selectedProvider, settings, "Quality Controller", true);
        
        if (checkResult.includes('[SCORE: 0%]') || checkResult.includes('[SCORE: 10%]') || checkResult.includes('[SCORE: 20%]')) {
           this.updateTask(taskId, { status: 'updating', reason: 'Refining output...' });
           const refined = await this.sendWithRetry(taskId, `Fix the previous output based on this feedback: ${checkResult}`, selectedProvider, settings, activeSystemPrompt);
           await DataManager.saveChatMessage({ role: 'model', text: refined, timestamp: Date.now() });
           await this.processCommands(refined);
        }
      }

      this.updateTask(taskId, { status: 'idle', streamingText: null });
    } catch (error: any) {
      console.error("Task Error:", error);
      this.updateTask(taskId, { status: 'error', reason: error.message });
    }
  }
}

export const aiManager = AIManager.getInstance();
