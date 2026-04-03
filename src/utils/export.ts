/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatMessage } from './DataManager';

/**
 * Exports chat history in a compact JSON format for debugging.
 * Optimized for size by using short keys and removing extra whitespace.
 */
export const exportChatHistory = (messages: ChatMessage[]) => {
  if (!messages || messages.length === 0) return;

  const header = `AI CHAT EXPORT - ${new Date().toLocaleString()}\n${'='.repeat(60)}\n\n`;
  
  const formattedData = messages.map(msg => {
    const role = msg.role === 'user' ? 'USER' : 'AI';
    const time = new Date(msg.timestamp).toLocaleString();
    
    // Determine tag based on content
    let tags: string[] = [];
    if (msg.text.includes('/create_page')) tags.push("[PAGE_CREATE]");
    if (msg.text.includes('/update_page')) tags.push("[PAGE_UPDATE]");
    if (msg.text.includes('/create_task')) tags.push("[TASK_CREATE]");
    if (msg.text.includes('/update_task_status')) tags.push("[TASK_UPDATE]");
    if (msg.text.includes('/complete_part')) tags.push("[TASK_PART]");
    if (msg.text.includes('/prune_context')) tags.push("[CONTEXT_PRUNE]");
    if (msg.text.includes('/replace_content')) tags.push("[CONTENT_REPLACE]");
    if (msg.text.toLowerCase().includes('error')) tags.push("[ERROR]");
    
    const tagStr = tags.length > 0 ? ` ${tags.join(' ')}` : "";
    let output = `[${time}] ${role}${tagStr}:\n`;
    
    if (msg.role === 'model') {
      const commandRegex = /\/(create|update|complete|prune|verify|replace)_\w+\s+([^|]+)\|\s*([\s\S]+?)(?=\s*\/(?:create|update|complete|prune|verify|replace)_\w+|$)/gi;
      const commands: string[] = [];
      let match;
      
      const rawText = msg.text;
      while ((match = commandRegex.exec(rawText)) !== null) {
        commands.push(match[0].trim());
      }
      
      const textWithoutCommands = rawText.replace(/\/(create|update|complete|prune|verify|replace)_\w+\s+([^|]+)\|\s*([\s\S]+?)(?=\s*\/(?:create|update|complete|prune|verify|replace)_\w+|$)/gi, '').trim();
      
      if (commands.length > 0) {
        if (textWithoutCommands) {
          output += `MESSAGE:\n${textWithoutCommands}\n\n`;
        }
        output += `EXECUTED COMMANDS:\n${commands.map(c => `>>> ${c}`).join('\n\n')}\n`;
      } else {
        output += `${msg.text.trim()}\n`;
      }
    } else {
      output += `${msg.text.trim()}\n`;
    }
    
    return `${output}\n${'-'.repeat(60)}`;
  }).join('\n\n');

  const finalContent = header + formattedData;
  
  // Use UTF-8 BOM to ensure proper character encoding in Windows/Notepad
  const blob = new Blob(["\ufeff", finalContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  
  const hasError = messages.some(m => m.text.toLowerCase().includes('error') || m.text.toLowerCase().includes('sorry'));
  const fileName = hasError ? 'AI_Problem_Debug' : 'AI_Debug';
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.download = `${fileName}_${timestamp}.txt`;
  
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};
