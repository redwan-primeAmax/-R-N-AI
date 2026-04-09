/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AISettings } from '../../../utils/DataManager';

export interface AIServiceOptions {
  settings: AISettings;
  systemPrompt: string;
  onToken?: (token: string) => void;
  onFullResponse?: (response: string) => void;
}

export abstract class AIService {
  abstract name: string;
  abstract sendMessage(prompt: string, options: AIServiceOptions): Promise<string>;
  
  async suggestTitles(content: string, settings: AISettings): Promise<string[]> {
    if (!content.trim()) {
      return ["Untitled Note", "New Idea", "Quick Draft", "Meeting Notes", "Daily Journal"];
    }
    const prompt = `Based on the following content, suggest 5 concise and engaging titles. Return ONLY a JSON array of strings.\n\nContent:\n${content}`;
    const response = await this.sendMessage(prompt, {
      settings,
      systemPrompt: "You are a helpful assistant that suggests titles for notes. Return ONLY a JSON array of strings.",
      onToken: () => {}
    });
    
    try {
      const cleaned = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse title suggestions", e);
      // Fallback if AI fails to return valid JSON
      const lines = response.split('\n').filter(l => l.trim().length > 0).slice(0, 5);
      return lines.length > 0 ? lines.map(l => l.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim()) : [];
    }
  }
}
