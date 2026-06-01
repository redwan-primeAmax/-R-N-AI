/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIService, AIServiceOptions } from '../AIService';
import { DataManager, ChatMessage, Note, ContextSummary } from '../../storage/DataManager';

export class LocalHandler extends AIService {
  name = 'local';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { onToken } = options;
    const response = `এটি একটি সিমুলেটেড লোকাল এআই রেসপন্স। লোকাল মডেলটি সফলভাবে লোড করা হয়েছে এবং চালিত হচ্ছে। আপনার ইনপুট: "${prompt}"`;
    
    const words = response.split(' ');
    let currentText = '';
    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i];
      if (onToken) {
        onToken(currentText);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return response;
  }
}

export const handleLocalSendMessage = async (
  input: string,
  messages: ChatMessage[],
  contextSummary: ContextSummary | null,
  setters: any,
  attachedNotes: Note[] = []
) => {
  const { setIsLoading, setAiStatus, setMessages, setStreamingMessage, setInput } = setters;
  const userMessage: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
  setMessages((prev: any) => [...prev, userMessage]);
  setInput('');
  await DataManager.saveChatMessage(userMessage);

  setIsLoading(true);
  setAiStatus('generating');
  
  try {
    const settings = await DataManager.getAISettings();
    const service = new LocalHandler();
    
    let fullResponse = "";
    const options = {
      settings,
      systemPrompt: "You are a local assistant.",
      onToken: (token: string) => {
        fullResponse = token;
        setStreamingMessage(token);
      },
      history: messages,
      attachedNotes
    };
    
    const response = await service.sendMessage(input, options);
    const assistantMessage: ChatMessage = { role: 'model', text: response, timestamp: Date.now() };
    
    setMessages((prev: any) => [...prev, assistantMessage]);
    setStreamingMessage(null);
    await DataManager.saveChatMessage(assistantMessage);
  } catch (err: any) {
    console.error(err);
    const errorMessage: ChatMessage = { role: 'model', text: `ত্রুটি: ${err.message}`, timestamp: Date.now() };
    setMessages((prev: any) => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
    setAiStatus('idle');
  }
};
