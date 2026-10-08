/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager, ChatMessage, Note } from '../storage/DataManager';
import { AIService, AIServiceOptions } from './AIService';
import { executeAICommands } from './AICommandExecutor';
import { AgentService } from './AgentService';

export const AGENTIC_SYSTEM_PROMPT = `You are the Redwan Agentic AI, a hyper-capable Content Architect and Productivity Engine, inspired by Notion AI.
Your mission is to help users create, refine, organize, and manage their knowledge base with absolute precision and creative flair.

CORE PHILOSOPHY:
- Be an elite partner in thought. Be concise when needed, detailed when requested.
- Multilingual Excellence: Native-level support for Bengali and English. Respond in the language the user uses.
- Beautiful Presentation: Always use rich Markdown and structured HTML for clarity.
- Grounding: ALWAYS base your summaries and analysis on the [Attached Notes Context] provided. DO NOT invent facts, meetings, or data that are not present in the attached context.
- FORMATTING: ALWAYS use standard Markdown (e.g., **bold**, # headings, - lists) for your conversational responses. Use canonical HTML blocks ONLY inside the <content> tags of XML commands. NEVER use raw HTML tags outside of XML tags.
- NO LITERAL TAGS: NEVER use literal XML tag names like "<create_page>" or "<content>" in your conversational chat. If you need to refer to these actions, use plain language like "Page Creation" or "the document editor". 

NOTION AI POWERS (MANDATORY CAPABILITIES):
1. **Writing Assistant**: Help users with 'Continue writing', 'Summarize', 'Fix spelling & grammar', 'Translate', and 'Change tone' (Professional, Casual, Straightforward, Confident, Friendly).
2. **Structural Architect**: Transform messy notes into structured documents using headings, callouts, task lists, and tables.
3. **Data Manager**: Use XML commands to interact with the workspace directly.

EDITOR CAPABILITIES (CANONICAL BLOCKS ONLY):
You MUST ONLY use these exact HTML structures within <content> tags. Do NOT invent new tags or styles.

1. **Text**: <p>Your text</p>
2. **Headings**: <h1>Title</h1>, <h2>Section</h2>, <h3>Subset</h3>
3. **Lists**: 
   - Bullet: <ul><li>Item</li></ul>
   - Numbered: <ol><li>Item</li></ol>
4. **Task List**: <ul class="task-list"><li class="task-item-modern" data-checked="false"><input type="checkbox"><label>Task description</label></li></ul>
5. **Callout**: <div class="callout" data-emoji="💡">Your message here</div>
6. **Blockquote**: <blockquote>Important quote or note</blockquote>
7. **Divider**: <hr>
8. **Code Block**: <pre><code class="language-javascript">// code here</code></pre>
9. **Tables**: <table><tr><td>Cell</td></tr></table>
10. **Toggles**: <div class="toggle-list" data-type="toggle" data-expanded="false">Summary Text</div>
11. **Page Link**: <div class="page-link-block" data-type="page_link" data-subpageid="TARGET_PAGE_ID">Display Text</div>
12. **Media**: <div class="media-block" data-type="media" data-url="URL" data-media-type="image"></div>

STYLING RULES:
- Inline styles are ALLOWED on <span> or <p>: color, background-color, font-weight, font-style.
- Example: <span style="color: #ef4444">Important</span>
- NO custom CSS classes outside of the ones listed above.
- NO <button>, <script>, <iframe>, or other interactive elements.

XML COMMANDS (MANDATORY USAGE):
- Use <create_page> for ANY substantial new document, including outlines, drafts, reports, guides, or articles.
- Use <update_page> or <replace_content> for modifying existing notes.
- Use <search_workspace><query>Query</query></search_workspace> to find notes across the entire workspace (up to 10,000 notes). This searches titles, content, user tags, and SECRET AI TAGS.
- Use <list_notes><filter>recent|today|yesterday|hours</filter><value>OptionalNumber</value></list_notes> to get IDs and titles of notes in a specific time range.
- Use <rag_query><query>Query</query></rag_query> for Retrieval-Augmented Generation. This will search and bring relevant context automatically.
- Use <suggest_tags><id>NoteID</id><tags><tag>Tag1</tag><tag>tag2</tag></tags></suggest_tags> when the user asks for tag suggestions. Do NOT add tags directly; suggest them so the user can click.

SECRET AI TAGS:
Every note has hidden "AI Tags" that you generated in the background. You can use these tags via <search_workspace> to find meeting notes, project specs, or personal drafts even if the user didn't tag them explicitly.

CONVERSATIONAL SILENCE (STRICT):
When you use ANY XML command to create or edit content, you MUST NOT repeat that content in your normal chat response. Your chat response should ONLY contain a short confirmation like "আমি আউটলাইনটি দিয়ে একটি নতুন পেজ তৈরি করেছি।" or "নোটটি আপডেট করা হয়েছে।". 
NEVER provide the content twice (once in XML and once in chat). If it goes in a page, it stays in the page.
For very short answers, simple translations, or brief explanations that don't need a page, use plain text in chat.

<create_page>
  <title>Title</title>
  <emoji>🚀</emoji>
  <content>HTML Content</content>
</create_page>

<update_page>
  <id>ExistingID</id>
  <title>Optional New Title</title>
  <content>Full New Content</content>
</update_page>

<delete_page>
  <id>PageID</id>
</delete_page>

<replace_content>
  <id>ID</id>
  <search>Text to find</search>
  <replacement>New Text to insert</replacement>
</replace_content>

<search_workspace>Your query</search_workspace>
<list_notes>
  <filter>today</filter>
</list_notes>

<rag_query>Specific question or query</rag_query>

<suggest_tags>
  <id>PageID</id>
  <tags>
    <tag>meeting</tag>
    <tag>important</tag>
  </tags>
</suggest_tags>

CONTEXT AWARENESS:
Attached notes are provided with [PAGE ID: ...]. ALWAYS use these IDs for 'update_page', 'delete_page', or 'replace_content' when the user asks to modify a specific note.

End every message with [COMPLETION: 100%].`;

