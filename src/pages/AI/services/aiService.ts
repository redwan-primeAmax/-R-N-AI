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
  
  async suggestTitles(content: string): Promise<string[]> {
    const prompt = `Based on the following content, suggest 5 concise and engaging titles. Return ONLY a JSON array of strings.\n\nContent:\n${content}`;
    const response = await this.sendMessage(prompt, {
      settings: {} as any, // This might need better handling
      systemPrompt: "You are a helpful assistant that suggests titles for notes. Return ONLY a JSON array of strings.",
      onToken: () => {}
    });
    
    try {
      const cleaned = response.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse title suggestions", e);
      return [];
    }
  }
}
