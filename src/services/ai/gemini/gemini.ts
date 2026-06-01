/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager, ChatMessage, Note, ContextSummary } from '../../storage/DataManager';
import { AIService, AIServiceOptions } from '../../aiService';


export const GEMINI_SYSTEM_PROMPT = `You are the Redwan Assistant (Gemini Edition).
You are a professional Content Creator and AI Architect for a Notion-style editor.

ASSISTANT CAPABILITIES:
- Create and update pages with rich HTML formatting.
- Manage complex tasks by breaking them into parts.
- Track task progress and complete individual parts.
- Prune conversation context to maintain performance.
- Verify page content against specific criteria.
- Replace specific content within pages using search and replace.
- Support for multiple languages, including professional Bengali.
- Real-time streaming responses.
- Mention pages using '@' to provide context.

FORMATTING RULES:
1. Detect user language and reply in the same. For Bengali, use natural, high-quality Bengali.
2. Use standard Markdown: **bold**, *italic*, # Headings, - lists, \`code blocks\`, > blockquotes.
3. NEVER explain how to use features unless asked. 
4. NO Hallucinations: Do not invent facts or external advice (like safety warnings) unless relevant.
5. If you cannot perform a task, say so professionally.

XML COMMANDS (MANDATORY):
Use these EXACT tags for data manipulation. Never just talk about it.

<create_page>
  <title>Title</title>
  <id>UUID</id>
  <content>Markdown</content>
</create_page>

<update_page>
  <id>ExistingID</id>
  <content>New Markdown</content>
</update_page>

<create_task>
  <title>Title</title>
  <description>Desc</description>
  <parts><part>Title 1</part></parts>
</create_task>

<replace_content>
  <id>ID</id>
  <search>Text</search>
  <replacement>New</replacement>
</replace_content>

End every message with [COMPLETION: X%].`;

export class GeminiService extends AIService {
  name = 'gemini';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { settings, onToken, systemPrompt } = options;
    const finalSystemPrompt = systemPrompt || GEMINI_SYSTEM_PROMPT;
    const userApiKey = settings.apiKeys.gemini;
    const platformApiKey = process.env.GEMINI_API_KEY;
    const apiKey = userApiKey || platformApiKey;
    const model = settings.selectedModels.gemini || 'gemini-1.5-flash';

    if (!apiKey) {
      throw new Error("Gemini API Key is missing.");
    }

    const contents = [
      {
        role: 'user',
        parts: [{ text: `System Instruction: ${finalSystemPrompt}\n\nContext & History:\n${prompt}` }]
      }
    ];
    
    let response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
        })
      });
    } catch (networkErr: any) {
      throw new Error(`Connection Error: ${networkErr.message || "Failed to reach Gemini API. Please check your internet connection."} (কানেকশন এরর: ইন্টারনেট কানেকশন চেক করুন)`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Gemini API Error (Status: ${response.status})`);
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
        try {
          const parsed = JSON.parse(line.replace('data: ', ''));
          const text = parsed.candidates[0].content.parts[0].text;
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

/**
 * Gemini Specific Chat Logic
 */
export const handleGeminiSendMessage = async (
  input: string,
  messages: ChatMessage[],
  contextSummary: ContextSummary | null,
  setters: any,
  attachedNotes: Note[] = []
) => {
  const { 
    setIsLoading, setAiStatus, setAiReason, setMessages, 
    setStreamingMessage, setInput, loadHistory, loadNotes, loadTasks 
  } = setters;

  if (!input.trim() && attachedNotes.length === 0) return;

  const userMessage: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
  setMessages((prev: ChatMessage[]) => [...prev, userMessage]);
  setInput('');
  await DataManager.saveChatMessage(userMessage);

  setIsLoading(true);
  setAiStatus('generating');
  
  try {
    const settings = await DataManager.getAISettings();
    const service = new GeminiService();

    const response = await service.sendMessage(input, {
      settings,
      systemPrompt: settings.systemPrompt || GEMINI_SYSTEM_PROMPT,
      history: messages,
      attachedNotes,
      onToken: (token) => setStreamingMessage(token)
    });

    const aiMessage: ChatMessage = { role: 'model', text: response, timestamp: Date.now() };
    setMessages((prev: ChatMessage[]) => [...prev, aiMessage]);
    await DataManager.saveChatMessage(aiMessage);
    setStreamingMessage(null);
    setAiStatus('idle');
  } catch (err: any) {
    setAiStatus('error');
    setAiReason(err.message || 'Gemini Error');
  } finally {
    setIsLoading(false);
    loadHistory(); loadNotes(); loadTasks();
  }
};
