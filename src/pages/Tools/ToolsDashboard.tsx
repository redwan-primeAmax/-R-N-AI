/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Hash, 
  FileText, 
  ChevronRight, 
  Wrench,
  Search,
  Type
} from 'lucide-react';
import FloatingHomeButton from '../../components/FloatingHomeButton';

const tools = [
  {
    id: 'word-counter',
    name: 'Word Counter',
    description: 'Count words, sentences, punctuation and emojis in your text.',
    path: '/tools/word-counter',
    icon: Hash,
    iconColor: 'text-blue-400',
    gradientFrom: 'from-blue-500/20',
    gradientTo: 'to-blue-600/5',
    borderColor: 'border-blue-500/20',
    accentColor: 'bg-blue-500/10',
  },
  {
    id: 'number-remover',
    name: 'Number Remover',
    description: 'Strip all numeric characters from your text instantly.',
    path: '/tools/number-remover',
    icon: Type,
    iconColor: 'text-purple-400',
    gradientFrom: 'from-purple-500/20',
    gradientTo: 'to-purple-600/5',
    borderColor: 'border-purple-500/20',
    accentColor: 'bg-purple-500/10',
  },
  {
    id: 'summarizer',
    name: 'AI Summarizer',
    description: 'Summarize long text into concise key points using AI.',
    path: '/tools/summarizer',
    icon: FileText,
    iconColor: 'text-emerald-400',
    gradientFrom: 'from-emerald-500/20',
    gradientTo: 'to-emerald-600/5',
    borderColor: 'border-emerald-500/20',
    accentColor: 'bg-emerald-500/10',
  }
];

const ToolsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = tools.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0d0d]/90 backdrop-blur-xl border-b border-white/5 px-6 py-5">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="w-10 h-10 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl flex items-center justify-center border border-white/10">
            <Wrench size={18} className="text-white/70" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Tool Library</h1>
            <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium">Text-Based Tools</p>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/8 rounded-2xl pl-11 pr-5 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/15 transition-all"
          />
        </div>

        {/* Section Label */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-1 h-4 bg-gradient-to-b from-white/40 to-white/10 rounded-full" />
          <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Available Tools</span>
        </div>

        {/* Tool Cards */}
        <div className="space-y-3">
          {filteredTools.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-white/20 text-sm">No tools found for "{searchQuery}"</p>
            </div>
          ) : filteredTools.map((tool, index) => {
            const IconComponent = tool.icon;
            return (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.97, y: 0 }}
                onClick={() => navigate(tool.path)}
                className={`w-full bg-gradient-to-br ${tool.gradientFrom} ${tool.gradientTo} border ${tool.borderColor} rounded-3xl p-5 flex items-center gap-4 text-left transition-all group relative overflow-hidden`}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.02] transition-all duration-300 rounded-3xl" />
                
                <div className={`w-13 h-13 ${tool.accentColor} rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/5 p-3`}>
                  <IconComponent size={22} className={tool.iconColor} />
                </div>

                <div className="flex-grow min-w-0">
                  <h3 className="font-bold text-white text-[15px] mb-0.5">{tool.name}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{tool.description}</p>
                </div>

                <div className="flex-shrink-0 w-8 h-8 bg-white/5 group-hover:bg-white/10 rounded-xl flex items-center justify-center transition-all">
                  <ChevronRight size={14} className="text-white/30 group-hover:text-white/60 transition-all group-hover:translate-x-0.5" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </main>

      <FloatingHomeButton />
    </div>
  );
};

export default ToolsDashboard;
