/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIService, AIServiceOptions } from '../aiService';

export class OpenRouterService extends AIService {
  name = 'openrouter';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { settings, systemPrompt, onToken } = options;
    const apiKey = settings.apiKeys.openrouter;
    const model = settings.selectedModels.openrouter;

    if (!apiKey) {
      throw new Error("OpenRouter API Key is missing. Please add it in AI Settings.");
    }

    const response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Redwan AI Assistant'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "OpenRouter API Error");
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
        if (!line.startsWith('data: ')) continue;
        const message = line.replace(/^data: /, '');
        if (message === '[DONE]') break;
        
        try {
          const parsed = JSON.parse(message);
          const content = parsed.choices[0].delta.content;
          if (content) {
            fullResponse += content;
            if (onToken) onToken(fullResponse);
          }
        } catch (e) {}
      }
    }
    return fullResponse;
  }
}
