import { DataManager } from '../storage/DataManager';
import { Note } from '../../types/note';
import { AITask } from '../../types/ai';

export const executeAICommands = async (text: string) => {
  if (!text) return;

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

  try {
    const workspaceId = await DataManager.getActiveWorkspaceId();

    // 1. Create Page Commands
    const createPages = extractTag('create_page', text);
    for (const pageXml of createPages) {
      const title = extractNestedTag('title', pageXml) || 'Untitled';
      const rawId = extractNestedTag('id', pageXml);
      const content = extractNestedTag('content', pageXml);
      const emoji = extractNestedTag('emoji', pageXml) || '📝';

      const id = rawId.replace(/[^a-z0-9-_]/gi, '_') || crypto.randomUUID();

      const existing = await DataManager.getNoteById(id);
      if (!existing) {
        const newNote: Note = {
          id,
          title,
          content: content || `<p>Created by AI</p>`,
          emoji,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          workspaceId
        };
        await DataManager.saveNote(newNote);
        console.log(`[AICommandExecutor] Executed create_page for ID: ${id}`);
      }
    }

    // 2. Update Page Commands
    const updatePages = extractTag('update_page', text);
    for (const pageXml of updatePages) {
      const rawId = extractNestedTag('id', pageXml);
      const content = extractNestedTag('content', pageXml);
      const title = extractNestedTag('title', pageXml);

      const id = rawId.replace(/[^a-z0-9-_]/gi, '_');
      if (id) {
        const existing = await DataManager.getNoteById(id);
        if (existing) {
          if (content) existing.content = content;
          if (title) existing.title = title;
          existing.updatedAt = Date.now();
          await DataManager.saveNote(existing);
          console.log(`[AICommandExecutor] Executed update_page for ID: ${id}`);
        }
      }
    }

    // 3. Create Task Commands
    const createTasks = extractTag('create_task', text);
    for (const taskXml of createTasks) {
      const title = extractNestedTag('title', taskXml) || 'New Task';
      const description = extractNestedTag('description', taskXml) || '';
      const rawId = extractNestedTag('id', taskXml);
      
      const id = rawId.replace(/[^a-z0-9-_]/gi, '_') || crypto.randomUUID();

      const existingTasks = await DataManager.getTasks();
      const existing = existingTasks.find(t => t.id === id);
      if (!existing) {
        const newTask: AITask = {
          id,
          title,
          description,
          status: 'pending',
          parts: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await DataManager.saveTask(newTask);
        console.log(`[AICommandExecutor] Executed create_task for ID: ${id}`);
      }
    }
  } catch (err) {
    console.error('[AICommandExecutor] Failed to parse/execute AI tags:', err);
  }
};
