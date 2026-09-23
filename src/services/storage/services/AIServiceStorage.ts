/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../DexieDB';
import { ChatMessage, AITask, ContextSummary } from '../../../types';

export const AIServiceStorage = {
  async getChatHistory(): Promise<ChatMessage[]> {
    return await db.chat_history.toArray();
  },

  async saveChatMessage(message: ChatMessage): Promise<void> {
    await db.chat_history.add(message);
  },

  async clearChatHistory(): Promise<void> {
    await db.chat_history.clear();
    await db.key_value_pairs.delete('context_summary');
  },

  async getTasks(): Promise<AITask[]> {
    return await db.ai_tasks.toArray();
  },

  async saveTask(task: AITask): Promise<void> {
    task.updatedAt = Date.now();
    if (!task.createdAt) task.createdAt = Date.now();
    await db.ai_tasks.put(task);
  },

  async deleteTask(id: string): Promise<void> {
    await db.ai_tasks.delete(id);
  },

  async updateTaskPartStatus(taskId: string, partTitle: string, status: 'pending' | 'completed'): Promise<void> {
    let task = await db.ai_tasks.get(taskId);
    if (!task) {
      task = await db.ai_tasks.where('title').equalsIgnoreCase(taskId).first();
    }

    if (task) {
      const partIndex = task.parts.findIndex(p => p.title.toLowerCase() === partTitle.toLowerCase());
      if (partIndex > -1) {
        task.parts[partIndex].status = status;
        const allDone = task.parts.every(p => p.status === 'completed');
        task.status = allDone ? 'completed' : 'in-progress';

        task.updatedAt = Date.now();
        await db.ai_tasks.put(task);
      }
    }
  },

  async getContextSummary(): Promise<ContextSummary | null> {
    const record = await db.key_value_pairs.get('context_summary');
    return record ? (record.value as ContextSummary) : null;
  },

  async saveContextSummary(summary: ContextSummary): Promise<void> {
    await db.key_value_pairs.put({ key: 'context_summary', value: summary });
  },

  async deleteOldMessages(count: number): Promise<void> {
    const all = await db.chat_history.toArray();
    if (all.length > count) {
      const toDeleteCount = all.length - count;
      const idsToDelete = all.slice(0, toDeleteCount).map(c => c.id).filter((id): id is number => id !== undefined);
      if (idsToDelete.length > 0) {
        await db.chat_history.bulkDelete(idsToDelete);
      }
    }
  }
};
