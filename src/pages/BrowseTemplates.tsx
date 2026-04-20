/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { DataManager, Note } from '../utils/DataManager';
import { TEMPLATES, Template } from '../templates/template-data';
import { motion } from 'motion/react';

const TemplateCard = memo(({ template, onUse }: { template: Template; onUse: (t: Template) => void }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    whileTap={{ scale: 0.98 }}
    className="bg-[#1c1c1c] border border-white/5 rounded-3xl p-6 flex flex-col gap-6 hover:border-blue-500/30 transition-all group shadow-xl shadow-black/20"
  >
    <div className="flex items-start justify-between">
      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-blue-600/10 transition-colors">
        <template.icon size={28} className="text-white group-hover:text-blue-400" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
        {template.category}
      </span>
    </div>
    <div>
      <h3 className="font-bold text-xl text-white tracking-tight">{template.title}</h3>
      <p className="text-sm text-white/40 leading-relaxed mt-2 line-clamp-2">{template.description}</p>
    </div>
    <button
      onClick={() => onUse(template)}
      className="mt-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
    >
      <Plus size={20} strokeWidth={3} />
      Use Template
    </button>
  </motion.div>
));

TemplateCard.displayName = 'TemplateCard';

export default function BrowseTemplates() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<'All' | 'Live' | 'Work' | 'Personal'>('All');

  const filteredTemplates = useMemo(() => 
    activeCategory === 'All' 
      ? TEMPLATES 
      : TEMPLATES.filter(t => t.category === activeCategory)
  , [activeCategory]);

  const handleUseTemplate = useCallback(async (template: Template) => {
    let content = '';
    if (template.file) {
      try {
        const response = await fetch(template.file);
        content = await response.text();
      } catch (e) {
        content = `<h1>${template.title}</h1><p>Template content could not be loaded.</p>`;
      }
    } else {
      content = `<h1>${template.title}</h1><p>Start writing your ${template.title.toLowerCase()} here...</p>`;
    }

    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: template.title,
      content: content,
      emoji: template.emoji,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false
    };

    await DataManager.saveNote(newNote);
    navigate(`/editor/${newNote.id}`);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-40">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-3xl px-6 py-6 flex items-center gap-4 border-b border-white/5">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all"
        >
          <ArrowLeft size={20} className="text-white/60" />
        </button>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Templates</h1>
          <p className="text-[10px] text-blue-400 uppercase tracking-[0.2em] font-black">Redwan Assistant</p>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 px-6 py-4 overflow-x-auto no-scrollbar sticky top-[80px] z-20 bg-[#0A0A0A]/80 backdrop-blur-3xl border-b border-white/5">
        {['All', 'Live', 'Work', 'Personal'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat as any)}
            className={`px-6 py-2.5 rounded-full text-xs font-black tracking-widest uppercase transition-all border ${
              activeCategory === cat 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="px-6 py-8 grid grid-cols-1 gap-6">
        {filteredTemplates.map((template) => (
          <TemplateCard 
            key={template.id} 
            template={template} 
            onUse={handleUseTemplate} 
          />
        ))}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