const aiResponseCache = new Map<string, string>();

export class AgenticAIService extends AIService {
  name = 'agentic';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { settings, onToken, systemPrompt, history = [], attachedNotes = [] } = options;
    const finalSystemPrompt = systemPrompt || AGENTIC_SYSTEM_PROMPT;
    const provider = settings.selectedProvider;
    const model = settings.selectedModels[provider] || (provider === 'gemini' ? 'gemini-flash-latest' : '');
    const userApiKey = settings.apiKeys[provider];

    const cacheKey = `${provider}:${model}:${prompt}:${history.length}:${attachedNotes.length}`;
    if (aiResponseCache.has(cacheKey) && !onToken) {
      return aiResponseCache.get(cacheKey)!;
    }

    const contents: any[] = [];
    
    // Process History
    if (history && history.length > 0) {
      history.forEach((msg) => {
        const role = msg.role === 'user' ? 'user' : 'model';
        let historicalText = msg.text;
        if (msg.attachedNotes && msg.attachedNotes.length > 0) {
          const notesContext = msg.attachedNotes.map(n => `[Attached Note ID: ${n.id}, Title: "${n.title}"]\n${n.content}`).join('\n\n');
          historicalText = `Context from attached notes:\n${notesContext}\n\nUser Message:\n${msg.text}`;
        }
        contents.push({ role, parts: [{ text: historicalText }] });
      });
    }

    // Process Current Prompt
    let finalPrompt = prompt;
    if (attachedNotes && attachedNotes.length > 0) {
      const notesContext = attachedNotes.map(n => `[PAGE ID: ${n.id}]\nTitle: "${n.title}"\nContent:\n${n.content}`).join('\n\n---\n\n');
      finalPrompt = `Attached Notes Context:\n${notesContext}\n\nUser Message:\n${prompt}`;
    }
    contents.push({ role: 'user', parts: [{ text: finalPrompt }] });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      let response;
      const apiPath = `/api/ai/${provider}`;
      
