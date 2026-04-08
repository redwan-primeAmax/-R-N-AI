/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIService, AIServiceOptions } from '../aiService';

export class GeminiService extends AIService {
  name = 'gemini';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { settings, systemPrompt, onToken } = options;
    const apiKey = settings.apiKeys.gemini;
    const model = settings.selectedModels.gemini || 'gemini-3-flash-preview';

    if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please add it in AI Settings.");
    }

    // Prompt Caching & Structured Prompting System
    // We structure the prompt to be more efficient for Gemini
    const contents = [
      {
        role: 'user',
        parts: [{ text: `System Instruction: ${systemPrompt}\n\nContext & History:\n${prompt}` }]
      }
    ];
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Gemini API Error");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const message = line.replace(/^data: /, '');
          try {
            const parsed = JSON.parse(message);
            const content = parsed.candidates[0].content.parts[0].text;
            if (content) {
              fullResponse += content;
              if (onToken) onToken(fullResponse);
            }
          } catch (e) {}
        }
      }
    }
    return fullResponse;
  }
}
