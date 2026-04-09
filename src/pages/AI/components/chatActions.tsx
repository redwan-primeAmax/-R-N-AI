/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager, AITask } from '../../../utils/DataManager';
import { aiManager } from '../../../services/AIService';

/**
 * Handles the logic for clearing chat history and associated tasks.
 */
export const deleteChatHistory = async (
  setMessages: (msgs: any[]) => void,
  setTasks: (tasks: AITask[]) => void,
  setContextSummary: (summary: any) => void,
  setShowClearConfirm: (show: boolean) => void
) => {
  try {
    await DataManager.clearChatHistory();
    aiManager.cancelTask('chat-main');
    
    // Also clear tasks
    const allTasks = await DataManager.getTasks();
    for (const task of allTasks) {
      await DataManager.deleteTask(task.id);
    }
    
    setMessages([]);
    setTasks([]);
    setContextSummary(null);
    setShowClearConfirm(false);
  } catch (error) {
    console.error('Failed to clear chat history:', error);
  }
};

/**
 * Resets the AI memory (context summary) without clearing history.
 */
export const resetAIMemory = async (
  setContextSummary: (summary: any) => void,
  setShowClearConfirm: (show: boolean) => void
) => {
  try {
    await DataManager.saveContextSummary({ text: "", timestamp: Date.now() });
    setContextSummary(null);
    setShowClearConfirm(false);
  } catch (error) {
    console.error('Failed to reset AI memory:', error);
  }
};
