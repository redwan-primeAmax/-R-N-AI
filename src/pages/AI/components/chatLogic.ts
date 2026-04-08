/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager, ChatMessage, Note, AITask, ContextSummary } from '../../../utils/DataManager';
import { marked } from 'marked';
import TurndownService from 'turndown';

const turndownService = new TurndownService();

console.log('chatLogic: File loaded');

/**
 * Handles the logic for sending messages and processing AI responses.
 */
export const handleSendMessage = async (
  input: string,
  messages: ChatMessage[],
  systemPrompt: string,
  contextSummary: ContextSummary | null,
  notes: Note[],
  setIsLoading: (loading: boolean) => void,
  setAiStatus: (status: 'idle' | 'generating' | 'checking' | 'updating') => void,
  setAiReason: (reason: string | null) => void,
  setCompletionPercentage: (percentage: number | null) => void,
  setMessages: (msgs: (prev: ChatMessage[]) => ChatMessage[]) => void,
  setStreamingMessage: (msg: string | null) => void,
  setInput: (val: string) => void,
  loadNotes: () => void,
  loadTasks: () => void,
  loadContextSummary: () => void,
  loadHistory: () => void
) => {
  if (!input.trim()) return;

  const userMessage: ChatMessage = {
    role: 'user',
    text: input,
    timestamp: Date.now()
  };

  setMessages(prev => [...prev, userMessage]);
  setInput('');
  setIsLoading(true);
  setAiStatus('generating');
  setAiReason(null);
  setCompletionPercentage(null);

  await DataManager.saveChatMessage(userMessage);

  const settings = await DataManager.getAISettings();
  const selectedProvider = settings.selectedProvider || 'picoapps';
  const selectedModels = settings.selectedModels || { chatgpt: 'gpt-4o', claude: 'claude-3-5-sonnet-20241022', gemini: 'gemini-3-flash-preview', openrouter: '' };
  const apiKeys = settings.apiKeys || {};

  // Context Pruning: Only include the most recently updated note and any mentioned notes
  // Plus the last 5 chat messages for immediate context
  const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  const currentNote = sortedNotes[0]; // Most recent note as "current"
  
  // Find mentioned notes in the input
  const mentionedNotes = notes.filter(n => 
    input.includes(`[${n.title}]`) || 
    input.toLowerCase().includes(n.title.toLowerCase())
  );

  const relevantNotes = Array.from(new Set([currentNote, ...mentionedNotes])).filter(Boolean);
  
  const context = relevantNotes.map(n => `Page: ${n.title} | ID: ${n.id}\nContent:\n${turndownService.turndown(n.content)}`).join('\n\n---\n\n');
  
  // Also provide a list of other page titles for reference without content
  const otherPages = notes
    .filter(n => !relevantNotes.some(rn => rn.id === n.id))
    .map(n => `- ${n.title} (ID: ${n.id})`)
    .join('\n');

  const historyLimit = 5; // Reduced history for performance on low-end devices
  const recentHistory = messages.slice(-historyLimit).map(m => 
    `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`
  ).join('\n');

  const autoCreateInstruction = settings.autoCreatePage 
    ? "\nCRITICAL: You MUST automatically create or update a page for EVERY request, even if the user doesn't explicitly ask for it. Use <create_page> or <update_page> XML blocks."
    : "\nNOTE: Only create or update pages if the user explicitly asks for it. Otherwise, reply with plain Markdown.";

  const prompt = `${systemPrompt}${autoCreateInstruction}\n\n${contextSummary ? `Previous Context Summary: ${contextSummary.text}\n` : ''}Relevant Pages:\n${context}\n\nOther Available Pages:\n${otherPages}\n\nRecent Chat History:\n${recentHistory}\n\nUser: <user_data>${input}</user_data>`;

  const sendToAI = async (currentPrompt: string, retries = 3, forceFree = false) => {
    const effectiveProvider = forceFree ? 'picoapps' : selectedProvider;
    
    const executeAIRequest = async () => {
      const corsProxy = settings.corsProxy || '';
      const getUrl = (url: string) => corsProxy ? `${corsProxy}${url}` : url;

      if (effectiveProvider === 'picoapps') {
        return new Promise<string>((resolve, reject) => {
          const attempt = (remainingRetries: number) => {
            const websocket = new WebSocket('wss://backend.buildpicoapps.com/ask_ai_streaming_v2');
            let fullResponse = "";

            websocket.addEventListener("open", () => {
              websocket.send(JSON.stringify({ 
                appId: "appear-major",
                prompt: currentPrompt 
              }));
            });

            websocket.addEventListener("message", (event) => {
              fullResponse += event.data;
              setStreamingMessage(fullResponse);
            });

            const connectionTimeout = setTimeout(() => {
              if (websocket.readyState !== WebSocket.OPEN) {
                websocket.close();
                if (remainingRetries > 0) {
                  console.warn(`WebSocket timeout, retrying... (${remainingRetries} left)`);
                  attempt(remainingRetries - 1);
                } else {
                  reject(new Error("Connection timeout after multiple attempts"));
                }
              }
            }, 20000);

            websocket.addEventListener("close", async (event) => {
              clearTimeout(connectionTimeout);
              if (event.code !== 1000) {
                if (remainingRetries > 0) {
                  console.warn(`WebSocket closed unexpectedly (code: ${event.code}), retrying... (${remainingRetries} left)`);
                  setTimeout(() => attempt(remainingRetries - 1), 1000);
                } else {
                  reject(new Error(`WebSocket closed unexpectedly (code: ${event.code})`));
                }
              } else {
                resolve(fullResponse);
              }
            });

            websocket.addEventListener("error", () => {
              if (remainingRetries > 0) {
                console.warn(`WebSocket error, retrying... (${remainingRetries} left)`);
                setTimeout(() => attempt(remainingRetries - 1), 1000);
              } else {
                reject(new Error("WebSocket error"));
              }
            });
          };

          attempt(retries);
        });
      } else if (effectiveProvider === 'chatgpt' || effectiveProvider === 'openrouter') {
        const isOpenRouter = effectiveProvider === 'openrouter';
        const apiKey = isOpenRouter ? apiKeys.openrouter : apiKeys.chatgpt;
        const baseUrl = isOpenRouter ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
        
        if (!apiKey) throw new Error(`${isOpenRouter ? 'OpenRouter' : 'ChatGPT'} API Key is missing. Please add it in AI Settings.`);
        const model = isOpenRouter ? selectedModels.openrouter : selectedModels.chatgpt;

        const response = await fetch(getUrl(`${baseUrl}/chat/completions`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...(isOpenRouter ? {
              'HTTP-Referer': window.location.origin,
              'X-Title': 'Redwan AI Assistant'
            } : {})
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: currentPrompt }
            ],
            stream: true
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || `${effectiveProvider.toUpperCase()} API Error`);
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
            const message = line.replace(/^data: /, '');
            if (message === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(message);
              const content = parsed.choices[0].delta.content;
              if (content) {
                fullResponse += content;
                setStreamingMessage(fullResponse);
              }
            } catch (e) {}
          }
        }
        return fullResponse;
      } else if (effectiveProvider === 'claude') {
        const apiKey = apiKeys.claude;
        if (!apiKey) throw new Error("Claude API Key is missing. Please add it in AI Settings.");
        const model = selectedModels.claude;

        const response = await fetch(getUrl('https://api.anthropic.com/v1/messages'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: currentPrompt }],
            stream: true
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || "Claude API Error");
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
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  fullResponse += parsed.delta.text;
                  setStreamingMessage(fullResponse);
                }
              } catch (e) {}
            }
          }
        }
        return fullResponse;
      } else if (effectiveProvider === 'gemini') {
        const apiKey = apiKeys.gemini;
        if (!apiKey) throw new Error("Gemini API Key is missing. Please add it in AI Settings.");
        const model = selectedModels.gemini;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: currentPrompt }] }],
            system_instruction: { parts: [{ text: systemPrompt }] }
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
                  setStreamingMessage(fullResponse);
                }
              } catch (e) {}
            }
          }
        }
        return fullResponse;
      }
      return "";
    };

    // Implement Retry Logic
    let lastError: any = null;
    let attemptCount = 0;
    const maxAttempts = settings.retrySettings?.enabled ? 5 : 1;
    const retryErrorCodes = settings.retrySettings?.errorCodes?.split(',').map(c => c.trim()).filter(c => c) || [];

    while (attemptCount < maxAttempts) {
      try {
        return await executeAIRequest();
      } catch (error: any) {
        lastError = error;
        attemptCount++;
        
        const errorMessage = error.message || String(error);
        const shouldRetry = settings.retrySettings?.enabled && retryErrorCodes.some(code => errorMessage.includes(code));
        
        if (shouldRetry && attemptCount < maxAttempts) {
          console.warn(`AI Request failed with specific error, retrying... (Attempt ${attemptCount + 1}/${maxAttempts})`);
          await new Promise(r => setTimeout(r, 2000)); // Wait before retry
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  const processCommands = async (text: string) => {
    const extractTag = (tag: string, source: string) => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi');
      const matches = [];
      let match;
      while ((match = regex.exec(source)) !== null) {
        matches.push(match[1].trim());
      }
      return matches;
    };

    const extractNestedTag = (tag: string, source: string) => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = regex.exec(source);
      return match ? match[1].trim() : '';
    };

    // Create Page
    const createPages = extractTag('create_page', text);
    for (const pageXml of createPages) {
      const title = extractNestedTag('title', pageXml);
      const rawId = extractNestedTag('id', pageXml);
      const uniqueId = rawId.replace(/[^a-z0-9-_]/gi, '_');
      let markdownContent = extractNestedTag('content', pageXml);
      
      const htmlContent = marked.parse(markdownContent) as string;
      
      const finalTitle = await DataManager.checkDuplicateTitle(title);
      const newNote: Note = {
        id: uniqueId,
        title: finalTitle,
        content: htmlContent,
        emoji: '📄',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false
      };
      await DataManager.saveNote(newNote);
    }

    // Update Page
    const updatePages = extractTag('update_page', text);
    for (const pageXml of updatePages) {
      const idOrTitle = extractNestedTag('id', pageXml);
      const sanitizedId = idOrTitle.replace(/[^a-z0-9-_]/gi, '_');
      let newMarkdownContent = extractNestedTag('content', pageXml);

      const htmlContent = marked.parse(newMarkdownContent) as string;

      const currentNotes = await DataManager.getAllNotes();
      const existingNote = currentNotes.find(n => 
        n.id === sanitizedId || 
        n.id === idOrTitle ||
        n.title.toLowerCase() === idOrTitle.toLowerCase()
      );
      if (existingNote) {
        existingNote.content = htmlContent;
        existingNote.updatedAt = Date.now();
        await DataManager.saveNote(existingNote);
      }
    }

    // Create Task
    const createTasks = extractTag('create_task', text);
    for (const taskXml of createTasks) {
      const title = extractNestedTag('title', taskXml);
      const description = extractNestedTag('description', taskXml);
      const partsXml = extractNestedTag('parts', taskXml);
      const partTitles = extractTag('part', partsXml);
      
      const parts = partTitles.map(p => ({
        id: crypto.randomUUID(),
        title: p,
        status: 'pending' as const
      }));
      
      const newTask: AITask = {
        id: crypto.randomUUID(),
        title,
        description,
        status: 'in-progress',
        parts,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await DataManager.saveTask(newTask);
    }

    // Update Task Status
    const updateStatuses = extractTag('update_task_status', text);
    for (const statusXml of updateStatuses) {
      const taskId = extractNestedTag('id', statusXml);
      const status = extractNestedTag('status', statusXml) as any;
      const allTasks = await DataManager.getTasks();
      const task = allTasks.find(t => t.id === taskId || t.title.toLowerCase() === taskId.toLowerCase());
      if (task) {
        task.status = status;
        await DataManager.saveTask(task);
      }
    }

    // Complete Part
    const completeParts = extractTag('complete_part', text);
    for (const partXml of completeParts) {
      const taskId = extractNestedTag('id', partXml);
      const partId = extractNestedTag('part_id', partXml);
      const result = extractNestedTag('result', partXml);
      const allTasks = await DataManager.getTasks();
      const task = allTasks.find(t => t.id === taskId || t.title.toLowerCase() === taskId.toLowerCase());
      if (task) {
        const part = task.parts.find(p => p.id === partId || p.title.toLowerCase() === partId.toLowerCase());
        if (part) {
          part.status = 'completed';
          part.result = result;
          await DataManager.saveTask(task);
        }
      }
    }

    // Prune Context
    const pruneContexts = extractTag('prune_context', text);
    for (const pruneXml of pruneContexts) {
      const summary = extractNestedTag('summary', pruneXml);
      const count = parseInt(extractNestedTag('count', pruneXml));
      if (!isNaN(count)) {
        await DataManager.saveContextSummary({ text: summary, timestamp: Date.now() });
        await DataManager.deleteOldMessages(count);
      }
    }

    // Replace Content
    const replaceContents = extractTag('replace_content', text);
    for (const replaceXml of replaceContents) {
      const idOrTitle = extractNestedTag('id', replaceXml);
      const search = extractNestedTag('search', replaceXml);
      const replacement = extractNestedTag('replacement', replaceXml);
      await DataManager.replaceContent(idOrTitle, search, replacement);
    }

    loadNotes();
    loadTasks();
    loadContextSummary();
    loadHistory();
  };

  try {
    const fullResponse = await sendToAI(prompt);
    
    const botMessageId = Date.now();
    const finalBotMessage: ChatMessage = {
      role: 'model',
      text: fullResponse,
      timestamp: botMessageId
    };
    
    setMessages(prev => [...prev, finalBotMessage]);
    setStreamingMessage(null);
    await DataManager.saveChatMessage(finalBotMessage);
    await processCommands(fullResponse);

    // Initial Verification Step (Real AI Check)
    if (settings.dataCheckingEnabled) {
      setAiStatus('checking');
      setAiReason(null); // Hide reason during checking
      
      let accumulatedResponse = fullResponse;
      let currentPrompt = prompt;
      let loopCount = 0;
      const maxLoops = 6; 
      const useFreeForChecking = settings.dataCheckingModel === 'free';
      let continuationInstruction = "";

      while (loopCount < maxLoops) {
        const verifierPrompt = `
          USER REQUEST: "${input}"
          AI CUMULATIVE OUTPUT: "${accumulatedResponse}"
          
          TASK: 
          1. Count every single unique item (e.g., language translation) provided in the AI's commands (/create_page or /update_page).
          2. ABSOLUTE COMPLETION: If the user asked for 100 and you count 34, the completion is 34%. Be extremely strict.
          3. NO LAZINESS: Look for laziness markers like "...", "more to come", "rest of the list", or "97 more items". If found, the completion is automatically below 10%.
          4. CONTINUATION PROMPT: If not 100%, generate a specific instruction for the AI to continue exactly from where it left off.
          
          OUTPUT FORMAT:
          [COUNT: N]
          [REAL_COMPLETION: X%]
          [REASON: Detailed reason why it is not 100%]
          [CONTINUATION_PROMPT: The instruction for the next turn]
        `;
        
        const verificationText = await sendToAI(verifierPrompt, 3, useFreeForChecking);
        const countMatch = verificationText.match(/\[COUNT:\s*(\d+)\]/i);
        const realMatch = verificationText.match(/\[REAL_COMPLETION:\s*(\d+)%\]/i);
        const reasonMatch = verificationText.match(/\[REASON:\s*([^\]]+)\]/i);
        const contMatch = verificationText.match(/\[CONTINUATION_PROMPT:\s*([\s\S]+?)\]/i);
        
        const count = countMatch ? parseInt(countMatch[1]) : 0;
        const realPercentage = realMatch ? parseInt(realMatch[1]) : 100;
        const reason = reasonMatch ? reasonMatch[1] : "Incomplete work";
        continuationInstruction = contMatch ? contMatch[1] : `Continue from item #${count + 1}.`;
        
        if (realPercentage < 100) {
          setAiStatus('updating');
          setCompletionPercentage(realPercentage);
          await new Promise(r => setTimeout(r, 1000));

          const followUpPrompt = `
            CRITICAL ERROR: Verification failed. I counted only ${count} items out of the requested amount.
            Completion: ${realPercentage}%. Reason: ${reason}
            
            INSTRUCTION:
            ${continuationInstruction}
            
            RULES:
            1. You MUST provide at least 30-40 more items in this turn.
            2. You MUST use /update_page and include the ENTIRE list (previous ${count} items + the new ones). 
            3. DO NOT truncate. DO NOT say "more to come".
          `;
          
          const followUpResponse = await sendToAI(`${currentPrompt}\n\nAI CUMULATIVE: ${accumulatedResponse}\n\nUser: ${followUpPrompt}`);
          
          const followUpBotMessage: ChatMessage = {
            role: 'model',
            text: followUpResponse,
            timestamp: Date.now()
          };
          
          setMessages(prev => [...prev, followUpBotMessage]);
          await DataManager.saveChatMessage(followUpBotMessage);
          await processCommands(followUpResponse);
          
          accumulatedResponse += "\n" + followUpResponse;
          setAiStatus('checking');
          loopCount++;
        } else {
          setCompletionPercentage(100);
          break;
        }
      }
    }

    setAiStatus('idle');
    setIsLoading(false);

  } catch (error: any) {
    console.error("AI Error:", error);
    setIsLoading(false);
    setAiStatus('idle');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    setMessages(prev => [...prev, {
      role: 'model',
      text: `Error: ${errorMessage}`,
      timestamp: Date.now(),
    }]);
  }
};
