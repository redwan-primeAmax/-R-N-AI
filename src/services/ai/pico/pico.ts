/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager, ChatMessage, Note, ContextSummary } from '../../storage/DataManager';
import { AIService, AIServiceOptions } from '../../aiService';
import { SYSTEM_PROMPTS } from '../../../constants/prompts';

const PICO_SYSTEM_PROMPT = SYSTEM_PROMPTS.PICO;

export class PicoService extends AIService {
  name = 'picoapps';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { onToken, systemPrompt } = options;
    const finalSystemPrompt = systemPrompt || PICO_SYSTEM_PROMPT;
    
    return new Promise((resolve, reject) => {
      const socket = new WebSocket('wss://backend.buildpicoapps.com/ask_ai_streaming_v2');
      let response = "";
      socket.onopen = () => {
        socket.send(JSON.stringify({ 
          appId: options.settings?.selectedAppID || "default-001",
          prompt: `${finalSystemPrompt}\n\nUser Input: ${prompt}`
        }));
      };
      socket.onmessage = (e) => {
        response += e.data;
        if (onToken) onToken(response);
      };
      socket.onclose = (e) => {
        if (e.code === 1000) resolve(response);
        else reject(new Error("Pico WebSocket Error: Monthly response limit reached or connection lost. (কোটা শেষ হতে পারে)"));
      };
      socket.onerror = () => reject(new Error("Pico Connection Failed. (কানেকশন ফেইলড)"));
    });
  }
}

export const handlePicoSendMessage = async (
  input: string,
  messages: ChatMessage[],
  contextSummary: ContextSummary | null,
  setters: any,
  attachedNotes: Note[] = []
) => {
  const { setIsLoading, setAiStatus, setAiReason, setMessages, setStreamingMessage, setInput, loadHistory, loadNotes, loadTasks } = setters;
  const userMessage: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
  setMessages((prev: any) => [...prev, userMessage]);
  setInput('');
  await DataManager.saveChatMessage(userMessage);

  setIsLoading(true);
  setAiStatus('generating');
  
  try {
    const settings = await DataManager.getAISettings();
    const service = new PicoService();
    
    // Construct rich context for Pico
    const historyText = messages.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
    const noteContext = attachedNotes.map(n => `Ref: ${n.title}\n${n.content}`).join('\n---\n');
    const combinedPrompt = `${noteContext ? `Context:\n${noteContext}\n\n` : ''}${historyText ? `History:\n${historyText}\n\n` : ''}Request: ${input}`;

    const response = await service.sendMessage(combinedPrompt, {
      settings,
      systemPrompt: settings.systemPrompt || PICO_SYSTEM_PROMPT,
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
    setAiReason(err.message);
  } finally {
    setIsLoading(false);
    loadHistory(); loadNotes(); loadTasks();
  }
};

