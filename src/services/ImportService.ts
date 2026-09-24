/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { htmlToBlocks, EditorBlock } from '../utils/blockParser';
import { DataManager } from './storage/DataManager';

export class ImportService {
  static async importMarkdown(mdContent: string, title?: string): Promise<string> {
    const rawHtml = await marked.parse(mdContent);
    const cleanHtml = DOMPurify.sanitize(rawHtml);

    const note = await DataManager.createNote();
    note.title = title || 'ইম্পোর্টকৃত নোট (Markdown)';
    note.content = cleanHtml;
    note.emoji = '📝';
    await DataManager.saveNote(note);

    return note.id;
  }

  static async importHtml(htmlContent: string, title?: string): Promise<string> {
    const cleanHtml = DOMPurify.sanitize(htmlContent);
    const note = await DataManager.createNote();
    note.title = title || 'ইম্পোর্টকৃত নোট (HTML)';
    note.content = cleanHtml;
    note.emoji = '🌐';
    await DataManager.saveNote(note);

    return note.id;
  }

  static async importTxt(txtContent: string, title?: string): Promise<string> {
    const paragraphs = txtContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const htmlContent = paragraphs.map(p => `<p>${p.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('');

    const note = await DataManager.createNote();
    note.title = title || 'ইম্পোর্টকৃত নোট (Text)';
    note.content = htmlContent;
    note.emoji = '📄';
    await DataManager.saveNote(note);

    return note.id;
  }

  static async importCsv(csvContent: string, title?: string): Promise<string> {
    const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) throw new Error('Empty CSV file');

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line, idx) => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const rowObj: Record<string, any> = { id: `row-${idx + 1}` };
      headers.forEach((h, hIdx) => {
        rowObj[h || `col-${hIdx}`] = values[hIdx] || '';
      });
      return rowObj;
    });

    const columns = headers.map((h, idx) => ({
      id: idx === 0 ? 'title' : h,
      name: h,
      type: 'text' as const
    }));

    const dbBlock: EditorBlock = {
      id: `block-${Date.now()}`,
      type: 'database',
      content: '',
      databaseData: {
        layout: 'table',
        columns,
        rows
      }
    };

    const note = await DataManager.createNote();
    note.title = title || 'ইম্পোর্টকৃত ডাটাবেস (CSV)';
    note.content = `<div data-block-id="${dbBlock.id}" data-block-type="database"></div>`;
    note.emoji = '📊';
    await DataManager.saveNote(note);

    return note.id;
  }
}
