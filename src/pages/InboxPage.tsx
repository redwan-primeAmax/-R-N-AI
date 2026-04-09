/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Inbox, Upload, FileCode, Check, AlertCircle, Loader2, Search } from 'lucide-react';
import { DataManager, Note } from '../utils/DataManager';

const InboxPage: React.FC = () => {
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number } | null>(null);
  const [previewNotes, setPreviewNotes] = useState<Note[]>([]);
  const [shareCode, setShareCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImportById = async () => {
    if (!shareCode.trim()) return;
    setIsImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const note = await DataManager.importById(shareCode.trim());
      setImportResult({ success: true, count: 1 });
      setShareCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to import note. Please check the ID.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#191919] text-white flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex items-center gap-4 sticky top-0 bg-[#191919]/80 backdrop-blur-md z-10">
        <button 
          onClick={() => navigate('/')}
          className="p-2 hover:bg-white/10 rounded-full transition-all text-white active:scale-95"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Inbox size={20} className="text-blue-400" />
          Inbox / Cloud Import
        </h1>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-10">
        {/* Import Section */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Import Notes</h2>
            <p className="text-white/40 text-sm">Enter a Note ID to add it to your space.</p>
          </div>

          <div className="max-w-md mx-auto w-full">
            {/* Share Code / ID Input */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2 text-white/60">
                <FileCode size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Note ID</span>
              </div>
              <input 
                type="text"
                placeholder="Enter 8-digit ID (e.g. A1B2C3D4)"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base outline-none placeholder:text-white/20 font-mono text-center tracking-widest"
              />
              <button 
                onClick={handleImportById}
                disabled={!shareCode.trim() || isImporting}
                className="w-full py-4 bg-white text-black rounded-2xl text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                Import Note
              </button>
            </div>
          </div>
        </section>

        {/* Status / Results */}
        <AnimatePresence mode="wait">
          {isImporting && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-10 gap-4"
            >
              <Loader2 size={32} className="animate-spin text-blue-400" />
              <p className="text-sm text-white/60 font-medium">Processing import...</p>
            </motion.div>
          )}

          {importResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-green-500/10 border border-green-500/20 rounded-3xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check size={24} className="text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-green-400">Import Successful!</h3>
                <p className="text-sm text-white/60">{importResult.count} note(s) have been added to your space.</p>
              </div>
              <button 
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-all"
              >
                Go to Home
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-red-400">Import Failed</h3>
                <p className="text-sm text-white/60">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="px-6 py-2 bg-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-all"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Section */}
        <section className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Search size={16} className="text-white/40" />
            How it works
          </h3>
          <ul className="space-y-3 text-xs text-white/40 leading-relaxed">
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold">•</span>
              <span>Publishing a note generates a unique <b>8-digit ID</b>.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold">•</span>
              <span>Share this ID with others to let them import your note directly into their space.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold">•</span>
              <span>Imported notes are saved locally and can be edited or deleted independently.</span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default InboxPage;
