/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Settings, 
  Sparkles, 
  Check, 
  X, 
  Play, 
  Zap, 
  Trash2, 
  AlertTriangle,
  Clock,
  Database,
  Tag
} from 'lucide-react';
import { DataManager } from '../../../../services/storage/DataManager';
import { db } from '../../../../services/storage/DexieDB';
import FloatingHomeButton from '../../../../components/FloatingHomeButton';

// High frequency dictionary for search testing
const BENGALI_WORDS = [
  'প্রজেক্ট', 'ডেভেলপমেন্ট', 'এআই', 'রিসার্চ', 'রিপোর্ট', 'মিটিং', 'শিডিউল', 'ফাইন্যান্সিয়াল', 'অডিট', 'কোড', 
  'অপটিমাইজেশন', 'ভবিষ্যৎ', 'লক্ষ্য', 'ব্যক্তিগত', 'দিনলিপি', 'নতুন', 'প্রযুক্তির', 'ব্যবহার', 'মাখন', 'গতি', 
  'আজকের', 'কাজের', 'তালিকা', 'উন্নয়ন', 'পরিকল্পনা', 'বিজনেস', 'গ্রোথ', 'স্ট্যাটিস্টিক্স', 'অ্যানালিটিক্স', 'ডাটাবেজ',
  'রানিং', 'সার্ভার', 'টুলস', 'অ্যাপ্লিকেশন', 'সফটওয়্যার', 'আইডিয়া', 'ব্রেনস্টর্মিং', 'স্মার্ট', 'সহকারী', 'বাংলা',
  'গাড়ি', 'যানবাহন', 'গতিশীল', 'মসৃণ', 'সুবিধা', 'জরুরি', 'প্রয়োজনীয়', 'নোটবুক', 'খাতা', 'পত্রিকা', 'ইতিহাস'
];

const ENGLISH_WORDS = [
  'project', 'development', 'ai', 'research', 'report', 'meeting', 'schedule', 'financial', 'audit', 'code',
  'optimization', 'future', 'goal', 'personal', 'journal', 'new', 'technology', 'use', 'butter', 'speed',
  'today', 'to-do', 'list', 'improvement', 'planning', 'business', 'growth', 'statistics', 'analytics', 'database',
  'running', 'server', 'tools', 'application', 'software', 'idea', 'brainstorming', 'smart', 'assistant', 'english',
  'car', 'vehicle', 'fast', 'smooth', 'advantage', 'urgent', 'important', 'notebook', 'diary', 'paper', 'history',
  'framework', 'compiler', 'performance', 'benchmark', 'latency', 'memory', 'leak', 'index', 'engine'
];

const AVAILABLE_TAGS = [
  'work', 'personal', 'ai', 'research', 'finance', 'coding', 'meeting', 'database', 'testing', 'scale',
  'performance', 'speed', 'butter', 'car', 'fast', 'smooth', 'urgent', 'important', 'daily', 'archive',
  'gari', 'gadi', 'task', 'todo', 'study', 'science', 'math', 'project', 'client', 'design', 'review'
];

