/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileText, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';
import { EditorBlock } from '../../../../utils/blockParser';

interface PdfBlockProps {
  block: EditorBlock;
  setBlocks: React.Dispatch<React.SetStateAction<EditorBlock[]>>;
  isReadOnly?: boolean;
}

export const PdfBlock: React.FC<PdfBlockProps> = ({ block, setBlocks, isReadOnly }) => {
  const pdfUrl = block.mediaData?.url || block.content;
  const fileName = block.mediaData?.fileName || 'ডকুমেন্ট.pdf';
  const [zoom, setZoom] = useState(100);

  return (
    <div className="my-4 border border-white/10 rounded-2xl bg-[#141416] overflow-hidden shadow-xl">
      {/* PDF Header Controls */}
      <div className="p-3 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-red-400 font-bold truncate">
          <FileText size={16} />
          <span className="truncate">{fileName}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.max(50, z - 25))}
            className="p-1.5 hover:bg-white/10 rounded text-white/70 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] font-mono text-white/50">{zoom}%</span>
          <button
            onClick={() => setZoom(z => Math.min(200, z + 25))}
            className="p-1.5 hover:bg-white/10 rounded text-white/70 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 hover:bg-white/10 rounded text-white/70 cursor-pointer ml-1"
            title="Open externally"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* PDF Viewer Canvas / Embed */}
      {pdfUrl ? (
        <div className="w-full h-[500px] overflow-auto bg-neutral-900 flex justify-center p-2">
          <iframe
            src={`${pdfUrl}#toolbar=0`}
            style={{ width: `${zoom}%`, height: '100%', minHeight: '480px' }}
            className="border-none rounded-xl bg-white shadow-2xl transition-all"
            title={fileName}
          />
        </div>
      ) : (
        <div className="p-8 text-center text-white/30 text-xs">
          কোনো PDF ফাইল যোগ করা হয়নি
        </div>
      )}
    </div>
  );
};
