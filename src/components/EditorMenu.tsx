import React from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  FileText, 
  Copy, 
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
  const handleExportTxt = () => {
    const plainText = content.replace(/<[^>]*>/g, '');
    const fullContent = `${note.emoji} ${note.title}\n${'='.repeat(40)}\n\n${plainText}`;
    const blob = new Blob(["\ufeff", fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'untitled'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleExportPdf = async () => {
    onClose(); // Close menu first
    const editorElement = document.querySelector('.ProseMirror') as HTMLElement;
    
    if (!editorElement) {
      // Fallback if editor not found
      const doc = new jsPDF();
      const plainText = content.replace(/<[^>]*>/g, '');
      doc.setFontSize(20);
      doc.text(`${note.emoji} ${note.title}`, 10, 20);
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(plainText, 180);
      doc.text(splitText, 10, 40);
      doc.save(`${note.title || 'untitled'}.pdf`);
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

      // Add Title
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(`${note.emoji} ${note.title}`, 15, 15);
      
      // Add Image
      doc.addImage(imgData, 'PNG', 0, 25, pdfWidth, pdfHeight);
      doc.save(`${note.title || 'untitled'}.pdf`);
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
            <h3 className="text-lg font-bold">Page Options</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X size={20} className="text-white/40" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={onCopy}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Copy size={20} className="text-blue-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">Copy Page Content</div>
                <div className="text-[10px] text-white/40">Copy all text to clipboard</div>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-2 pb-4">
              <button
                onClick={handleExportTxt}
                className="flex flex-col items-center gap-2 p-4 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] border border-white/5"
              >
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-orange-400" />
                </div>
                <div className="text-[11px] font-bold">Export .txt</div>
              </button>

              <button
                onClick={handleExportPdf}
                className="flex flex-col items-center gap-2 p-4 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] border border-white/5"
              >
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <Download size={20} className="text-red-400" />
                </div>
                <div className="text-[11px] font-bold">Export .pdf</div>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EditorMenu;
