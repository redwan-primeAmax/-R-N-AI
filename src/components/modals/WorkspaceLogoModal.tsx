/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Code, ImageIcon } from 'lucide-react';
import { Modal } from './Modal';

interface WorkspaceLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (svg: string) => void;
  currentLogo?: string;
}

export const WorkspaceLogoModal: React.FC<WorkspaceLogoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentLogo
}) => {
  const [svgInput, setSvgInput] = useState(currentLogo || '');

  const handleSave = () => {
    onSave(svgInput.trim());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ওয়ার্কস্পেস লোগো (SVG)">
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">SVG কোড পেস্ট করুন</label>
          <textarea
            value={svgInput}
            onChange={(e) => setSvgInput(e.target.value)}
            placeholder="<svg ...>...</svg>"
            className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-mono outline-none focus:border-blue-500 transition-all resize-none"
          />
        </div>

        <div className="flex flex-col items-center gap-4 py-6 bg-white/5 rounded-3xl border border-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Preview</span>
          {svgInput.trim() ? (
            <div 
              className="w-16 h-16 flex items-center justify-center overflow-hidden"
              dangerouslySetInnerHTML={{ __html: svgInput }}
            />
          ) : (
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-white/10">
              <ImageIcon size={32} />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all text-white/60"
          >
            বাতিল
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all text-white shadow-lg shadow-blue-500/20"
          >
            সেভ করুন
          </button>
        </div>
      </div>
    </Modal>
  );
};
