/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Copy, 
  Check, 
  Sparkles, 
  Database, 
  Search,
  Info,
  AlertCircle,
  ArrowRight,
  FileText
} from 'lucide-react';
import { DataManager, Note } from '../../utils/DataManager';

const SYSTEM_PROMPT = `You are a professional content architect and data formatting expert. 
Your task is to transform any provided text into a high-quality, structured JSON object for a professional note-taking application.

The JSON MUST follow this exact structure:
{
  "title": "A compelling and descriptive title",
  "content": "The content formatted in rich HTML",
  "emoji": "A single relevant high-quality emoji"
}

CRITICAL FORMATTING RULES:
1. HIERARCHY: Use <h1>, <h2>, <h3>, <h4>, <h5>, <h6> for clear structure.
2. STYLING: Use <strong> for bold, <em> for italic, <u> for underline, and <mark> for highlights.
3. LISTS: Use <ul> and <ol> for standard lists.
4. TASK LISTS: ONLY use <ul data-type="taskList"> with <li data-checked="true/false"> if the input explicitly describes actionable tasks or a to-do list. Do NOT use it for general descriptions.
5. CALLOUTS: Use <blockquote> for quotes, warnings, or important highlights.
6. CODE: Use <pre><code>...</code></pre> for technical snippets or examples.
7. VISUALS: Use inline styles for colors if necessary (e.g., <span style="color: #ff0000">).
8. ALIGNMENT: Use <p style="text-align: center/right/justify"> if the context suggests specific alignment.
9. THEMATIC BREAKS: Use <hr /> to separate major sections.
10. PROFESSIONALISM: Ensure the content is visually organized, aesthetically pleasing, and maintains the original structure's intent.
11. OUTPUT: Do not include any conversational text, only the raw JSON object.`;

