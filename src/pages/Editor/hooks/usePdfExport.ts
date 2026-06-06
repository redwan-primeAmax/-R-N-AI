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

      const element = document.querySelector('.prose') as HTMLElement;
      if (!element) {
        setNotification({ message: 'Content not found', type: 'error' });
        return;
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
          setTimeout(() => setNotification(null), 2000);
        });
    };

    window.addEventListener('export-note-pdf', handlePdfExport);
    return () => window.removeEventListener('export-note-pdf', handlePdfExport);
  }, [note, setNotification]);
}