export const NoteGenerator: React.FC = () => {
  const navigate = useNavigate();
  
  // Custom states
  const [thousandsCount, setThousandsCount] = useState<number>(10); // Default 10k notes (10 thousands)
  const [tagsCount, setTagsCount] = useState<number>(5); // Default 5 tags per note
  const [clearExisting, setClearExisting] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [notesGenerated, setNotesGenerated] = useState<number>(0);
  const [generationSpeed, setGenerationSpeed] = useState<number>(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);
  const [dbNotesCount, setDbNotesCount] = useState<number>(0);

  // Cancellation ref for non-blocking loop
  const cancelRef = useRef<boolean>(false);

  // Load active DB count on mount
  const refreshDbCount = async () => {
    try {
      const count = await db.notes.count();
      setDbNotesCount(count);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshDbCount();
  }, []);

  // Timer simulation during generation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGenerating) {
      const start = Date.now();
      timer = setInterval(() => {
        setElapsedTime(Math.round((Date.now() - start) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(timer);
  }, [isGenerating]);

  // Handle Cancel Operation
  const handleCancel = () => {
    cancelRef.current = true;
    setStatusMessage('বাতিল করা হচ্ছে...');
  };

  // Bulk Generator Execution
  const runGenerator = async () => {
    if (isGenerating) return;

    const totalNotesToGenerate = thousandsCount * 1000;
    if (totalNotesToGenerate <= 0) return;

    setIsGenerating(true);
    cancelRef.current = false;
    setProgress(0);
    setNotesGenerated(0);
    setGenerationSpeed(0);
    setEstimatedTimeRemaining(0);
    setStatusMessage('প্রস্তুতি নেওয়া হচ্ছে...');

    try {
      const activeWorkspaceId = await DataManager.getActiveWorkspaceId();

      // 1. Optional Database Purging
      if (clearExisting) {
        setStatusMessage('পূর্বের সব নোট মুছে ফেলা হচ্ছে...');
        await db.notes.clear();
        await refreshDbCount();
      }

      const chunkSize = 2000; // Optimal chunk-size for IndexedDB bulkPut
      const startTime = Date.now();
      
      let generatedSoFar = 0;

      // 2. Generation Loop
      while (generatedSoFar < totalNotesToGenerate && !cancelRef.current) {
        const currentBatchSize = Math.min(chunkSize, totalNotesToGenerate - generatedSoFar);
        const batchNotes = [];

        for (let i = 0; i < currentBatchSize; i++) {
          const index = generatedSoFar + i + 1;
          
          // Construct realistic title with queryable words
          const useBengali = Math.random() > 0.5;
          const wordSource = useBengali ? BENGALI_WORDS : ENGLISH_WORDS;
          
          const titleWords = [];
          const numTitleWords = 2 + Math.floor(Math.random() * 4);
          for (let w = 0; w < numTitleWords; w++) {
            titleWords.push(wordSource[Math.floor(Math.random() * wordSource.length)]);
          }
          const rawTitle = titleWords.join(' ');
          const title = `${rawTitle} (#${index})`;

          // Construct body content with random sentences
          const paragraphs = [];
          const numParagraphs = 1 + Math.floor(Math.random() * 3);
          for (let p = 0; p < numParagraphs; p++) {
            const sentenceArr = [];
            const numSentences = 2 + Math.floor(Math.random() * 4);
            for (let s = 0; s < numSentences; s++) {
              const wordsArr = [];
              const numWords = 5 + Math.floor(Math.random() * 10);
              for (let w = 0; w < numWords; w++) {
                const dict = Math.random() > 0.6 ? BENGALI_WORDS : ENGLISH_WORDS;
                wordsArr.push(dict[Math.floor(Math.random() * dict.length)]);
              }
              const sentence = wordsArr.join(' ');
              sentenceArr.push(useBengali ? `${sentence}।` : `${sentence}.`);
            }
            paragraphs.push(`<p>${sentenceArr.join(' ')}</p>`);
          }
          const content = paragraphs.join('\n');

          // Choose random tags based on user input tagsCount
          const uniqueTags = new Set<string>();
          const attempts = tagsCount * 3; // Retry budget to reach unique tags
          for (let t = 0; t < attempts && uniqueTags.size < tagsCount; t++) {
            // Mix pre-defined keys with rare terms to evaluate exact/synonym expansion
            const tagVal = Math.random() > 0.3 
              ? AVAILABLE_TAGS[Math.floor(Math.random() * AVAILABLE_TAGS.length)]
              : `test-tag-${Math.floor(Math.random() * 50)}`;
            uniqueTags.add(tagVal);
          }

          // Random emojis
          const emojis = ['📄', '📝', '📂', '📑', '🔬', '💡', '🔥', '⚙️', '🚀', '📊', '⚡', '🚗', '🛑'];
          const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

          batchNotes.push({
            id: `sec-gen-${crypto.randomUUID()}`,
            title,
            content,
            emoji: randomEmoji,
            createdAt: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30), // Random timestamp in past 30 days
            updatedAt: Date.now(),
            workspaceId: activeWorkspaceId,
            isTrashed: false,
            isFavorite: Math.random() > 0.9,
            isPinned: false,
            isLocked: false,
            tags: Array.from(uniqueTags)
          });
        }

        // Write chunk directly to IndexedDB
        setStatusMessage(`ডাটাবেজ এ রাইট করা হচ্ছে... (${generatedSoFar} সম্পন্ন)`);
        await db.notes.bulkPut(batchNotes);

        generatedSoFar += currentBatchSize;
        
        // Calculate metrics
        const now = Date.now();
        const durationSeconds = (now - startTime) / 1000 || 1;
        const speed = Math.round(generatedSoFar / durationSeconds);
        const completionRaw = (generatedSoFar / totalNotesToGenerate) * 100;
        const estRemaining = speed > 0 ? (totalNotesToGenerate - generatedSoFar) / speed : 0;

        setNotesGenerated(generatedSoFar);
        setGenerationSpeed(speed);
        setEstimatedTimeRemaining(Math.round(estRemaining));
        setProgress(Math.round(completionRaw));

        // Yield main thread back to React render for smooth updates without lag
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (cancelRef.current) {
        setStatusMessage('জেনারেশন বাতিল করা হয়েছে।');
      } else {
        setStatusMessage('সাকসেস! সব নোট সফলভাবে ডাটাবেজে যুক্ত হয়েছে।');
        setProgress(100);
      }

    } catch (e: any) {
      console.error(e);
      setStatusMessage(`এরর ঘটেছে: ${e.message || e}`);
    } finally {
      setIsGenerating(false);
      DataManager.triggerSync('NOTES_UPDATE'); // Force sidebar/editor index refrehes
      refreshDbCount();
    }
  };

  // Delete all Dummy Notes generated by this tool
  const handleDeleteAllGenerated = async () => {
    setIsGenerating(true);
    setStatusMessage('জেনারেট করা সব ডামি নোট সংগ্রহ করা হচ্ছে...');
    try {
      const generatedNotes = await db.notes.filter(n => n.id.startsWith('sec-gen-')).toArray();
      const ids = generatedNotes.map(n => n.id);
      
      if (ids.length > 0) {
        setStatusMessage(`ডাটাবেজ থেকে ${ids.length} টি ডামি নোট মুছে ফেলা হচ্ছে...`);
        await db.notes.bulkDelete(ids);
        setStatusMessage('সব ডামি নোট স্থায়ীভাবে ডিলিট করা হয়েছে।');
      } else {
        setStatusMessage('কোনো ডামি নোট খুঁজে পাওয়া যায়নি!');
      }
    } catch (e: any) {
      setStatusMessage(`মুছে ফেলতে সমস্যা হয়েছে: ${e.message}`);
    } finally {
      setIsGenerating(false);
      setShowConfirmClear(false);
      DataManager.triggerSync('NOTES_UPDATE');
      refreshDbCount();
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white pb-32">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (isGenerating) {
                if (window.confirm('জেনারেশন চলছে! আপনি কি সত্যিই ফিরে যেতে চান?')) {
                  handleCancel();
                  navigate('/tools');
                }
              } else {
                navigate('/tools');
              }
            }} 
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            title="ফিরে যান"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight">High-Speed Note Generator</h1>
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Scale Benchmarking Utility</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
            <Database size={12} className="text-blue-400" />
            <span className="text-[10px] font-bold text-blue-400 font-mono">
              Total Notes: {dbNotesCount.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      <main className="px-6 py-10 max-w-xl mx-auto space-y-8">
        
        {/* Intro Info Banner */}
        <div className="bg-[#141414] border border-white/5 p-6 rounded-3xl space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -z-10" />
          <div className="flex items-center gap-2 text-blue-400">
            <Sparkles size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">সার্চ ইঞ্জিন টেস্টিং টুল</span>
          </div>
          <h2 className="text-lg font-bold">১০ মিনিট টার্গেট স্পিড বেঞ্চমার্কিং</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            এই জেনারেটর টুলটি দিয়ে আপনি এক ক্লিকে হাজার হাজার বাংলা ও ইংরেজি নোট তৈরি করতে পারবেন। প্রতিটি নোটে আপনার দেওয়া ট্যাগ সংখ্যা অনুযায়ী ট্যাগ যোগ করা হবে। এর সাহায্যে আমাদের নতুন <strong>RST (Redwan Smart & Tiny)</strong> সার্চের স্পিড, মেমোরি দক্ষতা এবং ১০ জিবি থেকে ৪০ জিবির স্কেল হ্যান্ডেলিং ক্ষমতা নিখুঁতভাবে পরীক্ষা করতে পারবেন।
          </p>
        </div>

        {/* Input Settings panel */}
        <div className="bg-[#121212] border border-white/5 rounded-[2rem] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Settings size={18} className="text-white/40" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">প্যারামিটার কনফিগারেশন</h3>
          </div>

          <div className="space-y-4">
            {/* Thousands Input Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white/80">কত হাজার নোট বানাবেন?</span>
                <span className="text-blue-400 font-mono font-bold bg-blue-500/10 px-2.5 py-1 rounded-lg">
                  {(thousandsCount * 1000).toLocaleString()} টি নোট
                </span>
              </div>
              <div className="flex gap-4 items-center">
                <input 
                  type="range"
                  min="1"
                  max="100"
                  value={thousandsCount}
                  onChange={(e) => setThousandsCount(parseInt(e.target.value, 10))}
                  disabled={isGenerating}
                  className="flex-grow h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <input 
                  type="number"
                  min="1"
                  max="1000"
                  value={thousandsCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setThousandsCount(isNaN(val) ? 1 : Math.max(1, Math.min(1000, val)));
                  }}
                  disabled={isGenerating}
                  className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center text-sm font-bold font-mono focus:outline-none focus:border-blue-500/50"
                />
                <span className="text-xs font-bold text-white/40">হাজার</span>
              </div>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {[1, 5, 10, 25, 50, 100].map(val => (
                  <button
                    key={val}
                    onClick={() => setThousandsCount(val)}
                    disabled={isGenerating}
                    className={`text-[10px] uppercase font-mono font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      thousandsCount === val 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {val}K Notes
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-white/5" />

            {/* Tags per Note Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white/80">প্রতি নোটে কয়টি করে ট্যাগ থাকবে?</span>
                <span className="text-purple-400 font-mono font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg">
                  {tagsCount} টি ইউনিক ট্যাগ
                </span>
              </div>
              <div className="flex gap-4 items-center">
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={tagsCount}
                  onChange={(e) => setTagsCount(parseInt(e.target.value, 10))}
                  disabled={isGenerating}
                  className="flex-grow h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <input 
                  type="number"
                  min="0"
                  max="200"
                  value={tagsCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setTagsCount(isNaN(val) ? 0 : Math.max(0, Math.min(200, val)));
                  }}
                  disabled={isGenerating}
                  className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center text-sm font-bold font-mono focus:outline-none focus:border-purple-500/50"
                />
                <span className="text-xs font-bold text-white/40">ট্যাগ</span>
              </div>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {[0, 5, 10, 20, 50, 100].map(val => (
                  <button
                    key={val}
                    onClick={() => setTagsCount(val)}
                    disabled={isGenerating}
                    className={`text-[10px] uppercase font-mono font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      tagsCount === val 
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {val} Tags
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-white/5" />

            {/* Purge Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold">পূর্বের সব নোট মুছে ফেলবেন?</h4>
                  <p className="text-[10px] text-white/40">জেনারেট করার আগে ডাটাবেজ ফ্লাশ করা হবে</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClearExisting(!clearExisting)}
                disabled={isGenerating}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${
                  clearExisting ? 'bg-orange-500' : 'bg-white/10'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-lg transform transition-transform ${
                  clearExisting ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Action Control Button */}
          {!isGenerating ? (
            <button
              onClick={runGenerator}
              className="w-full py-4.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2.5"
            >
              <Zap size={16} />
              Generate notes now (জেনারেশন শুরু করুন)
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="w-full py-4.5 bg-red-600/20 hover:bg-red-600/30 active:scale-95 text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-red-500/20 flex items-center justify-center gap-2.5"
            >
              <X size={16} />
              Cancel generation (বাতিল করুন)
            </button>
          )}
        </div>

        {/* Real-time Progress & Diagnostics */}
        <AnimatePresence>
          {isGenerating || progress > 0 ? (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-[#121212] border border-white/5 rounded-[2rem] p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-blue-400 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 animate-pulse">
                    {progress === 100 ? 'জেনারেশন সম্পন্ন!' : 'মাইক্রো-টাস্ক প্রসেসিং...'}
                  </h3>
                </div>
                <span className="text-sm font-black font-mono text-white/90">{progress}%</span>
              </div>

              {/* Progress Bar container */}
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  className={`h-full ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeInOut", duration: 0.2 }}
                />
              </div>

              {/* Advanced Diagnostics Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">মোট সফল নোট</span>
                  <div className="text-lg font-mono font-black text-white/90">
                    {notesGenerated.toLocaleString()} / {(thousandsCount * 1000).toLocaleString()}
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">কিলোজেনারেশন স্পিড</span>
                  <div className="text-lg font-mono font-black text-blue-400">
                    {generationSpeed.toLocaleString()} <span className="text-xs font-sans text-white/40">নোট/সেঃ</span>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">সময় অতিবাহিত</span>
                  <div className="text-lg font-mono font-black text-white/90">
                    {elapsedTime} <span className="text-xs font-sans text-white/40">সেকেন্ড</span>
                  </div>
                </div>

                <div className="bg-[#1e1515]/20 border border-red-500/5 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-red-400/40 tracking-widest">বাকি আছে (আনুমানিক)</span>
                  <div className="text-lg font-mono font-black text-purple-400">
                    {estimatedTimeRemaining} <span className="text-xs font-sans text-white/40">সেকেন্ড</span>
                  </div>
                </div>
              </div>

              {/* State label status */}
              <div className="text-center p-3.5 bg-white/5 rounded-2xl text-xs flex items-center justify-center gap-2">
                {isGenerating && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />}
                <p className="font-medium text-white/60">{statusMessage}</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Database cleanup button */}
        <div className="pt-4 border-t border-white/5">
          <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-3xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-500/15 rounded-2xl flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-red-400">ডিলিট অপশন (সেফটি গার্ড)</h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  এই বাটনে ক্লিক করলে আপনার ডাটাবেজ থেকে শুধুমাত্র এই জেনারেটরের তৈরি কৃত ডামি নোটগুলো এক ক্লিকে স্থায়ীভাবে ডিলিট হয়ে যাবে। আপনার নিজের তৈরি করা গুরুত্বপূর্ণ কোনো ব্রেন-নোট এবং দরকারি ডাটা নিরাপদ থাকবে।
                </p>
              </div>
            </div>

            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                disabled={isGenerating}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs uppercase tracking-wider rounded-2xl border border-red-500/10 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={14} />
                Delete all generated dummy notes (ডামি নোটগুলো মুছে ফেলুন)
              </button>
            ) : (
              <div className="space-y-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                <p className="text-xs font-bold text-red-400 text-center uppercase tracking-wider">
                  আপনি কি সত্যিই এই টুলের তৈরি সব ডামি নোট ডিলিট করতে চান?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all text-white/80"
                  >
                    না, বাতিল (Cancel)
                  </button>
                  <button
                    onClick={handleDeleteAllGenerated}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-black text-white transition-all shadow-lg shadow-red-600/10"
                  >
                    হ্যাঁ, ডিলিট করুন (Yes, Delete)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      <FloatingHomeButton />
    </div>
  );
};

export default NoteGenerator;
