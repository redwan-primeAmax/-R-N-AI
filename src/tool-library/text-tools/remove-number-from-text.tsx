/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Trash2, 
  Copy, 
  Check, 
  Save, 
  History,
  FileText,
  MoreVertical,
  Edit2,
  Loader2,
  Sparkles
} from 'lucide-react';
import { DataManager, Note } from '../../utils/DataManager';
import { AIServiceFactory } from '../../pages/AI/services/serviceFactory';
import FloatingHomeButton from '../../components/FloatingHomeButton';

const NumberRemover: React.FC = () => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'generating' | 'completed'>('idle');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedResults, setSavedResults] = useState<Note[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('সংরক্ষিত');
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    // Process text whenever input changes
    const processed = inputText.replace(/[0-9০-৯]/g, ''); // Support both English and Bengali digits
    setOutputText(processed);
  }, [inputText]);

  useEffect(() => {
    const loadHistory = async () => {
      const allNotes = await DataManager.getAllNotes();
      const results = allNotes.filter(n => n.title.startsWith('[Tool]'));
      setSavedResults(results);
    };
    loadHistory();
  }, []);

  const generateTitle = async (content: string) => {
    try {
      const settings = await DataManager.getAISettings();
      const service = AIServiceFactory.getService('picoapps');
      const prompt = `Generate a very short title (3-4 words, max 20 characters) for this text in Bengali. Only return the title, nothing else. Text: ${content.substring(0, 500)}`;
      
      const response = await service.sendMessage(prompt, {
        settings,
        systemPrompt: "You are a helpful assistant that generates short titles in Bengali."
      });
      
      return response.trim().replace(/[#*]/g, '').substring(0, 20);
    } catch (error) {
      console.error('Title generation failed:', error);
      return 'সংরক্ষিত নোট';
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleSave = async () => {
    if (!outputText.trim()) return;

    setSaveStatus('generating');
    
    const aiTitle = await generateTitle(outputText);
    setNoteTitle(aiTitle);

    const content = `
## সংখ্যা অপসারণ ফলাফল
---
### মূল টেক্সট:
${inputText}

### ফলাফল:
\`\`\`text
${outputText}
\`\`\`

<!-- TOOL_RESULT -->
    `;

    const newNote: Note = {
      id: currentNoteId || `tool-res-${Date.now()}`,
      title: `[Tool] ${aiTitle}`,
      content: content,
      emoji: '🔢',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false
    };

    await DataManager.saveNote(newNote);
    setCurrentNoteId(newNote.id);
    setSaveStatus('completed');
    
    const allNotes = await DataManager.getAllNotes();
    setSavedResults(allNotes.filter(n => n.title.startsWith('[Tool]')));

    setTimeout(() => {
      setSaveStatus('idle');
    }, 2000);
  };

  const handleRename = async (newTitle: string) => {
    if (!currentNoteId) return;
    setNoteTitle(newTitle);
    const note = await DataManager.getNoteById(currentNoteId);
    if (note) {
      note.title = `[Tool] ${newTitle}`;
      await DataManager.saveNote(note);
      setIsRenaming(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/tools')} className="p-2 text-white/40 hover:text-white transition-all">
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight">সংখ্যা অপসারণ টুল</h1>
            <span className="text-[10px] text-white/20 uppercase tracking-widest">টেক্সট ভিত্তিক টুলস</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 text-white/40 hover:text-white transition-all"
            title="সংরক্ষিত ডেটা"
          >
            <History size={20} />
          </button>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-white/40 hover:text-white transition-all"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto space-y-8">
        {/* Input Area */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">আপনার টেক্সট পেস্ট করুন</label>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="এখানে টেক্সট লিখুন..."
            className="w-full h-48 bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 text-white/90 placeholder:text-white/10 focus:outline-none focus:border-white/10 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Output Area */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">ফলাফল</label>
            <div className="flex gap-2">
              <button 
                onClick={handleCopy}
                disabled={!outputText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {copyFeedback ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                কপি করুন
              </button>
              <button 
                onClick={handleSave}
                disabled={!outputText.trim() || saveStatus !== 'idle'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50 min-w-[100px] justify-center"
              >
                {saveStatus === 'generating' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    শিরোনাম তৈরি হচ্ছে...
                  </>
                ) : saveStatus === 'completed' ? (
                  <>
                    <Check size={14} />
                    সম্পন্ন
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    সেভ করুন
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="relative group pb-20">
            <div className="w-full min-h-[150px] bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-sm text-blue-400/90 leading-relaxed whitespace-pre-wrap break-words">
              {outputText || <span className="text-white/10 italic">ফলাফল এখানে দেখা যাবে...</span>}
            </div>
          </div>
        </div>

        {/* Rename Modal */}
        <AnimatePresence>
          {isRenaming && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#1a1a1a] border border-white/10 p-6 rounded-3xl w-full max-w-xs shadow-2xl"
              >
                <h3 className="text-lg font-bold mb-4">নাম পরিবর্তন</h3>
                <input 
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:border-white/20"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button onClick={() => setIsRenaming(false)} className="flex-1 py-3 bg-white/5 rounded-xl text-white/60 font-bold">বাতিল</button>
                  <button onClick={() => handleRename(noteTitle)} className="flex-1 py-3 bg-blue-600 rounded-xl text-white font-bold">সেভ</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Menu Overlay */}
        <AnimatePresence>
          {showMenu && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl"
              >
                <div className="p-6 space-y-4">
                  <h3 className="font-bold text-lg">অপশন</h3>
                  <button 
                    onClick={() => { setIsRenaming(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-left"
                  >
                    <Edit2 size={18} className="text-blue-400" />
                    <span className="font-medium">নাম পরিবর্তন করুন</span>
                  </button>
                  <button 
                    onClick={() => setShowMenu(false)}
                    className="w-full py-3 text-white/40 text-sm font-bold"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* History Overlay */}
        <AnimatePresence>
          {showHistory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-bold text-lg">সংরক্ষিত ডেটা</h3>
                  <button onClick={() => setShowHistory(false)} className="text-xs text-white/40 hover:text-white">বন্ধ করুন</button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-2 no-scrollbar">
                  {savedResults.length === 0 ? (
                    <p className="text-center py-12 text-white/20 italic">কোনো সংরক্ষিত ডেটা নেই</p>
                  ) : (
                    savedResults.map(result => (
                      <button
                        key={result.id}
                        onClick={() => {
                          // Extract original text
                          const parts = result.content.split('### মূল টেক্সট:');
                          if (parts.length > 1) {
                            const subParts = parts[1].split('### ফলাফল:');
                            setInputText(subParts[0].trim());
                          }
                          setCurrentNoteId(result.id);
                          setNoteTitle(result.title.replace('[Tool] ', ''));
                          setShowHistory(false);
                        }}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-400">
                            <FileText size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white/90">{result.title.replace('[Tool] ', '')}</span>
                            <span className="text-[10px] text-white/30">{new Date(result.updatedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
      <FloatingHomeButton />
    </div>
  );
};

export default NumberRemover;
