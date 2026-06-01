import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from './Modal';
import { FileText, FileDown, Archive, Image as ImageIcon, CheckCircle2, Loader2, PlaySquare } from 'lucide-react';
import { Note } from '../../services/storage/DataManager';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

interface NoteExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  onPdfExport: () => void;
}

export function NoteExportModal({ isOpen, onClose, note, onPdfExport }: NoteExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Parse HTML to check for images and videos
  const hasImages = note.content.includes('<img');
  const hasVideos = note.content.includes('<video') || note.content.includes('youtube.com/embed') || note.content.includes('vimeo.com/video');
  const hasMedia = hasImages || hasVideos;

  const handleExportText = async () => {
    if (hasMedia) return;
    setIsExporting(true);
    setExportSuccess(null);
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = note.content;
      const textContent = tempDiv.innerText || tempDiv.textContent || '';
      
      const header = `Title: ${note.title}\nDate: ${new Date(note.updatedAt).toLocaleString()}\n\n`;
      const blob = new Blob(["\ufeff", header + textContent], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${note.title || 'Note'}.txt`);
      setExportSuccess('Text');
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (hasMedia) return;
    onClose();
    setTimeout(onPdfExport, 300);
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    setExportSuccess(null);
    try {
      const zip = new JSZip();
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = note.content;
      
      // Add text content
      const textContent = tempDiv.innerText || tempDiv.textContent || '';
      const header = `Title: ${note.title}\nDate: ${new Date(note.updatedAt).toLocaleString()}\n\n`;
      zip.file(`${note.title || 'Note'}.txt`, header + textContent);
      
      // Extract media
      const images = Array.from(tempDiv.querySelectorAll('img'));
      if (images.length > 0) {
        const imgFolder = zip.folder('images');
        for (let i = 0; i < images.length; i++) {
          const src = images[i].src;
          if (src.startsWith('data:image')) {
            const base64Data = src.split(',')[1];
            imgFolder?.file(`image_${i + 1}.png`, base64Data, { base64: true });
          } else {
            // Write a URL reference note for external images
            imgFolder?.file(`image_${i + 1}_url.txt`, src);
          }
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${note.title || 'Note'}_Export.zip`);
      
      setExportSuccess('ZIP');
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImages = async () => {
    if (hasMedia) return;
    setIsExporting(true);
    setExportSuccess(null);
    try {
      const element = document.querySelector('.ProseMirror') as HTMLElement;
      if (!element) throw new Error("Editor content not found");
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      
      const isLarge = canvas.height > 8000;
      
      if (isLarge) {
        // Zip multiple fragments if very large
        const zip = new JSZip();
        const numPages = Math.ceil(canvas.height / 2000);
        
        for (let i = 0; i < numPages; i++) {
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = Math.min(2000, canvas.height - (i * 2000));
            const ctx = pageCanvas.getContext('2d');
            ctx?.drawImage(canvas, 0, i * 2000, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
            
            const dataUrl = pageCanvas.toDataURL('image/png');
            zip.file(`page_${i+1}.png`, dataUrl.split(',')[1], { base64: true });
        }
        
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, `${note.title || 'Note'}_Images.zip`);
        setExportSuccess('Images (ZIP)');
      } else {
        canvas.toBlob((blob) => {
          if (blob) saveAs(blob, `${note.title || 'Note'}.png`);
        });
        setExportSuccess('Image');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const options = [
    {
      id: 'pdf',
      label: 'PDF Document',
      icon: <FileDown size={20} />,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      action: handleExportPdf,
      disabled: hasMedia
    },
    {
      id: 'text',
      label: 'Plain Text (.txt)',
      icon: <FileText size={20} />,
      color: 'text-gray-400',
      bgColor: 'bg-white/10',
      action: handleExportText,
      disabled: hasMedia
    },
    {
      id: 'image',
      label: 'Image (.png)',
      icon: <ImageIcon size={20} />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      action: handleExportImages,
      disabled: hasMedia
    },
    {
      id: 'zip',
      label: 'ZIP Archive',
      icon: <Archive size={20} />,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      action: handleExportZip,
      disabled: false 
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="এক্সপোর্ট অপশন (Export)">
      <div className="p-4 space-y-4">
        {hasMedia && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <PlaySquare size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-400 leading-relaxed font-bold">
              নোটের মধ্যে ইমেজ বা ভিডিও থাকায় আপনি শুধুমাত্র জিপ (ZIP) ফরম্যাটে এটি এক্সপোর্ট করতে পারবেন।
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={option.action}
              disabled={option.disabled || isExporting}
              className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all ${
                option.disabled 
                  ? 'bg-black/40 border-white/[0.02] opacity-40 cursor-not-allowed grayscale' 
                  : 'bg-[#151516] border-white/5 hover:border-white/10 hover:bg-[#1a1a1b] active:scale-95 cursor-pointer shadow-lg'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${option.disabled ? 'bg-white/5 text-white/20' : option.bgColor + ' ' + option.color}`}>
                {isExporting && exportSuccess === null ? <Loader2 size={20} className="animate-spin" /> : option.icon}
              </div>
              <div className="text-center">
                <p className={`text-[11px] font-bold ${option.disabled ? 'text-white/20' : 'text-white/80'}`}>{option.label}</p>
                {exportSuccess === option.id && (
                  <p className="text-[9px] text-green-500 font-bold flex justify-center items-center gap-1 mt-1">
                    <CheckCircle2 size={10} /> Success
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
