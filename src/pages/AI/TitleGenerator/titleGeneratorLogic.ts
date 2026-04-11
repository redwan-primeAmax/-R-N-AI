/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager, Note } from '../../../utils/DataManager';
import { AIServiceFactory } from '../services/serviceFactory';
import TurndownService from 'turndown';

const turndownService = new TurndownService();

import { aiManager } from '../../../services/AIService';

export const generateTitles = async (
  note: Note,
  provider: string,
  onTitles: (titles: string[]) => void,
  onError: (error: string) => void
) => {
  const taskId = `title-gen-${note.id}`;
  
  // Load prompt
  const promptResponse = await fetch('/prompts/title_generator.txt');
  const systemPrompt = promptResponse.ok ? await promptResponse.text() : "Suggest 10 titles for this note.";
  
  const markdownContent = note.content ? turndownService.turndown(note.content) : "(No content)";
  const userPrompt = `Note Title: ${note.title}\nNote Content:\n${markdownContent}`;

  const enhancedSystemPrompt = `${systemPrompt}\n\nSTRICT RULES:\n1. Generate EXACTLY 10 titles.\n2. NO special characters (dots, colons, dashes, Roman numerals, etc.).\n3. MAX 4 words per title.\n4. NO emojis.\n5. Contextually relevant to the note content.`;

  aiManager.runTask(
    taskId,
    provider,
    userPrompt,
    enhancedSystemPrompt,
    (response) => {
      const titles = response
        .split('\n')
        .map(line => {
          // Remove numbers, special characters, and emojis
          let cleaned = line.replace(/^\d+\.\s*/, '') // Remove leading numbers
            .replace(/[^\w\s]/gi, '') // Remove special characters
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\u200D|\uFE0F/g, '') // Remove emojis
            .trim();
          
          // Limit to 4 words
          const words = cleaned.split(/\s+/).slice(0, 4);
          return words.join(' ');
        })
        .filter(line => line.length > 0)
        .slice(0, 10);
      onTitles(titles);
    }
  );
};
