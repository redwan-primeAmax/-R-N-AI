/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Sparkles, RefreshCw, Check, Search, FileText, Loader2, Copy } from 'lucide-react';
import { DataManager, Note, AISettings } from '../../../../services/storage/DataManager';
import { AIServiceFactory } from '../../../../services/serviceFactory';
import TurndownService from 'turndown';
import FloatingHomeButton from '../../../../components/FloatingHomeButton';

const turndownService = new TurndownService();

const TitleGenerator: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [titles, setTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const allNotes = await DataManager.getAllNotes();
      setNotes(allNotes.filter(n => !n.isTrashed));
      
      const s = await DataManager.getAISettings();
      setSettings(s);
    };
    init();
  }, []);

  const handleGenerate = async () => {
    if (!selectedNote) return;
    setIsLoading(true);
    setError(null);
    setTitles([]);
    
    try {
      if (!settings) return;
      const provider = settings.selectedProvider || 'picoapps';
      const service = AIServiceFactory.getService(provider);
      
      // Load prompt
      let systemPrompt = "Suggest 10 titles for this note.";
      try {
        const promptResponse = await fetch('/prompts/title_generator.txt');
        if (promptResponse.ok) {
          systemPrompt = await promptResponse.text();
        }
      } catch (e) {
        console.warn("Failed to load custom prompt, using default.");
      }
      
      const markdownContent = selectedNote.content ? turndownService.turndown(selectedNote.content) : "(No content)";
      const userPrompt = `Note Title: ${selectedNote.title}\nNote Content:\n${markdownContent}`;

      const enhancedSystemPrompt = `${systemPrompt}\n\nSTRICT RULES:\n1. Generate EXACTLY 10 to 15 titles.\n2. NO special characters, NO punctuation, NO brackets (only plain text).\n3. Keep titles very concise (MAX 5-7 words).\n4. NO emojis.\n5. Contextually relevant to the note content.`;

      const response = await service.sendMessage(userPrompt, {
        settings,
        systemPrompt: enhancedSystemPrompt
      });

      const generatedTitles = response
        .split('\n')
        .map(line => {
          // Remove numbering (1., 2., etc), dashes (-), and stars (*)
          let cleaned = line.replace(/^[0-9]+[\.\)\- ]+\s*/, '') 
            .replace(/^[*\-\+]\s*/, '')
            .replace(/[\[\]\(\)\{\}]/g, '') // Remove brackets
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\u200D|\uFE0F/g, '') // Remove emojis
            .replace(/[#*_~`]/g, '') // Remove markdown artifacts
            .trim();
          
          return cleaned;
        })
        .filter(line => {
          // A valid title should have at least 2 words to be meaningful
          return line.length > 5 && line.split(/\s+/).length >= 2;
        })
        .slice(0, 10);
      
      setTitles(generatedTitles);
    } catch (err: any) {
      setError(err.message || 'Failed to generate titles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTitle = async (title: string) => {
    if (!selectedNote) return;
    const updatedNote = { ...selectedNote, title, updatedAt: Date.now() };
    await DataManager.saveNote(updatedNote);
    setSelectedNote(updatedNote);
    
    // Update local list
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    
    setCopyFeedback(title);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleCopy = async (title: string) => {
    try {
      await navigator.clipboard.writeText(title);
      setCopyFeedback(title + '_copied');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/tools')}
            className="p-2 text-white/40 hover:text-white transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight">Title Generator</h1>
            <span className="text-[10px] text-white/20 uppercase tracking-widest text-[9px]">Text Utility</span>
          </div>
        </div>
        
        {settings && (
          <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5">
            <span className="text-[8px] font-black uppercase tracking-widest text-white/40">
              Provider: {settings.selectedProvider || 'PicoApps'}
            </span>
          </div>
        )}
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8 pb-32">
        {/* Step 1: Pick Note */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] text-white/40 border border-white/5">1</span>
              Pick a Note
            </h2>
            {selectedNote && (
               <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">Selected</span>
            )}
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Search notes to improve..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-white/20 transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
            {filteredNotes.length === 0 ? (
               <div className="py-10 text-center text-white/20 text-xs italic">No notes found</div>
            ) : filteredNotes.map(note => (
              <button
                key={note.id}
                onClick={() => {
                  setSelectedNote(note);
                  setTitles([]);
                  setError(null);
                }}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left group ${
                  selectedNote?.id === note.id 
                    ? 'bg-blue-500/10 border-blue-500/30' 
                    : 'bg-white/5 border-white/5 hover:border-white/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-colors ${
                  selectedNote?.id === note.id ? 'bg-blue-500/20' : 'bg-white/5 group-hover:bg-white/10'
                }`}>
                  {note.emoji || '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-white/90">{note.title || 'Untitled Note'}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/10 mt-0.5">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedNote?.id === note.id && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check size={16} className="text-blue-400" />
                  </motion.div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Generate */}
        <section className="space-y-4 pt-4">
          <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] text-white/40 border border-white/5">2</span>
            Generate Ideas
          </h2>
          
          <button
            onClick={handleGenerate}
            disabled={!selectedNote || isLoading}
            className={`w-full py-4.5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${
              !selectedNote || isLoading
                ? 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5'
                : 'bg-white text-black hover:bg-white/90 active:scale-[0.98] shadow-xl shadow-white/5'
            }`}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
            {titles.length > 0 ? 'Regenerate' : 'Generate Suggestions'}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[11px] font-bold uppercase tracking-wider flex items-center gap-3"
            >
              <RefreshCw size={14} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {isLoading && titles.length === 0 && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={`skeleton-${i}`} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              )}
              
              {titles.map((title, index) => (
                <motion.div
                  key={`${title}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`w-full flex items-center justify-between p-4 px-5 rounded-2xl border transition-all text-left group overflow-hidden ${
                    selectedNote?.title === title
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-[#1a1a1a] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedNote?.title === title ? 'bg-blue-400' : 'bg-white/10'}`} />
                    <span className={`text-sm font-bold truncate ${selectedNote?.title === title ? 'text-blue-400' : 'text-white/80'}`}>
                      {title}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleCopy(title)}
                      className="p-2 text-white/20 hover:text-white transition-colors"
                    >
                      {copyFeedback === title + '_copied' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                    <button
                        onClick={() => handleApplyTitle(title)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            selectedNote?.title === title 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        {selectedNote?.title === title ? 'Applied' : 'Use'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>
      <FloatingHomeButton />
    </div>
  );
};

export default TitleGenerator;
