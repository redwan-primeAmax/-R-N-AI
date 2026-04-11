/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Type, 
  Hash, 
  FileText, 
  ChevronRight, 
  History, 
  Menu,
  Wrench,
  Search
} from 'lucide-react';
import { DataManager, Note } from '../../utils/DataManager';

const categories = [
  {
    id: 'text',
    name: 'টেক্সট ভিত্তিক টুলস',
    icon: <Type className="text-blue-400" />,
    tools: [
      {
        id: 'word-counter',
        name: 'শব্দ গণনা যন্ত্র',
        description: 'শব্দ, বাক্য, বিরাম চিহ্ন এবং ইমোজি গণনা করুন।',
        path: '/tools/word-counter',
        icon: <Hash className="text-blue-400" />
      },
      {
        id: 'number-remover',
        name: 'সংখ্যা অপসারণ টুল',
        description: 'টেক্সট থেকে সমস্ত সংখ্যা মুছে ফেলুন।',
        path: '/tools/number-remover',
        icon: <Type className="text-purple-400" />
      },
      {
        id: 'summarizer',
        name: 'সারসংক্ষেপ তৈরির টুল',
        description: 'এআই ব্যবহার করে টেক্সট সারসংক্ষেপ করুন।',
        path: '/tools/summarizer',
        icon: <FileText className="text-green-400" />
      }
    ]
  }
];

const ToolsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [savedResults, setSavedResults] = useState<Note[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadSavedResults = async () => {
      const allNotes = await DataManager.getAllNotes();
      // Filter notes that are tool results (we'll tag them in the title or content for now)
      const results = allNotes.filter(n => n.title.startsWith('[Tool]') || n.content.includes('<!-- TOOL_RESULT -->'));
      setSavedResults(results);
    };
    loadSavedResults();
  }, []);

  const filteredTools = categories.map(cat => ({
    ...cat,
    tools: cat.tools.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.tools.length > 0);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
            <Wrench size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">টুল লাইব্রেরি</h1>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all"
        >
          <History size={20} />
        </button>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto space-y-8">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input 
            type="text"
            placeholder="টুল খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-white/20 transition-all"
          />
        </div>

        {/* Tool Categories */}
        {filteredTools.map(category => (
          <section key={category.id} className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              {category.icon}
              <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">{category.name}</h2>
            </div>
            <div className="grid gap-4">
              {category.tools.map(tool => (
                <motion.button
                  key={tool.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(tool.path)}
                  className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 flex items-center gap-4 text-left hover:bg-[#222222] transition-all group"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-all">
                    {tool.icon}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-white/90">{tool.name}</h3>
                    <p className="text-xs text-white/40 mt-1">{tool.description}</p>
                  </div>
                  <ChevronRight size={18} className="text-white/20 group-hover:text-white/40 transition-all" />
                </motion.button>
              ))}
            </div>
          </section>
        ))}

        {/* Saved Results History (Overlay or Section) */}
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">সংরক্ষিত ফলাফল</h2>
              <button onClick={() => setShowHistory(false)} className="text-xs text-white/40 hover:text-white">বন্ধ করুন</button>
            </div>
            <div className="space-y-3">
              {savedResults.length === 0 ? (
                <p className="text-center py-8 text-white/20 italic">কোনো সংরক্ষিত ফলাফল নেই</p>
              ) : (
                savedResults.map(result => (
                  <button
                    key={result.id}
                    onClick={() => navigate(`/editor/${result.id}`)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-blue-400" />
                      <span className="text-sm font-medium">{result.title.replace('[Tool] ', '')}</span>
                    </div>
                    <span className="text-[10px] text-white/20">{new Date(result.updatedAt).toLocaleDateString()}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default ToolsDashboard;
