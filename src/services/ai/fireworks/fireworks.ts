/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager, ChatMessage, Note, ContextSummary } from '../../storage/DataManager';
import { AIService, AIServiceOptions } from '../../aiService';
import { SYSTEM_PROMPTS } from '../../../constants/prompts';

export const FIREWORKS_SYSTEM_PROMPT = `You are Redwan AI (Fireworks Edition). 
You help users manage a Notion-style workspace.

CAPABILITIES:
- Page creation/updates (<create_page>, <update_page>)
- Task management (<create_task>)
- Bengali & Multi-language support.
- Search and Replace (<replace_content>)

RULES:
- Detect user language.
- Use standard Markdown.
- No hallucinations or meta-talk.
- Always use XML tags for content generation.

End with [COMPLETION: X%]`;

export class FireworksService extends AIService {
  name = 'fireworks';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { settings, onToken, systemPrompt, history = [] } = options;
    const finalSystemPrompt = systemPrompt || FIREWORKS_SYSTEM_PROMPT;
    const apiKey = settings.apiKeys.fireworks;
    const model = settings.selectedModels.fireworks || 'accounts/fireworks/models/deepseek-v3p1';

    if (!apiKey) throw new Error("Fireworks AI API Key is missing. (এপিআই কী নেই)");

    const messages = [
      { role: 'system', content: finalSystemPrompt },
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text
      })),
      { role: 'user', content: prompt }
    ];

    let response;
    try {
      response = await fetch(`https://api.fireworks.ai/inference/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: 4096,
          temperature: 0.7
        })
      });
    } catch (networkErr: any) {
      throw new Error(`Connection Error: ${networkErr.message} (কানেকশন এরর: ইন্টারনেট চেক করুন)`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Fireworks API Error: ${msg} (সার্ভার এরর: ${response.status})`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    if (!reader) throw new Error("Response body is null (রেসপন্স বডি পাওয়া যায়নি)");

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = data.choices[0]?.delta?.content || "";
              if (content) {
                fullResponse += content;
                if (onToken) onToken(fullResponse);
              }
            } catch (e) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (streamErr: any) {
      throw new Error(`Stream Error: ${streamErr.message} (স্ট্রিম কানেকশন বিচ্ছিন্ন হয়েছে)`);
    }

    return fullResponse;
  }
}

export const handleFireworksSendMessage = async (
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
    const service = new FireworksService();
    const response = await service.sendMessage(input, {
      settings,
      systemPrompt: settings.systemPrompt || FIREWORKS_SYSTEM_PROMPT,
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
    setAiReason(err.message || 'Fireworks Error');
  } finally {
    setIsLoading(false);
    loadHistory(); loadNotes(); loadTasks();
  }
};
