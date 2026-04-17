/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Hash, 
  Save, 
  MoreVertical, 
  Copy, 
  Check, 
  FileText, 
  History,
  Trash2,
  Edit2,
  Type,
  Loader2,
  Sparkles
} from 'lucide-react';
import { DataManager, Note } from '../../utils/DataManager';
import { AIServiceFactory } from '../../pages/AI/services/serviceFactory';
import FloatingHomeButton from '../../components/FloatingHomeButton';

const WordCounter: React.FC = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'generating' | 'completed'>('idle');
  const [showMenu, setShowMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedResults, setSavedResults] = useState<Note[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('সংরক্ষিত');
  const [isRenaming, setIsRenaming] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Stats calculation
  const stats = useMemo(() => {
    const trimmedText = text.trim();
    if (!trimmedText) return { words: 0, sentences: 0, punctuation: 0, emojis: 0, size: 0 };

    const words = trimmedText.split(/\s+/).filter(w => w.length > 0).length;
    const sentences = trimmedText.split(/[.!?।]+/).filter(s => s.trim().length > 0).length;
    const punctuation = (text.match(/[.,!?;:।'"()\-]/g) || []).length;
    const emojis = (text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\u200D|\uFE0F/g) || []).length;
    const size = new Blob([text]).size; // Size in bytes

    return { words, sentences, punctuation, emojis, size };
  }, [text]);

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

  const handleSave = async () => {
    if (!text.trim()) return;

    setSaveStatus('generating');
    
    const aiTitle = await generateTitle(text);
    setNoteTitle(aiTitle);

    const report = `
## শব্দ গণনা রিপোর্ট
- **মোট শব্দ:** ${stats.words}
- **মোট বাক্য:** ${stats.sentences}
- **বিরাম চিহ্ন:** ${stats.punctuation}
- **ইমোজি:** ${stats.emojis}
- **কনটেক্সট সাইজ:** ${(stats.size / 1024).toFixed(2)} KB

---
### মূল টেক্সট:
${text}

<!-- TOOL_RESULT -->
    `;

    const newNote: Note = {
      id: currentNoteId || `tool-res-${Date.now()}`,
      title: `[Tool] ${aiTitle}`,
      content: report,
      emoji: '📊',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false
    };

    await DataManager.saveNote(newNote);
    setCurrentNoteId(newNote.id);
    setSaveStatus('completed');
    
    // Refresh history
    const allNotes = await DataManager.getAllNotes();
    setSavedResults(allNotes.filter(n => n.title.startsWith('[Tool]')));

    setTimeout(() => {
      setSaveStatus('idle');
    }, 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
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

  const handleDelete = async (id: string) => {
    await DataManager.deleteNote(id);
    if (id === currentNoteId) {
      setCurrentNoteId(null);
      setNoteTitle('সংরক্ষিত');
    }
    const allNotes = await DataManager.getAllNotes();
    setSavedResults(allNotes.filter(n => n.title.startsWith('[Tool]')));
    setShowMenu(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/tools');
              }
            }} 
            className="p-2 text-white/40 hover:text-white transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight">শব্দ গণনা যন্ত্র</h1>
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

      <main className="px-6 py-8 max-w-2xl mx-auto space-y-6">
        {/* Input Area */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">আপনার টেক্সট পেস্ট করুন</label>
            <div className="flex gap-2">
              <button 
                onClick={handleCopy}
                className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white transition-all"
                title="কপি করুন"
              >
                {copyFeedback ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
              <button 
                onClick={handleSave}
                disabled={!text.trim() || saveStatus !== 'idle'}
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
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="এখানে টেক্সট লিখুন বা পেস্ট করুন..."
            className="w-full h-64 bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 text-white/90 placeholder:text-white/10 focus:outline-none focus:border-white/10 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-20">
          {[
            { label: 'মোট শব্দ', value: stats.words, icon: <Hash size={14} className="text-blue-400" /> },
            { label: 'মোট বাক্য', value: stats.sentences, icon: <FileText size={14} className="text-purple-400" /> },
            { label: 'বিরাম চিহ্ন', value: stats.punctuation, icon: <Type size={14} className="text-green-400" /> },
            { label: 'ইমোজি', value: stats.emojis, icon: <span className="text-sm">😊</span> },
            { label: 'সাইজ (KB)', value: (stats.size / 1024).toFixed(2), icon: <Hash size={14} className="text-amber-400" /> }
          ].map((stat, idx) => (
            <div key={idx} className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                {stat.icon}
                <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{stat.label}</span>
              </div>
              <div className="text-xl font-black text-white/90">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Menu Overlay */}
        <AnimatePresence>
          {showMenu && (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMenu(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              >
                <div className="p-6 space-y-4">
                  <h3 className="font-bold text-lg">অপশন</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setIsRenaming(true)}
                      className="w-full flex items-center gap-3 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-left"
                    >
                      <Edit2 size={18} className="text-blue-400" />
                      <span className="font-medium">নাম পরিবর্তন করুন</span>
                    </button>
                    {currentNoteId && (
                      <button 
                        onClick={() => handleDelete(currentNoteId)}
                        className="w-full flex items-center gap-3 p-4 bg-red-500/10 rounded-2xl hover:bg-red-500/20 transition-all text-left text-red-400"
                      >
                        <Trash2 size={18} />
                        <span className="font-medium">মুছে ফেলুন</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
                          // Extract original text from report
                          const parts = result.content.split('### মূল টেক্সট:');
                          if (parts.length > 1) {
                            setText(parts[1].replace('<!-- TOOL_RESULT -->', '').trim());
                          }
                          setCurrentNoteId(result.id);
                          setNoteTitle(result.title.replace('[Tool] ', ''));
                          setShowHistory(false);
                        }}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
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

export default WordCounter;
