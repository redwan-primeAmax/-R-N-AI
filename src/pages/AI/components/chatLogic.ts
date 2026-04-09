/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager, ChatMessage, Note, AITask, ContextSummary } from '../../../utils/DataManager';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { AIServiceFactory } from '../services/serviceFactory';

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
  loadHistory: () => void,
  attachedNotes: Note[] = []
) => {
  if (!input.trim() && attachedNotes.length === 0) return;

  // Ambiguity Check
  if (input.trim().length > 0 && input.trim().length < 2) {
    const botMessage: ChatMessage = {
      role: 'model',
      text: "আপনার ইনপুটটি অস্পষ্ট। আপনি কি বলতে চাচ্ছেন তা দয়া করে বিস্তারিত লিখুন।",
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, { role: 'user', text: input, timestamp: Date.now() }, botMessage]);
    setInput('');
    await DataManager.saveChatMessage({ role: 'user', text: input, timestamp: Date.now() });
    await DataManager.saveChatMessage(botMessage);
    return;
  }

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
  
  // Context Pruning
  const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  const currentNote = sortedNotes[0];
  const mentionedNotes = notes.filter(n => 
    input.includes(`[${n.title}]`) || 
    input.toLowerCase().includes(n.title.toLowerCase())
  );
  
  // Combine mentioned notes and explicitly attached notes with uniqueness check
  const allRelevantNotes = [
    ...(attachedNotes || []),
    ...mentionedNotes,
    currentNote
  ].filter((note, index, self) => 
    note && self.findIndex(n => n?.id === note.id) === index
  ) as Note[];

  console.log('chatLogic: allRelevantNotes', allRelevantNotes.map(n => n.title));
  
  const context = allRelevantNotes.map(n => {
    const markdownContent = n.content ? turndownService.turndown(n.content) : "(No content)";
    return `Page: ${n.title} | ID: ${n.id}\nContent:\n${markdownContent}`;
  }).join('\n\n---\n\n');
  const otherPages = notes
    .filter(n => !allRelevantNotes.some(rn => rn.id === n.id))
    .map(n => `- ${n.title} (ID: ${n.id})`)
    .join('\n');

  const historyLimit = 5;
  const recentHistory = messages.slice(-historyLimit).map(m => 
    `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`
  ).join('\n');

  // Chat vs Task Logic
  const isTaskRequest = /লিখ|তৈরি কর|ডিজাইন|ফরম্যাট|সাজাও|পরিবর্তন|সংশোধন|create|write|generate|paragraph|essay|code|list|translate|অনুবাদ|design|format|style|modify|update/i.test(input);
  const modeInstruction = isTaskRequest 
    ? "\nMODE: TASK. You are performing a specific task. You MUST use <create_task> to track progress and <create_page> or <update_page> to store the result. Use proper Markdown with NEW LINES for lists. DO NOT give extra conversational filler."
    : "\nMODE: CHAT. You are just chatting. DO NOT create tasks or pages unless explicitly asked. Reply with plain Markdown. Keep it brief.";

  const autoCreateInstruction = settings.autoCreatePage 
    ? "\nCRITICAL: Automatically create or update a page for this request if it involves content creation."
    : "";

  const prompt = `${systemPrompt}${modeInstruction}${autoCreateInstruction}\n\n${contextSummary ? `Previous Context Summary: ${contextSummary.text}\n` : ''}Relevant Pages:\n${context}\n\nOther Available Pages:\n${otherPages}\n\nRecent Chat History:\n${recentHistory}\n\nUser: <user_data>${input}</user_data>`;

  console.log('chatLogic: Final Prompt Length:', prompt.length);
  console.log('chatLogic: Context Section:', context);

  const debugInfo = {
    fullPrompt: prompt,
    systemPrompt: systemPrompt,
    mentionedPages: allRelevantNotes.map(n => ({ id: n.id, title: n.title, content: n.content }))
  };

  const sendToAI = async (currentPrompt: string, forceFree = false) => {
    const provider = forceFree ? 'picoapps' : selectedProvider;
    const service = AIServiceFactory.getService(provider);
    
    return await service.sendMessage(currentPrompt, {
      settings,
      systemPrompt,
      onToken: (token) => {
        setStreamingMessage(token);
      }
    });
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
      timestamp: botMessageId,
      debugInfo
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
          1. Count every single unique item (e.g., language translation) provided in the AI's commands (<create_page> or <update_page>).
          2. ABSOLUTE COMPLETION: If the user asked for 100 and you count 34, the completion is 34%. Be extremely strict.
          3. NO LAZINESS: Look for laziness markers like "...", "more to come", "rest of the list", or "97 more items". If found, the completion is automatically below 10%.
          4. CONTINUATION PROMPT: If not 100%, generate a specific instruction for the AI to continue exactly from where it left off.
          
          OUTPUT FORMAT:
          [COUNT: N]
          [REAL_COMPLETION: X%]
          [REASON: Detailed reason why it is not 100%]
          [CONTINUATION_PROMPT: The instruction for the next turn]
        `;
        
        const verificationText = await sendToAI(verifierPrompt, useFreeForChecking);
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
            2. You MUST use <update_page> and include the ENTIRE list (previous ${count} items + the new ones). 
            3. Use proper Markdown formatting. For lists, use a NEW LINE for each item.
            4. DO NOT truncate. DO NOT say "more to come".
          `;
          
          const followUpResponse = await sendToAI(`${currentPrompt}\n\nAI CUMULATIVE: ${accumulatedResponse}\n\nUser: ${followUpPrompt}`);
          
          const followUpBotMessage: ChatMessage = {
            role: 'model',
            text: followUpResponse,
            timestamp: Date.now(),
            debugInfo: {
              ...debugInfo,
              fullPrompt: `${currentPrompt}\n\nAI CUMULATIVE: ${accumulatedResponse}\n\nUser: ${followUpPrompt}`
            }
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
