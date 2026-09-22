/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Note } from '../../../services/storage/DataManager';

interface UsePdfExportParams {
  note: Note | null;
  setNotification: (notif: { message: string; type: 'info' | 'success' | 'error' } | null) => void;
}

export function usePdfExport({ note, setNotification }: UsePdfExportParams) {
  useEffect(() => {
    const handlePdfExport = () => {
      if (!note) return;
      setNotification({ message: 'Generating PDF...', type: 'info' });

      let element = document.querySelector('.ProseMirror, .prose, #editor-content-root') as HTMLElement | null;
      let tempContainer: HTMLElement | null = null;

      if (!element) {
        tempContainer = document.createElement('div');
        tempContainer.className = 'ProseMirror prose p-8 bg-white text-black';
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '800px';
        tempContainer.innerHTML = `
          <h1 style="font-size: 26px; font-weight: bold; margin-bottom: 16px;">${note.emoji || ''} ${note.title || 'Note'}</h1>
          <div style="font-size: 15px; line-height: 1.6;">${note.content || '<p>Empty note</p>'}</div>
        `;
        document.body.appendChild(tempContainer);
        element = tempContainer;
      }

      html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })
        .then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${note.title || 'note'}.pdf`);

          setNotification({ message: 'PDF Generated', type: 'success' });
        })
        .catch((err) => {
          console.error('PDF generation failed:', err);
          setNotification({ message: 'PDF failed!', type: 'error' });
        })
        .finally(() => {
          if (tempContainer && tempContainer.parentNode) {
            tempContainer.parentNode.removeChild(tempContainer);
          }
          setTimeout(() => setNotification(null), 2000);
        });
    };

    window.addEventListener('export-note-pdf', handlePdfExport);
    return () => window.removeEventListener('export-note-pdf', handlePdfExport);
  }, [note, setNotification]);
}
