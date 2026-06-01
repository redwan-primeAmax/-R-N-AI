/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Type, 
  Hash, 
  FileText, 
  ChevronRight, 
  History, 
  Menu,
  Wrench,
  Search,
  FolderOpen,
  Archive,
  Sparkles,
  Zap
} from 'lucide-react';
import { DataManager, Note } from '../../services/storage/DataManager';
import FloatingHomeButton from '../../components/FloatingHomeButton';

const categories = [
  {
    id: 'text',
    name: 'Text Based Tools',
    icon: <Type className="text-blue-400" />,
    tools: [
      {
        id: 'title-generator',
        name: 'Title Generator',
        description: 'Generate high-quality titles for your notes.',
        path: '/tools/title-generator',
        icon: <Sparkles className="text-blue-400" />
      },
      {
        id: 'word-counter',
        name: 'Word Counter',
        description: 'Count words, sentences, punctuation, and emojis.',
        path: '/tools/word-counter',
        icon: <Hash className="text-blue-400" />
      },
      {
        id: 'number-remover',
        name: 'Number Remover',
        description: 'Remove all numbers from your text.',
        path: '/tools/number-remover',
        icon: <Type className="text-purple-400" />
      },
      {
        id: 'summarizer',
        name: 'AI Summarizer',
        description: 'Summarize text using artificial intelligence.',
        path: '/tools/summarizer',
        icon: <FileText className="text-green-400" />
      }
    ]
  },
  {
    id: 'file',
    name: 'File Tools',
    icon: <FolderOpen className="text-orange-400" />,
    tools: [
      {
        id: 'zip-flattener',
        name: 'ZIP Path Flattener',
        description: 'Flatten nested ZIP paths into a single root directory.',
        path: '/tools/zip-flattener',
        icon: <Archive className="text-orange-400" />
      },
      {
        id: 'note-generator',
        name: 'High-Speed Note Generator',
        description: 'Generate thousands of queryable notes to test search scale.',
        path: '/tools/note-generator',
        icon: <Zap className="text-orange-400" />
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
    <div className="min-h-screen bg-[#0d0d0d] text-white pb-32">
      {/* Header removed per user request */}

      <main className="px-6 py-10 max-w-2xl mx-auto space-y-12">
        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-3xl pl-14 pr-6 py-5 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all shadow-2xl shadow-black"
          />
        </div>

        {/* Tool Categories */}
        {filteredTools.map(category => (
          <section key={category.id} className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="w-1 h-4 bg-blue-500 rounded-full" />
              <h2 className="text-xs font-bold text-white/60 uppercase tracking-[0.2em]">{category.name}</h2>
            </div>
            <div className="grid gap-5">
              {category.tools.map(tool => (
                <motion.button
                  key={tool.id}
                  whileHover={{ y: -2, scale: 1.005 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(tool.path)}
                  className="bg-[#161616] border border-white/5 rounded-[2rem] p-6 flex items-center gap-6 text-left hover:bg-[#1c1c1c] transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-blue-500/10 transition-all border border-white/5 group-hover:border-blue-500/20">
                    {React.cloneElement(tool.icon as React.ReactElement, { size: 28 })}
                  </div>
                  
                  <div className="flex-grow">
                    <h3 className="text-lg font-bold text-white/90 group-hover:text-white transition-colors">{tool.name}</h3>
                    <p className="text-sm text-white/40 mt-1 leading-relaxed">{tool.description}</p>
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-black transition-all">
                    <ChevronRight size={20} />
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        ))}
      </main>
      <FloatingHomeButton />
    </div>
  );
};

export default ToolsDashboard;
