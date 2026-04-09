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
import { aiManager } from '../../../services/AIService';

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

  const userMessage: ChatMessage = {
    role: 'user',
    text: input,
    timestamp: Date.now()
  };

  setMessages(prev => [...prev, userMessage]);
  setInput('');
  await DataManager.saveChatMessage(userMessage);

  const taskId = 'chat-main';
  
  // Subscribe to updates
  const unsubscribe = aiManager.subscribe((tasks) => {
    const task = tasks.get(taskId);
    if (task) {
      setAiStatus(task.status as any);
      setAiReason(task.reason);
      setStreamingMessage(task.streamingText);
      if (task.status === 'idle') {
        loadHistory();
        loadNotes();
        loadTasks();
        setIsLoading(false);
      }
      if (task.status === 'error') {
        setIsLoading(false);
      }
    }
  });

  setIsLoading(true);
  
  // Start the task in background
  aiManager.runChatTask(
    taskId,
    input,
    messages,
    systemPrompt,
    contextSummary,
    notes,
    attachedNotes
  );

  return unsubscribe;
};
