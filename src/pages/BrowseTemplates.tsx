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
    animate={{ opacity: 1, y: 0 }}
    whileTap={{ scale: 0.98 }}
    className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 hover:bg-white/10 transition-all group"
  >
    <div className="flex items-start justify-between">
      <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
        <template.icon size={24} className="text-white" />
      </div>
      <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
        {template.category}
      </span>
    </div>
    <div>
      <h3 className="font-bold text-lg text-white/90">{template.title}</h3>
      <p className="text-sm text-white/40 leading-relaxed mt-1">{template.description}</p>
    </div>
    <button
      onClick={() => onUse(template)}
      className="mt-2 w-full py-3 bg-white text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-white/5"
    >
      <Plus size={18} />
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
    <div className="min-h-screen bg-[#191919] text-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#191919]/90 backdrop-blur-xl px-4 py-4 flex items-center gap-4 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-white/60" />
        </button>
        <div>
          <h1 className="text-base font-bold">Templates</h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Gallery</p>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar sticky top-[65px] z-10 bg-[#191919]/90 backdrop-blur-xl border-b border-white/5">
        {['All', 'Live', 'Work', 'Personal'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat as any)}
            className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              activeCategory === cat 
                ? 'bg-white border-white text-black shadow-lg shadow-white/10' 
                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="px-4 py-6 grid grid-cols-1 gap-4">
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
