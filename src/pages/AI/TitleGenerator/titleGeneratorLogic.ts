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

  const enhancedSystemPrompt = `${systemPrompt}\n\nSTRICT RULES:\n1. Generate EXACTLY 15 titles (to ensure we have enough good ones).\n2. NO special characters, NO punctuation, NO brackets (only plain text).\n3. Each title MUST be between 20 to 25 words long.\n4. NO emojis.\n5. Contextually relevant to the note content.`;

  aiManager.runTask(
    taskId,
    provider,
    userPrompt,
    enhancedSystemPrompt,
    (response) => {
      const titles = response
        .split('\n')
        .map(line => {
          // Remove numbering (1., 2., etc), dashes (-), and stars (*)
          let cleaned = line.replace(/^[\d+.\-\*]+\s*/, '') 
            .replace(/[\[\]\(\)\{\}]/g, '') // Remove brackets
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\u200D|\uFE0F/g, '') // Remove emojis
            .trim();
          
          return cleaned;
        })
        .filter(line => {
          // A valid title should have at least 5 words to be meaningful
          return line.length > 10 && line.split(/\s+/).length >= 5;
        })
        .slice(0, 10);
      onTitles(titles);
    }
  );
};
