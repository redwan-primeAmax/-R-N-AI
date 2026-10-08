/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note } from '../../types';
import { db } from '../storage/DexieDB';
import { AgenticAIService } from './agentic';
import { DataManager } from '../storage/DataManager';

export const AgentService = {
  /**
   * Triggered when a note is saved to update secret AI tags in the background.
   */
  async onNoteSaved(note: Note) {
    // If note is too small or trashed, skip
    if (note.isTrashed || note.content.length < 20) return;

    // Throttle generation: only if aiTags are missing or content changed significantly
    // For now, let's just generate if missing
    if (!note.aiTags || note.aiTags.length === 0) {
      this.generateAiTags(note).catch(err => console.error('[AgentService] Failed to generate tags:', err));
    }
  },

  async generateAiTags(note: Note) {
    const ai = new AgenticAIService();
    const settings = await DataManager.getAISettings();
    
    const prompt = `Analyze this note and provide 3-5 short, secret classification tags (AI TAGS) that will help me (the AI) find this note later. 
    Use English for tags to maintain internal consistency.
    Examples: "meeting", "code", "personal", "finance", "draft", "project-x", "todo", "report", "idea".
    Only output the tags inside <ai_tags><tag>tag1</tag><tag>tag2</tag></ai_tags> format. 
    Nothing else.
    
    Note Title: ${note.title}
    Note Content: ${note.content.substring(0, 3000)}`;

    try {
      const response = await ai.sendMessage(prompt, {
        settings,
        systemPrompt: "You are a background classifier. Output only the requested XML. Use English tags.",
        history: []
      });

      const tags = this.extractTags(response);
      if (tags.length > 0) {
        // Use a direct update to avoid triggering onNoteSaved again via NoteService
        await db.notes.update(note.id, { 
          aiTags: tags,
          // Store a hash or timestamp to avoid re-tagging the same content
          lastAiTaggedAt: Date.now() 
        });
        console.log(`[AgentService] Generated AI tags for "${note.title}":`, tags);
      }
    } catch (e) {
      console.warn('[AgentService] AI Tag generation failed:', e);
    }
  },

  extractTags(text: string): string[] {
    const regex = /<tag>([\s\S]*?)<\/tag>/gi;
    const tags: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      tags.push(match[1].trim().toLowerCase());
    }
    return tags;
  },

  /**
   * Performs workspace-wide search using content, title and AI tags.
   */
  async searchWorkspace(query: string): Promise<Note[]> {
    const lowerQuery = query.toLowerCase();
    
    // 1. Search by title and content (Standard)
    // 2. Search by AI tags (Secret)
    // 3. Search by user tags
    
    const workspaceId = await DataManager.getActiveWorkspaceId();
    
    // Use Dexie for initial filtering if possible, or just filter in memory for now
    // Since the user mentioned 10,000 notes, memory filtering might be slow but let's try to be smart.
    const allNotes = await db.notes
      .where('workspaceId').equals(workspaceId)
      .and(n => !n.isTrashed)
      .toArray();

    return allNotes.filter(n => {
      const titleMatch = n.title.toLowerCase().includes(lowerQuery);
      const contentMatch = n.content.toLowerCase().includes(lowerQuery);
      const aiTagMatch = n.aiTags?.some(t => t.includes(lowerQuery));
      const userTagMatch = n.tags?.some(t => t.toLowerCase().includes(lowerQuery));
      return titleMatch || contentMatch || aiTagMatch || userTagMatch;
    });
  },

  /**
   * Filters notes by date ranges for the /list command.
   */
  async listNotesByFilter(filter: 'recent' | 'today' | 'yesterday' | 'hours', value?: number): Promise<Note[]> {
    const workspaceId = await DataManager.getActiveWorkspaceId();
    const now = Date.now();
    let minTime = 0;

    if (filter === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      minTime = startOfDay.getTime();
    } else if (filter === 'yesterday') {
      const startOfYesterday = new Date();
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      startOfYesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(startOfYesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      
      return await db.notes
        .where('workspaceId').equals(workspaceId)
        .and(n => !n.isTrashed && n.updatedAt >= startOfYesterday.getTime() && n.updatedAt <= endOfYesterday.getTime())
        .toArray();
    } else if (filter === 'hours') {
      const hours = value || 1;
      minTime = now - (hours * 60 * 60 * 1000);
    } else if (filter === 'recent') {
      return await db.notes
        .where('workspaceId').equals(workspaceId)
        .and(n => !n.isTrashed)
        .reverse()
        .sortBy('updatedAt')
        .then(notes => notes.slice(0, value || 20));
    }

    return await db.notes
      .where('workspaceId').equals(workspaceId)
      .and(n => !n.isTrashed && n.updatedAt >= minTime)
      .toArray();
  }
};
