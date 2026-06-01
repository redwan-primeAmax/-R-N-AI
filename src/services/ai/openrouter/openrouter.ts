/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager, ChatMessage, Note, ContextSummary } from '../../storage/DataManager';
import { AIService, AIServiceOptions } from '../../aiService';
import { SYSTEM_PROMPTS } from '../../../constants/prompts';

const OPENROUTER_SYSTEM_PROMPT = SYSTEM_PROMPTS.OPENROUTER;

export class OpenRouterService extends AIService {
  name = 'openrouter';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { settings, onToken, systemPrompt } = options;
    const finalSystemPrompt = systemPrompt || OPENROUTER_SYSTEM_PROMPT;
    const apiKey = settings.apiKeys.openrouter;
    const model = settings.selectedModels.openrouter;

    if (!apiKey) throw new Error("OpenRouter API Key is missing.");

    let response;
    try {
      response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Redwan AI'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: finalSystemPrompt },
            { role: 'user', content: prompt }
          ],
          stream: true
        })
      });
    } catch (networkErr: any) {
      throw new Error(`Connection Error: ${networkErr.message || "Failed to reach OpenRouter API. Please check your internet connection."} (কানেকশন এরর: ইন্টারনেট কানেকশন চেক করুন)`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenRouter API Error (Status: ${response.status})`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const msg = line.replace('data: ', '');
        if (msg === '[DONE]') break;
        try {
          const parsed = JSON.parse(msg);
          const text = parsed.choices[0].delta.content;
          if (text) {
            fullResponse += text;
            if (onToken) onToken(fullResponse);
          }
        } catch (e) {}
      }
    }
    return fullResponse;
  }
}

export const handleOpenRouterSendMessage = async (
  input: string,
  messages: ChatMessage[],
  contextSummary: ContextSummary | null,
  setters: any,
  attachedNotes: Note[] = []
) => {
  const { setIsLoading, setAiStatus, setAiReason, setMessages, setStreamingMessage, setInput, loadHistory, loadNotes, loadTasks } = setters;
  if (!input.trim() && attachedNotes.length === 0) return;

  const userMessage: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
  setMessages((prev: any) => [...prev, userMessage]);
  setInput('');
  await DataManager.saveChatMessage(userMessage);

  setIsLoading(true);
  setAiStatus('generating');
  
  try {
    const settings = await DataManager.getAISettings();
    const service = new OpenRouterService();
    const response = await service.sendMessage(input, {
      settings,
      systemPrompt: settings.systemPrompt || OPENROUTER_SYSTEM_PROMPT,
      history: messages,
      attachedNotes,
      onToken: (token) => setStreamingMessage(token)
    });

    const aiMessage: ChatMessage = { role: 'model', text: response, timestamp: Date.now() };
    setMessages((prev: any) => [...prev, aiMessage]);
    await DataManager.saveChatMessage(aiMessage);
    setStreamingMessage(null);
    setAiStatus('idle');
  } catch (err: any) {
    setAiStatus('error');
    setAiReason(err.message || 'OpenRouter Error');
  } finally {
    setIsLoading(false);
    loadHistory(); loadNotes(); loadTasks();
  }
};
