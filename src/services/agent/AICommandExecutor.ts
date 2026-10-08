import { DataManager } from '../storage/DataManager';
import { Note } from '../../types/note';
import { AgentService } from './AgentService';

const unescapeHTML = (str: string) => {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

const cleanAIContent = (content: string) => {
  let cleaned = content.trim();
  // Strip Markdown code block wrappers if AI included them
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
  }
  return unescapeHTML(cleaned);
};

export const executeAICommands = async (text: string) => {
  if (!text) return [];

  const results: any[] = [];

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
    return match ? cleanAIContent(match[1]) : '';
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
        window.dispatchEvent(new CustomEvent('app-notification', { 
          detail: { message: `AI: নতুন পেজ তৈরি করা হয়েছে "${title}"`, type: 'success' } 
        }));
        results.push({ type: 'create_page', status: 'success', id, title });
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
          window.dispatchEvent(new CustomEvent('app-notification', { 
            detail: { message: `AI: আপডেটেড পেজ "${existing.title}"`, type: 'success' } 
          }));
          results.push({ type: 'update_page', status: 'success', id, title: existing.title });
        }
      }
    }

    // 3. Replace Content Commands
    const replaceContents = extractTag('replace_content', text);
    for (const replaceXml of replaceContents) {
      const rawId = extractNestedTag('id', replaceXml);
      const search = extractNestedTag('search', replaceXml);
      const replacement = extractNestedTag('replacement', replaceXml);

      const id = rawId.replace(/[^a-z0-9-_]/gi, '_');
      if (id && search) {
        const existing = await DataManager.getNoteById(id);
        if (existing) {
          existing.content = existing.content.split(search).join(replacement);
          existing.updatedAt = Date.now();
          await DataManager.saveNote(existing);
          window.dispatchEvent(new CustomEvent('app-notification', { 
            detail: { message: `AI: পেজ এডিট সম্পন্ন হয়েছে "${existing.title}"`, type: 'success' } 
          }));
          results.push({ type: 'replace_content', status: 'success', id, title: existing.title });
        }
      }
    }

    // 4. Delete Page Commands
    const deletePages = extractTag('delete_page', text);
    for (const deleteXml of deletePages) {
      const rawId = extractNestedTag('id', deleteXml);
      const id = rawId.replace(/[^a-z0-9-_]/gi, '_');
      if (id) {
        const existing = await DataManager.getNoteById(id);
        if (existing) {
          await DataManager.deleteNote(id);
          window.dispatchEvent(new CustomEvent('app-notification', { 
            detail: { message: `AI: পেজ মুছে ফেলা হয়েছে (রিসাইকেল বিনে পাঠানো হয়েছে) "${existing.title}"`, type: 'info' } 
          }));
          results.push({ type: 'delete_page', status: 'success', id, title: existing.title });
        }
      }
    }

    // 5. Search Workspace Command
    const searches = extractTag('search_workspace', text);
    for (const query of searches) {
      const notes = await AgentService.searchWorkspace(query);
      results.push({ 
        type: 'search_results', 
        query, 
        notes: notes.slice(0, 10).map(n => ({ id: n.id, title: n.title, aiTags: n.aiTags })) 
      });
    }

    // 6. List Notes Command
    const lists = extractTag('list_notes', text);
    for (const listXml of lists) {
      const filter = extractNestedTag('filter', listXml) as any;
      const value = parseInt(extractNestedTag('value', listXml) || '0');
      const notes = await AgentService.listNotesByFilter(filter, value);
      results.push({ 
        type: 'list_results', 
        filter, 
        notes: notes.slice(0, 30).map(n => ({ id: n.id, title: n.title, updatedAt: n.updatedAt })) 
      });
    }

    // 7. Suggest Tags Command
    const suggestions = extractTag('suggest_tags', text);
    for (const suggestXml of suggestions) {
      const id = extractNestedTag('id', suggestXml);
      const tags = extractTag('tag', suggestXml);
      if (id && tags.length > 0) {
        window.dispatchEvent(new CustomEvent('ai-tag-suggestions', { 
          detail: { noteId: id, tags } 
        }));
        results.push({ type: 'suggest_tags', status: 'success', noteId: id, tags });
      }
    }
  } catch (err) {
    console.error('[AICommandExecutor] Failed to parse/execute AI tags:', err);
    window.dispatchEvent(new CustomEvent('app-notification', { 
      detail: { message: `AI: কমান্ড কার্যকর করতে সমস্যা হয়েছে।`, type: 'error' } 
    }));
  }

  return results;
};
