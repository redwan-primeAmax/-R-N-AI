/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager, ChatMessage, Note, ContextSummary } from '../../storage/DataManager';
import { AIService, AIServiceOptions } from '../AIService';
import { executeAICommands } from '../AICommandExecutor';

export const GEMINI_SYSTEM_PROMPT = `You are the Redwan Assistant (Gemini Edition).
You are a professional Content Creator and AI Architect for a Notion-style editor.

CORE PHILOSOPHY:
- Be concise, helpful, and professional.
- Use Bengali for Bengali users, English otherwise.
- Format EVERY chat response using rich Markdown (Headings, Bold, Lists, etc.) for a beautiful UI experience.
- DO NOT just send plain text; use structure.

EDITOR CAPABILITIES (HTML-BASED BLOCKS):
You can use rich HTML structures within <content> tags for page creation/update. The editor supports:
1. **Basic Blocks**: <p>, <h1>, <h2>, <h3>, <blockquote>, <hr>
2. **Lists**: <ul>, <ol> with <li>. 
3. **Task Lists**: <ul class="task-list"><li class="task-item-modern" data-checked="true"><input type="checkbox" checked><label>Task</label></li></ul>
4. **Callouts**: <div class="callout" data-emoji="💡">Message</div>
5. **Code Blocks**: <pre><code class="language-javascript">code</code></pre>
6. **Colors & Styles**: Use inline styles like <span style="color: #f43f5e">Red Text</span> or <p style="background-color: #3b82f620">Highlighted Background</p>.
7. **Indentation**: Use <p style="margin-left: 24px"> for nested content.
8. **Tables**: Standard <table><tr><td>...
9. **Media**: <div class="media-block" data-type="media" data-url="URL" data-media-type="image"></div>

XML COMMANDS (MANDATORY for page/task management):
When asked to create, update, or edit a note, you MUST use these exact tags. Do not wrap XML in markdown code blocks. Use these tags ALONGSIDE your markdown text response.

<create_page>
  <title>Title</title>
  <emoji>📝</emoji>
  <content>HTML/Markdown Content</content>
</create_page>

<update_page>
  <id>ExistingID</id>
  <title>Optional New Title</title>
  <content>New Content</content>
</update_page>

<replace_content>
  <id>ID</id>
  <search>Old Text to find</search>
  <replacement>New Text to insert</replacement>
</replace_content>

<create_task>
  <id>unique_task_id</id>
  <title>Task Title</title>
  <description>Detailed description</description>
</create_task>

CONTEXT AWARENESS:
Attached notes are provided as "Attached Notes Context" with [PAGE ID: ...]. Use these IDs when updating notes.

End every message with [COMPLETION: 100%].`;

// Simple AI Response Cache (Problem 10 optimization)
const aiResponseCache = new Map<string, string>();

export class GeminiService extends AIService {
  name = 'gemini';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { settings, onToken, systemPrompt, history = [], attachedNotes = [] } = options;
    const finalSystemPrompt = systemPrompt || GEMINI_SYSTEM_PROMPT;
    const userApiKey = settings.apiKeys.gemini;
    const model = settings.selectedModels.gemini || 'gemini-1.5-flash';

    // Cache key based on model, prompt and history length
    const cacheKey = `${model}:${prompt}:${history.length}:${attachedNotes.length}`;
    if (aiResponseCache.has(cacheKey) && !onToken) {
      return aiResponseCache.get(cacheKey)!;
    }

    // 1. Prepare contents array with full history and attached notes (Bug 9)
    const contents: any[] = [];
    
    // Add history messages
    if (history && history.length > 0) {
      history.forEach((msg) => {
        const role = msg.role === 'user' ? 'user' : 'model';
        
        // If message had attached notes, include them in the historical context for the AI
        let historicalText = msg.text;
        if (msg.attachedNotes && msg.attachedNotes.length > 0) {
          const notesContext = msg.attachedNotes.map(n => `[Attached Note ID: ${n.id}, Title: "${n.title}"]\n${n.content}`).join('\n\n');
          historicalText = `Context from attached notes:\n${notesContext}\n\nUser Message:\n${msg.text}`;
        }

        contents.push({
          role,
          parts: [{ text: historicalText }]
        });
      });
    }

