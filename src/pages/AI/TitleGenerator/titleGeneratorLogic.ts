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

  aiManager.runTask(
    taskId,
    provider,
    userPrompt,
    systemPrompt,
    (response) => {
      const titles = response
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 10);
      onTitles(titles);
    }
  );
};