      // Always route through server proxy for security and reliability
      response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          contents,
          systemInstruction: { parts: [{ text: finalSystemPrompt }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 16384 },
          apiKey: userApiKey // Safely forward key to proxy
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `AI Error (Status: ${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream reader");

      const decoder = new TextDecoder();
      let fullResponse = "";
      let streamBuffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Critical: Use { stream: true } to handle multi-byte characters split across chunks
          streamBuffer += decoder.decode(value, { stream: true });
          
          const lines = streamBuffer.split('\n');
          // Keep the last (potentially partial) line in the buffer
          streamBuffer = lines.pop() || "";

          for (const line of lines) {
            const dataLine = line.trim();
            if (!dataLine || !dataLine.startsWith('data: ')) continue;

            if (provider === 'gemini') {
              try {
                const jsonStr = dataLine.replace('data: ', '').trim();
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  fullResponse += text;
                  if (onToken) onToken(fullResponse);
                }
              } catch (e) {}
            } else {
              // For OpenRouter/OpenAI compatible streaming
              const data = dataLine.replace('data: ', '').trim();
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const text = parsed.choices?.[0]?.delta?.content || '';
                if (text) {
                  fullResponse += text;
                  if (onToken) onToken(fullResponse);
                }
              } catch (e) {}
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      aiResponseCache.set(cacheKey, fullResponse);
      return fullResponse;

    } catch (err: any) {
      if (err.name === 'AbortError') throw new Error("Request Timeout");
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

let lastSendTime = 0;

export const handleAgenticSendMessage = async (
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
  if (now - lastSendTime < 1000) return;
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
    const service = new AgenticAIService();

    const response = await service.sendMessage(input, {
      settings,
      systemPrompt: AGENTIC_SYSTEM_PROMPT,
      history: messages,
      attachedNotes,
      onToken: (token) => setStreamingMessage(token)
    });

    const aiMessage: ChatMessage = { 
      role: 'model', 
      text: response, 
      timestamp: Date.now(),
      commandStatus: /<(create_page|update_page|replace_content|suggest_tags|delete_page|search_workspace|list_notes|rag_query)/i.test(response) ? 'executing' : undefined 
    };
    
    try {
      if (aiMessage.commandStatus === 'executing') {
        setAiStatus('updating');
        const results = await executeAICommands(response);
        
        // Handle feedback loop for info-gathering commands
        const feedbackRequired = results.some(r => ['search_results', 'list_results'].includes(r.type)) || response.includes('<rag_query>');
        
        if (feedbackRequired) {
          let feedbackText = "Here are the results of your commands:\n";
          
          for (const res of results) {
            if (res.type === 'search_results') {
              feedbackText += `Search results for "${res.query}":\n${res.notes.map((n: any) => `- ID: ${n.id}, Title: "${n.title}", AI Tags: ${n.aiTags?.join(', ')}`).join('\n')}\n`;
            } else if (res.type === 'list_results') {
              feedbackText += `Notes list for filter "${res.filter}":\n${res.notes.map((n: any) => `- ID: ${n.id}, Title: "${n.title}", Updated: ${new Date(n.updatedAt).toLocaleString()}`).join('\n')}\n`;
            }
          }

          // Special RAG handling
          const ragRegex = /<rag_query>([\s\S]*?)<\/rag_query>/i;
          const ragMatch = ragRegex.exec(response);
          if (ragMatch) {
            const ragQuery = ragMatch[1].trim();
            const relevantNotes = await AgentService.searchWorkspace(ragQuery);
            const context = relevantNotes.slice(0, 3).map(n => `[Note ID: ${n.id}, Title: ${n.title}]\n${n.content}`).join('\n\n---\n\n');
            feedbackText += `\nRelevant context found for RAG Query "${ragQuery}":\n${context}\n`;
          }

          feedbackText += "\nPlease provide your final response to the user based on this information. Remember to stay in character and use Markdown.";

          // Call AI again with feedback
          const finalResponse = await service.sendMessage(feedbackText, {
            settings,
            systemPrompt: AGENTIC_SYSTEM_PROMPT,
            history: [...messages, userMessage, { role: 'model', text: response, timestamp: Date.now() }],
            onToken: (token) => setStreamingMessage(token)
          });

          aiMessage.text = finalResponse;
          // Execute any new commands in final response (optional, usually confirm/create)
          await executeAICommands(finalResponse);
        }

        // Update message to executed
        aiMessage.commandStatus = 'executed';
      }
    } catch (cmdErr) {
      console.error('[Agentic] Command execution failed:', cmdErr);
    }

    setMessages((prev: ChatMessage[]) => [...prev, aiMessage]);
    await DataManager.saveChatMessage(aiMessage);
    
    setStreamingMessage(null);
    setAiStatus('idle');
  } catch (err: any) {
    setAiStatus('error');
    const errorMsg = err.message || 'AI Error';
    setAiReason(errorMsg);
    
    const errorChatMessage: ChatMessage = { 
      role: 'model', 
      text: `❌ Error: ${errorMsg}`, 
      timestamp: Date.now()
    };
    setMessages((prev: ChatMessage[]) => [...prev, errorChatMessage]);
    await DataManager.saveChatMessage(errorChatMessage);
  } finally {
    setIsLoading(false);
    loadHistory(); loadNotes(); loadTasks();
  }
};
