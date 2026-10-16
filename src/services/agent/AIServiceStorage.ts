/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import { db } from '../storage/DexieDB';
import { ChatMessage, AITask, ContextSummary } from '../../types';

export const AIServiceStorage = {
  async getChatHistory(): Promise<ChatMessage[]> {
    return await db.chat_history.toArray();
  },

  async saveChatMessage(message: ChatMessage): Promise<void> {
    await db.chat_history.put(message);
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
      task = await db.ai_tasks.filter(t => t.title.toLowerCase() === taskId.toLowerCase()).first();
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
    const keep = Math.max(0, Math.floor(count));
    if (!Number.isFinite(keep)) return;
    await db.transaction('rw', db.chat_history, async () => {
      const excess = await db.chat_history.count() - keep;
      if (excess <= 0) return;
      const ids = await db.chat_history.orderBy(':id').limit(excess).primaryKeys();
      await db.chat_history.bulkDelete(ids);
    });
  }
};
