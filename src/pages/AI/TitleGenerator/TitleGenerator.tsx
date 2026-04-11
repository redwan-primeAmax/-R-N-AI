/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Sparkles, RefreshCw, Check, Search, FileText, Loader2 } from 'lucide-react';
import { DataManager, Note, AISettings } from '../../../utils/DataManager';
import { generateTitles } from './titleGeneratorLogic';

import { aiManager } from '../../../services/AIService';

const TitleGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [titles, setTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('picoapps');

  useEffect(() => {
    DataManager.getAllNotes().then(setNotes);
    DataManager.getAISettings().then(s => {
      setSettings(s);
      setSelectedProvider(s.selectedProvider || 'picoapps');
    });
  }, []);

  useEffect(() => {
    if (!selectedNote) return;
    const taskId = `title-gen-${selectedNote.id}`;
    const unsubscribe = aiManager.subscribe((tasks) => {
      const task = tasks.get(taskId);
      if (task) {
        setIsLoading(task.status === 'generating');
        if (task.status === 'error') setError(task.reason);
        if (task.status === 'idle') setError(null);
      }
    });
    return () => unsubscribe();
  }, [selectedNote]);

  const handleGenerate = async () => {
    if (!selectedNote) return;
    setIsLoading(true);
    setError(null);
    setTitles([]);
    
    await generateTitles(
      selectedNote,
      selectedProvider,
      (newTitles) => {
        setTitles(newTitles);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );
  };

  const handleApplyTitle = async (title: string) => {
    if (!selectedNote) return;
    const updatedNote = { ...selectedNote, title, updatedAt: Date.now() };
    await DataManager.saveNote(updatedNote);
    setSelectedNote(updatedNote);
    // Show success state briefly?
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#191919] text-white flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#191919]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-full transition-all text-white active:scale-95"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles size={20} className="text-blue-400" />
            Title Generator
          </h1>
        </div>
        
        {settings && (
          <div className="flex items-center gap-2">
            <select 
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:border-white/20 appearance-none cursor-pointer hover:bg-white/10 transition-all"
            >
              <option value="picoapps">PicoApps (Free)</option>
              {settings.enabledProviders.includes('gemini') && <option value="gemini">Gemini</option>}
              {settings.enabledProviders.includes('openrouter') && <option value="openrouter">OpenRouter</option>}
              {settings.enabledProviders.includes('mistral') && <option value="mistral">Mistral AI</option>}
            </select>
          </div>
        )}
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8">
        {/* Step 1: Pick Note */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white">1</span>
            Pick a Note
          </h2>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredNotes.map(note => (
              <button
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  selectedNote?.id === note.id 
                    ? 'bg-blue-500/20 border-blue-500/50' 
                    : 'bg-white/5 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg">
                  {note.emoji || '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{note.title}</p>
                  <p className="text-[10px] text-white/30 truncate">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedNote?.id === note.id && <Check size={16} className="text-blue-400" />}
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Generate */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white">2</span>
            Generate Titles
          </h2>
          
          <button
            onClick={handleGenerate}
            disabled={!selectedNote || isLoading}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
              !selectedNote || isLoading
                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                : 'bg-white text-black hover:bg-white/90 active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Sparkles size={20} />
            )}
            {titles.length > 0 ? 'Regenerate Titles' : 'Generate 10 Titles'}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
              <RefreshCw size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {isLoading && titles.length === 0 && (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                      key={`skeleton-${i}`}
                      initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                      transition={{ 
                        duration: 0.8, 
                        repeat: Infinity, 
                        repeatType: 'reverse', 
                        delay: i * 0.1,
                        ease: "easeInOut"
                      }}
                      className="w-full h-16 bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/5 rounded-2xl relative overflow-hidden"
                    >
                      <motion.div 
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                      />
                    </motion.div>
                  ))}
                </div>
              )}
              {titles.map((title, index) => (
                <motion.button
                  key={`${title}-${index}`}
                  initial={{ opacity: 0, y: 20, rotateX: -45, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
                  transition={{ 
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    delay: index * 0.08 
                  }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleApplyTitle(title)}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all text-left group relative overflow-hidden ${
                    selectedNote?.title === title
                      ? 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                      : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${selectedNote?.title === title ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'bg-white/10'}`} />
                    <span className={`text-sm font-semibold truncate ${selectedNote?.title === title ? 'text-blue-400' : 'text-white/80 group-hover:text-white'}`}>
                      {title}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {selectedNote?.title === title ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
                      >
                        <Check size={14} className="text-white" />
                      </motion.div>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 text-[9px] font-black text-blue-400 uppercase tracking-tighter bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                        Use Title
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TitleGenerator;