    // Prepare current prompt with attached notes context
    let finalPrompt = prompt;
    if (attachedNotes && attachedNotes.length > 0) {
      const notesContext = attachedNotes.map(n => `[PAGE ID: ${n.id}]\nTitle: "${n.title}"\nContent:\n${n.content}`).join('\n\n---\n\n');
      finalPrompt = `Attached Notes Context (Information from selected pages):\n${notesContext}\n\nUser Message:\n${prompt}`;
    }

    // Append current prompt
    contents.push({
      role: 'user',
      parts: [{ text: finalPrompt }]
    });

    const isUsingProxy = !userApiKey;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for AI (Requirement 16)

    let response;
    try {
      const body = {
        model,
        contents,
        systemInstruction: {
          parts: [{ text: finalSystemPrompt }]
        },
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
      };

      if (isUsingProxy) {
        response = await fetch(`/api/ai/gemini`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(body)
        });
      } else {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${userApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents,
            systemInstruction: body.systemInstruction,
            generationConfig: body.generationConfig
          })
        });
      }
    } catch (networkErr: any) {
      if (networkErr.name === 'AbortError') {
        throw new Error(`AI Request Timeout: AI সার্ভার রেসপন্স করতে দেরি করছে। পরে আবার চেষ্টা করুন। (টাইমআউট এরর)`);
      }
      throw new Error(`Connection Error: ${networkErr.message || "Failed to reach Gemini. Please check your internet connection."} (কানেকশন এরর: ইন্টারনেট কানেকশন চেক করুন)`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Gemini Error (Status: ${response.status})`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response stream reader couldn't be obtained. (স্ট্রিম রিডার পাওয়া যায়নি)");
    }

    const decoder = new TextDecoder();
    let fullResponse = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.replace('data: ', ''));
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullResponse += text;
              if (onToken) onToken(fullResponse);
            }
          } catch (e) {}
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    // Cache the response
    aiResponseCache.set(cacheKey, fullResponse);
    if (aiResponseCache.size > 50) {
      const firstKey = aiResponseCache.keys().next().value;
      if (firstKey) aiResponseCache.delete(firstKey);
    }

    return fullResponse;
  }
}

let lastSendTime = 0;

/**
 * Gemini Specific Chat Logic
 */
export const handleGeminiSendMessage = async (
  input: string,
  messages: ChatMessage[],
  setters: any,
  attachedNotes: Note[] = []
) => {
  const { 
    setIsLoading, setAiStatus, setAiReason, setMessages, 
    setStreamingMessage, setInput, loadHistory, loadNotes, loadTasks 
  } = setters;

  const now = Date.now();
  if (now - lastSendTime < 1000) return; // 1s debounce
  lastSendTime = now;

  if (!input.trim() && attachedNotes.length === 0) return;

  const userMessage: ChatMessage = { 
    role: 'user', 
    text: input, 
    timestamp: Date.now(),
    attachedNotes: attachedNotes.map(n => ({ id: n.id, title: n.title, emoji: n.emoji, content: n.content }))
  };
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
      systemPrompt: GEMINI_SYSTEM_PROMPT, // Always use the core prompt to ensure commands work
      history: messages,
      attachedNotes,
      onToken: (token) => setStreamingMessage(token)
    });

    const aiMessage: ChatMessage = { role: 'model', text: response, timestamp: Date.now() };
    setMessages((prev: ChatMessage[]) => [...prev, aiMessage]);
    await DataManager.saveChatMessage(aiMessage);
    try {
      await executeAICommands(response);
    } catch (cmdErr) {
      console.error('[Gemini] Command executor failed:', cmdErr);
    }
    setStreamingMessage(null);
    setAiStatus('idle');
  } catch (err: any) {
    setAiStatus('error');
    const errorMsg = err.message || 'Gemini Error';
    setAiReason(errorMsg);
    
    const errorChatMessage: ChatMessage = { 
      role: 'model', 
      text: `❌ Error: ${errorMsg}`, 
      timestamp: Date.now(),
      debugInfo: {
        fullPrompt: input,
        systemPrompt: '',
      }
    };
    setMessages((prev: ChatMessage[]) => [...prev, errorChatMessage]);
    await DataManager.saveChatMessage(errorChatMessage);
  } finally {
    setIsLoading(false);
    loadHistory(); loadNotes(); loadTasks();
  }
};
