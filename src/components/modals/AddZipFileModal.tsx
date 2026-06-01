/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal } from './Modal';

interface AddZipFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  onFileNameChange: (val: string) => void;
  fileContent: string;
  onFileContentChange: (val: string) => void;
  onAdd: () => void;
}

export function AddZipFileModal({
  isOpen,
  onClose,
  fileName,
  onFileNameChange,
  fileContent,
  onFileContentChange,
  onAdd
}: AddZipFileModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="নতুন কোড যোগ করুন">
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2 block">ফাইলের নাম (এক্সটেনশন সহ)</label>
          <input 
            type="text" 
            value={fileName} 
            onChange={(e) => onFileNameChange(e.target.value)}
            placeholder="index.js"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-bold"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2 block">কোড / কন্টেন্ট</label>
          <textarea 
            value={fileContent} 
            onChange={(e) => onFileContentChange(e.target.value)}
            placeholder="// Paste your code here..."
            rows={8}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-mono resize-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-sm transition-all shadow-inner"
          >
            বাতিল করুন
          </button>
          <button 
            onClick={onAdd} 
            disabled={!fileName}
            className="flex-1 py-4 bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-500/20"
          >
            যোগ করুন
          </button>
        </div>
      </div>
    </Modal>
  );
}
