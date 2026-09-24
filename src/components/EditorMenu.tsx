/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  FileText, 
  Copy, 
  X,
  Code,
  FileCode
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import TurndownService from 'turndown';
import { Note } from '../services/storage/DataManager';

interface EditorMenuProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  content: string;
  onCopy: () => void;
}

const EditorMenu: React.FC<EditorMenuProps> = ({
  isOpen,
  onClose,
  note,
  content,
  onCopy
}) => {
  const getSlugTitle = () => {
    const slug = (note.title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return slug || 'untitled';
  };

  const handleExportTxt = () => {
    const plainText = content.replace(/<[^>]*>/g, '');
    const fullContent = `${note.emoji ? note.emoji + ' ' : ''}${note.title || 'Untitled'}\n${'='.repeat(40)}\n\n${plainText}`;
    const blob = new Blob(["\ufeff", fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getSlugTitle()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleExportMarkdown = () => {
    try {
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
      });
      const markdownBody = turndownService.turndown(content || '');
      const fullMarkdown = `# ${note.emoji ? note.emoji + ' ' : ''}${note.title || 'Untitled'}\n\n${markdownBody}`;
      
      const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getSlugTitle()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Markdown export failed:', e);
    }
    onClose();
  };

  const handleExportHtml = () => {
    try {
      const htmlTemplate = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.emoji ? note.emoji + ' ' : ''}${note.title || 'Untitled'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #37352f;
      background-color: #ffffff;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 { font-size: 2.5em; margin-bottom: 0.2em; }
    .header { margin-bottom: 2em; border-bottom: 1px solid #e0e0e0; padding-bottom: 1em; }
    .emoji { font-size: 3em; margin-bottom: 0.2em; display: block; }
    blockquote { border-left: 3px solid #37352f; margin: 0; padding-left: 1em; color: #666; }
    pre { background: #f4f4f4; padding: 1em; overflow-x: auto; border-radius: 6px; }
    code { background: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="header">
    ${note.emoji ? `<span class="emoji">${note.emoji}</span>` : ''}
    <h1>${note.title || 'Untitled'}</h1>
    ${note.description ? `<p style="color: #666;">${note.description}</p>` : ''}
  </div>
  <div class="content">
    ${content}
  </div>
</body>
</html>`;

      const blob = new Blob([htmlTemplate], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getSlugTitle()}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('HTML export failed:', e);
    }
    onClose();
  };

  const handleExportPdf = async () => {
    onClose();
    const editorElement = document.querySelector('.ProseMirror, .prose, #editor-content-root') as HTMLElement;
    
    if (!editorElement) {
      const doc = new jsPDF();
      const plainText = content.replace(/<[^>]*>/g, '');
      doc.setFontSize(20);
      doc.text(`${note.emoji ? note.emoji + ' ' : ''}${note.title || 'Untitled'}`, 10, 20);
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(plainText, 180);
      doc.text(splitText, 10, 40);
      doc.save(`${getSlugTitle()}.pdf`);
      return;
    }

    try {
      const canvas = await html2canvas(editorElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(`${note.emoji ? note.emoji + ' ' : ''}${note.title || 'Untitled'}`, 15, 15);
      
      doc.addImage(imgData, 'PNG', 0, 25, pdfWidth, pdfHeight);
      doc.save(`${getSlugTitle()}.pdf`);
    } catch (e) {
      console.error('PDF Export failed:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-[#1c1c1c] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">পেজ অপশন (Page Options)</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer">
              <X size={20} className="text-white/40" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={onCopy}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Copy size={18} className="text-blue-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">লেখা কপি করুন (Copy Content)</div>
                <div className="text-[10px] text-white/40">ক্লিপবোর্ডে সম্পূর্ণ লেখা কপি করুন</div>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-2 pb-2">
              <button
                onClick={handleExportMarkdown}
                className="flex items-center gap-2.5 p-3 hover:bg-white/5 rounded-xl transition-all active:scale-[0.98] border border-white/5 text-left cursor-pointer"
              >
                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <Code size={16} className="text-purple-400" />
                </div>
                <div>
                  <div className="text-xs font-bold">Export .md</div>
                  <div className="text-[9px] text-white/40">Markdown</div>
                </div>
              </button>

              <button
                onClick={handleExportHtml}
                className="flex items-center gap-2.5 p-3 hover:bg-white/5 rounded-xl transition-all active:scale-[0.98] border border-white/5 text-left cursor-pointer"
              >
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <FileCode size={16} className="text-green-400" />
                </div>
                <div>
                  <div className="text-xs font-bold">Export .html</div>
                  <div className="text-[9px] text-white/40">HTML Doc</div>
                </div>
              </button>

              <button
                onClick={handleExportTxt}
                className="flex items-center gap-2.5 p-3 hover:bg-white/5 rounded-xl transition-all active:scale-[0.98] border border-white/5 text-left cursor-pointer"
              >
                <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-orange-400" />
                </div>
                <div>
                  <div className="text-xs font-bold">Export .txt</div>
                  <div className="text-[9px] text-white/40">Plain Text</div>
                </div>
              </button>

              <button
                onClick={handleExportPdf}
                className="flex items-center gap-2.5 p-3 hover:bg-white/5 rounded-xl transition-all active:scale-[0.98] border border-white/5 text-left cursor-pointer"
              >
                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <Download size={16} className="text-red-400" />
                </div>
                <div>
                  <div className="text-xs font-bold">Export .pdf</div>
                  <div className="text-[9px] text-white/40">PDF Doc</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EditorMenu;
