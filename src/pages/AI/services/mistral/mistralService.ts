/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIService, AIServiceOptions } from '../aiService';

export class MistralService extends AIService {
  name = 'mistral';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { settings, systemPrompt, onToken } = options;
    const userApiKey = settings.apiKeys.mistral;
    const platformApiKey = process.env.MISTRAL_API_KEY;
    const apiKey = (userApiKey || platformApiKey)?.trim();
    const model = settings.selectedModels.mistral || 'mistral-large-latest';

    if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
      throw new Error("Mistral API Key is missing or invalid. Please add a valid key in AI Settings.");
    }

    const isJsonRequest = systemPrompt.toLowerCase().includes('json') || prompt.toLowerCase().includes('json');

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: isJsonRequest ? { type: 'json_object' } : undefined,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      let errorMsg = "Mistral API Error";
      if (response.status === 401) {
        throw new Error("Mistral API Key is unauthorized. Please check if your API key is correct and active.");
      }
      try {
        const err = await response.json();
        console.error("Mistral API Error Details:", err);
        errorMsg = err.message || err.error?.message || JSON.stringify(err);
      } catch (e) {
        const text = await response.text();
        console.error("Mistral API Raw Error:", text);
        errorMsg = text || `Error ${response.status}`;
      }
      throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
        
        const message = trimmedLine.replace(/^data: /, '');
        if (message === '[DONE]') break;
        
        try {
          const parsed = JSON.parse(message);
          const content = parsed.choices[0].delta?.content;
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