const ExternalImport: React.FC = () => {
  const navigate = useNavigate();
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [importData, setImportData] = useState('');
  const [targetId, setTargetId] = useState('');
  const [changeRequest, setChangeRequest] = useState('');
  const [copied, setCopied] = useState<'prompt' | 'update' | false>(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    DataManager.getAllNotes().then(notes => {
      setRecentNotes(notes.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10));
    });
  }, []);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT);
    setCopied('prompt');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateUpdatePrompt = async () => {
    if (!targetId) {
      setStatus({ type: 'error', message: 'দয়া করে প্রথমে একটি পাতা নির্বাচন করুন।' });
      return;
    }
    if (!changeRequest.trim()) {
      setStatus({ type: 'error', message: 'আপনি কী পরিবর্তন করতে চান তা লিখুন।' });
      return;
    }

    const note = await DataManager.getNoteById(targetId);
    if (!note) return;

    const updatePrompt = `I have an existing note with the following content:
---
Title: ${note.title}
Content: ${note.content}
---
I want to make the following changes:
"${changeRequest}"

Please provide the updated note in the required JSON format as specified in our previous system prompt instructions. Ensure the structure remains intact and only the requested parts are modified accurately.`;

    navigator.clipboard.writeText(updatePrompt);
    setCopied('update');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      setStatus({ type: 'error', message: 'Please paste the AI generated data first.' });
      return;
    }

    try {
      // Try to parse JSON
      const data = JSON.parse(importData.trim());
      
      if (!data.title || !data.content) {
        throw new Error('Invalid data format. Missing title or content.');
      }

      if (targetId) {
        // Update existing note
        const existingNote = await DataManager.getNoteById(targetId);
        if (existingNote) {
          await DataManager.saveNote({
            ...existingNote,
            title: data.title,
            content: data.content,
            emoji: data.emoji || existingNote.emoji,
            updatedAt: Date.now()
          });
          setStatus({ type: 'success', message: 'Note updated successfully!' });
        } else {
          throw new Error('Target note not found.');
        }
      } else {
        // Create new note
        const newId = crypto.randomUUID();
        await DataManager.saveNote({
          id: newId,
          title: data.title,
          content: data.content,
          emoji: data.emoji || '📝',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        setStatus({ type: 'success', message: 'New note created successfully!' });
        setTargetId(newId);
      }
      
      setImportData('');
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to parse data. Ensure it is valid JSON.' });
    }
  };

  const filteredNotes = recentNotes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0d0d] border-b border-white/5 px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            onTouchStart={() => navigate(-1)}
            className="p-3 -m-1 text-white/40 hover:text-white transition-all active:scale-90 cursor-pointer flex items-center justify-center rounded-full hover:bg-white/5 relative z-50"
            aria-label="Go back"
          >
            <ChevronLeft size={28} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">External AI Import</h1>
            <p className="text-xs text-white/40 font-medium uppercase tracking-widest mt-0.5">Bring data from outside</p>
          </div>
        </div>
      </header>

      <main className="px-6 py-10 max-w-2xl mx-auto space-y-12">
        {/* Step 1: System Prompt */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
              <Sparkles size={18} />
            </div>
            <h2 className="text-lg font-bold">১. নির্দেশনাবলী অনুলিপি করুন</h2>
          </div>
          
          <div className="bg-[#161616] border border-white/5 rounded-3xl p-6 space-y-4 relative group">
            <div className="flex items-start gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
              <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-blue-400/80 leading-relaxed">
                এই নির্দেশনাবলীটি কপি করে ChatGPT বা Claude-এ পেস্ট করুন। এটি এআই-কে বলবে কীভাবে ডেটা ফরম্যাট করতে হবে।
              </p>
            </div>
            <button 
              onClick={handleCopyPrompt}
              className="w-full py-4 bg-blue-500 text-white rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-500/10 active:scale-95"
            >
              {copied === 'prompt' ? <Check size={18} /> : <Copy size={18} />}
              <span className="font-bold text-sm">{copied === 'prompt' ? 'অনুলিপি করা হয়েছে!' : 'সিস্টেম প্রম্পট অনুলিপি করুন'}</span>
            </button>
          </div>
        </section>

        {/* Step 2: Select Target & Update Prompt Generator */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20">
              <Database size={18} />
            </div>
            <h2 className="text-lg font-bold">২. পাতা নির্বাচন ও পরিমার্জন (ঐচ্ছিক)</h2>
          </div>

          <div className="space-y-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-400 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="পাতা খুঁজুন বা আইডি পেস্ট করুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all"
              />
            </div>

            <div className="grid gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <button 
                onClick={() => setTargetId('')}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex items-center justify-between group",
                  targetId === '' ? "bg-purple-500/10 border-purple-500/50" : "bg-white/5 border-white/5 hover:bg-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                    <Plus size={20} className="text-white/40" />
                  </div>
                  <span className="font-bold text-sm">নতুন পাতা তৈরি করুন</span>
                </div>
                {targetId === '' && <Check size={18} className="text-purple-400" />}
              </button>

              {filteredNotes.map(note => (
                <button 
                  key={note.id}
                  onClick={() => setTargetId(note.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex items-center justify-between group text-left",
                    targetId === note.id ? "bg-purple-500/10 border-purple-500/50" : "bg-white/5 border-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-2xl shrink-0">{note.emoji}</div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm truncate">{note.title || 'Untitled'}</h4>
                      <p className="text-[10px] text-white/40 font-mono truncate">ID: {note.id}</p>
                    </div>
                  </div>
                  {targetId === note.id && <Check size={18} className="text-purple-400" />}
                </button>
              ))}
            </div>

            {targetId && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-[#161616] border border-white/5 rounded-3xl p-6 space-y-4"
              >
                <h3 className="text-sm font-bold text-white/80">পরিমার্জন নির্দেশিকা নির্মাতা</h3>
                <textarea 
                  value={changeRequest}
                  onChange={(e) => setChangeRequest(e.target.value)}
                  placeholder="আপনি এই পাতায় কী পরিবর্তন করতে চান তা লিখুন..."
                  className="w-full h-24 bg-black/20 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-purple-500/30 transition-all resize-none"
                />
                <button 
                  onClick={handleGenerateUpdatePrompt}
                  className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl flex items-center justify-center gap-2 transition-all border border-purple-500/20 font-bold text-xs"
                >
                  {copied === 'update' ? <Check size={14} /> : <RefreshCw size={14} />}
                  {copied === 'update' ? 'নির্দেশনা অনুলিপি করা হয়েছে!' : 'পরিমার্জন নির্দেশিকা তৈরি ও অনুলিপি'}
                </button>
              </motion.div>
            )}
          </div>
        </section>

        {/* Step 3: Paste & Import */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400 border border-green-500/20">
              <FileText size={18} />
            </div>
            <h2 className="text-lg font-bold">৩. এআই ডেটা পেস্ট ও ইম্পোর্ট করুন</h2>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <textarea 
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="এআই থেকে প্রাপ্ত JSON ডেটা এখানে পেস্ট করুন..."
                className="w-full h-48 bg-[#161616] border border-white/10 rounded-3xl p-6 text-white font-mono text-sm focus:outline-none focus:border-green-500/50 transition-all resize-none shadow-inner"
              />
              <div className="absolute bottom-4 right-4 text-[10px] text-white/20 font-mono">
                JSON ফরম্যাট আবশ্যক
              </div>
            </div>

            <button 
              onClick={handleImport}
              disabled={!importData.trim()}
              className="w-full py-5 bg-green-500 hover:bg-green-400 disabled:bg-white/5 disabled:text-white/20 text-black font-bold rounded-3xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-500/10 active:scale-95"
            >
              <ArrowRight size={20} />
              <span>{targetId ? 'বিদ্যমান পাতা আপডেট করুন' : 'নতুন পাতা তৈরি করুন'}</span>
            </button>
          </div>
        </section>
      </main>

      {/* Status Toast */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={cn(
              "fixed bottom-8 left-6 right-6 z-[100] p-4 rounded-2xl border flex items-center gap-3 shadow-2xl backdrop-blur-xl",
              status.type === 'success' ? "bg-green-500/20 border-green-500/30 text-green-400" :
              status.type === 'error' ? "bg-red-500/20 border-red-500/30 text-red-400" :
              "bg-blue-500/20 border-blue-500/30 text-blue-400"
            )}
          >
            {status.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            <p className="text-sm font-bold flex-grow">{status.message}</p>
            <button onClick={() => setStatus(null)} className="p-1 hover:bg-white/10 rounded-lg transition-all">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper function for conditional classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

const Plus = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const X = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const RefreshCw = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
    <path d="M21 3v5h-5"></path>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
    <path d="M3 21v-5h5"></path>
  </svg>
);

export default ExternalImport;
