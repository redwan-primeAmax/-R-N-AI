/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Trash2, 
  Save, 
  Copy, 
  Check, 
  Type, 
  Loader2, 
  History,
  FileText,
  Sparkles,
  ToggleLeft
} from 'lucide-react';
import { DataManager, Note } from '../../../../services/storage/DataManager';
import { AIServiceFactory } from '../../../../services/serviceFactory';
import FloatingHomeButton from '../../../../components/FloatingHomeButton';

const NumberRemover: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [text, setText] = useState(location.state?.sourceText || '');
  const [removeEnglish, setRemoveEnglish] = useState(true);
  const [removeBengali, setRemoveBengali] = useState(true);
  const [trimSpaces, setTrimSpaces] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'generating' | 'completed'>('idle');
  const [showHistory, setShowHistory] = useState(false);
  const [savedResults, setSavedResults] = useState<Note[]>([]);
  const [noteTitle, setNoteTitle] = useState('অপসারিত সংখ্যা');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Compute processed text
  const { processedText, numbersRemovedCount } = useMemo(() => {
    if (!text) return { processedText: '', numbersRemovedCount: 0 };

    let cleaned = text;
    let count = 0;

    // Count English numbers
    if (removeEnglish) {
      const enMatches = text.match(/[0-9]/g);
      count += enMatches ? enMatches.length : 0;
      cleaned = cleaned.replace(/[0-9]/g, '');
    }

    // Count Bengali numbers
    if (removeBengali) {
      const bnMatches = text.match(/[০-৯]/g);
      count += bnMatches ? bnMatches.length : 0;
      cleaned = cleaned.replace(/[০-৯]/g, '');
    }

    // Trim extra white spaces
    if (trimSpaces) {
      // Replace consecutive spaces with a single space, but keep line breaks intact
      cleaned = cleaned.split('\n')
        .map(line => line.replace(/\s+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive line breaks
    }

    return { processedText: cleaned, numbersRemovedCount: count };
  }, [text, removeEnglish, removeBengali, trimSpaces]);

  // Load saved history of Tool notes
  useEffect(() => {
    const loadHistory = async () => {
      const allNotes = await DataManager.getAllNotes();
      const results = allNotes.filter(n => n.title.startsWith('[Tool-Remover]'));
      setSavedResults(results);
    };
    loadHistory();
  }, [saveStatus]);

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
      return 'সংরক্ষিত লেখা';
    }
  };

  const handleSave = async () => {
    if (!processedText.trim()) return;

    setSaveStatus('generating');
    
    const aiTitle = await generateTitle(processedText);
    const titleWithTag = `[Tool-Remover] ${aiTitle}`;
    setNoteTitle(aiTitle);

    const report = `
## সংখ্যা অপসারণ রিপোর্ট
- **অপসারিত মোট সংখ্যা:** ${numbersRemovedCount} টি
- **অপসারণ টাইপ:** ${removeEnglish ? 'ইংরেজি ' : ''}${removeBengali ? 'বাংলা' : ''}
- **অতিরিক্ত স্পেস ছাঁটাই:** ${trimSpaces ? 'হ্যাঁ' : 'না'}

---
### প্রক্রিয়াজাত টেক্সট:
${processedText}
`;

    try {
      const activeWorkspaceId = await DataManager.getActiveWorkspaceId();

      await DataManager.saveNote({
        id: crypto.randomUUID(),
        title: titleWithTag,
        content: report,
        emoji: '🧹',
        workspaceId: activeWorkspaceId || 'default',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isTrashed: false
      });

      setSaveStatus('completed');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save to notebook', err);
      setSaveStatus('idle');
    }
  };

  const handleCopy = () => {
    if (!processedText) return;
    navigator.clipboard.writeText(processedText).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const handleHistorySelect = (note: Note) => {
    // Extract original / processed text from saved report if possible
    const blockSplit = note.content.split('### প্রক্রিয়াজাত টেক্সট:\n');
    if (blockSplit.length > 1) {
      setText(blockSplit[1]);
    } else {
      setText(note.content);
    }
    setShowHistory(false);
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await DataManager.deleteNote(id);
      setSavedResults(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/tools')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors text-sm hover:bg-white/10"
        >
          <ChevronLeft className="w-4 h-4" />
          টুলস
        </button>

        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Type className="w-5 h-5 text-purple-400" />
          সংখ্যা অপসারণকারী (Number Remover)
        </h1>

        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors text-sm hover:bg-white/10"
        >
          <History className="w-4 h-4" />
          ইতিহাস ({savedResults.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Settings & Controls */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-[#1c1c1c] rounded-2xl border border-white/10 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2">সেটিংস</h2>
            
            {/* English numbers toggle */}
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-white/60 group-hover:text-white transition-colors">
                ইংরেজি সংখ্যা মুছুন (0-9)
              </span>
              <input 
                type="checkbox" 
                checked={removeEnglish} 
                onChange={(e) => setRemoveEnglish(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
            </label>

            {/* Bengali numbers toggle */}
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-white/60 group-hover:text-white transition-colors">
                বাংলা সংখ্যা মুছুন (০-৯)
              </span>
              <input 
                type="checkbox" 
                checked={removeBengali} 
                onChange={(e) => setRemoveBengali(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
            </label>

            {/* Extra space trim toggle */}
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-white/60 group-hover:text-white transition-colors">
                অতিরিক্ত স্পেস ছাঁটাই
              </span>
              <input 
                type="checkbox" 
                checked={trimSpaces} 
                onChange={(e) => setTrimSpaces(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>

          {/* Stats card */}
          {text && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1c1c1c] rounded-2xl border border-white/10 p-5 space-y-3 text-center"
            >
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">ফলাফল পরিসংখ্যান</div>
              <div className="text-3xl font-extrabold text-white">
                {numbersRemovedCount}
              </div>
              <div className="text-xs text-white/40">টি সংখ্যা অপসারিত হয়েছে</div>
            </motion.div>
          )}
        </div>

        {/* Right Side: Text areas */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-[#1c1c1c] rounded-2xl border border-white/10 p-5 space-y-4 flex flex-col min-h-[400px]">
            {/* Input label & clear button */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80">আপনার লেখা দিন:</span>
              {text && (
                <button
                  onClick={() => setText('')}
                  className="p-1 px-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-[10px] uppercase font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  সব মুছুন
                </button>
              )}
            </div>

            {/* Input Textarea */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="এখানে আপনার টেক্সট লিখুন বা পেস্ট করুন যাতে সংখ্যা রয়েছে..."
              className="w-full h-40 bg-white/5 border border-white/5 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/30 transition-all text-sm font-medium resize-none shadow-inner"
            />

            {/* Export/Processed visual actions */}
            <div className="flex flex-col flex-1 pt-4 border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/80">সংখ্যাবিহীন ফলাফল লেখা:</span>
              </div>

              {/* Readonly output box */}
              <div className="flex-1 min-h-[140px] bg-white/[0.02] border border-white/5 rounded-xl p-4 text-white text-sm font-medium whitespace-pre-wrap select-all relative group overflow-y-auto max-h-[220px]">
                {processedText ? (
                  processedText
                ) : (
                  <span className="text-white/20 italic">উপরে কোনো টেক্সট প্রবেশ করালে এখানে ফলাফল প্রদর্শিত হবে...</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 justify-end mt-2 pt-2">
                <button
                  disabled={!processedText}
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all active:scale-95 ${
                    copyFeedback 
                      ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:pointer-events-none'
                  }`}
                >
                  {copyFeedback ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      কপি হয়েছে!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      কপি করুন
                    </>
                  )}
                </button>

                <button
                  disabled={!processedText || saveStatus !== 'idle'}
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-all font-bold text-xs active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-[md]"
                >
                  {saveStatus === 'generating' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      সংরক্ষণ হচ্ছে...
                    </>
                  ) : saveStatus === 'completed' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      সংরক্ষিত!
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      নোটবুকে সংরক্ষণ করুন
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Side Panel Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end"
            onClick={() => setShowHistory(false)}
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#161616] border-l border-white/10 w-full max-w-md h-full flex flex-col p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-400" />
                    অপসারণ ইতিহাস
                  </h3>
                  <p className="text-white/40 text-[10px]">পূর্বে সংরক্ষিত ট্র্যাশ ও কন্টেন্ট</p>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs"
                >
                  বন্ধ করুন
                </button>
              </div>

              {/* Library list scroll */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {savedResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-white/20">
                    <FileText className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs">কোনো সংরক্ষিত ইতিহাস পাওয়া যায়নি</p>
                  </div>
                ) : (
                  savedResults.map((note) => {
                    const cleanTitle = note.title.replace('[Tool-Remover] ', '');
                    return (
                      <div 
                        key={note.id}
                        onClick={() => handleHistorySelect(note)}
                        className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer group flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate mb-1">
                            {cleanTitle}
                          </h4>
                          <p className="text-[10px] text-white/40 truncate">
                            {new Date(note.createdAt).toLocaleDateString('bn-BD', {
                              hour: 'numeric',
                              minute: 'numeric',
                            })}
                          </p>
                        </div>
                        
                        <button
                          onClick={(e) => handleDeleteHistory(note.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingHomeButton />
    </div>
  );
};

export default NumberRemover;
