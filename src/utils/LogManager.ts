/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import localforage from 'localforage';

export interface AuditLog {
  timestamp: number;
  type: 'chat' | 'task' | 'error' | 'action';
  prompt?: string;
  response?: string;
  action?: string;
  error?: string;
  metadata?: any;
}

const LOGS_KEY = 'audit_logs_v2.3';

export class LogManager {
  static async addLog(log: Omit<AuditLog, 'timestamp'>) {
    const logs = await this.getLogs();
    const newLog: AuditLog = {
      ...log,
      timestamp: Date.now()
    };
    logs.push(newLog);
    // Keep only last 1000 logs to prevent storage issues
    if (logs.length > 1000) logs.shift();
    await localforage.setItem(LOGS_KEY, logs);
  }

  static async getLogs(): Promise<AuditLog[]> {
    return (await localforage.getItem<AuditLog[]>(LOGS_KEY)) || [];
  }

  static async clearLogs() {
    await localforage.removeItem(LOGS_KEY);
  }

  static async exportLogs() {
    const logs = await this.getLogs();
    
    let content = `RN AI 2.3 - DEEP AUDIT LOG & ANALYSIS\n`;
    content += `Exported: ${new Date().toLocaleString()}\n`;
    content += `Total Logs: ${logs.length}\n`;
    content += `${'='.repeat(80)}\n\n`;

    logs.forEach((log, index) => {
      const time = new Date(log.timestamp).toLocaleString();
      content += `[${index + 1}] [${time}] TYPE: ${log.type.toUpperCase()}\n`;
      
      if (log.prompt) {
        content += `PROMPT:\n${log.prompt}\n\n`;
      }
      
      if (log.response) {
        content += `RESPONSE:\n${log.response}\n\n`;
      }
      
      if (log.error) {
        content += `ERROR:\n${log.error}\n\n`;
      }
      
      if (log.action) {
        content += `ACTION: ${log.action}\n`;
      }
      
      if (log.metadata) {
        content += `METADATA: ${JSON.stringify(log.metadata)}\n`;
      }
      
      content += `${'-'.repeat(80)}\n\n`;
    });

    const blob = new Blob(["\ufeff", content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const exportFileDefaultName = `rn_ai_analysis_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = exportFileDefaultName;
    document.body.appendChild(linkElement);
    linkElement.click();
    
    setTimeout(() => {
      document.body.removeChild(linkElement);
      URL.revokeObjectURL(url);
    }, 100);
  }
}
