/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, memo, useCallback, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, Layout, Zap, Briefcase, User, GraduationCap, Coffee } from 'lucide-react';
import { DataManager, Note } from '../../services/storage/DataManager';
import { TEMPLATES, Template } from '../../templates/template-data';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

const CATEGORIES = [
  { id: 'All', label: 'সবগুলো', icon: Layout },
  { id: 'Work', label: 'অফিস/কাজ', icon: Briefcase },
  { id: 'Personal', label: 'ব্যক্তিগত', icon: User },
  { id: 'Education', label: 'শিক্ষা', icon: GraduationCap },
  { id: 'Lifestyle', label: 'লাইফস্টাইল', icon: Coffee },
];

const TemplateCard = memo(forwardRef<HTMLDivElement, { template: Template; onUse: (t: Template) => void }>(
  ({ template, onUse }, ref) => (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-6 hover:bg-white/[0.05] hover:border-blue-500/30 transition-all group shadow-xl shadow-black/20"
    >
      <div className="flex items-start justify-between">
        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-600/20 transition-colors border border-blue-500/10 shadow-lg shadow-blue-500/5">
          <template.icon size={28} className="text-blue-400" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/60 bg-blue-500/5 px-4 py-2 rounded-full border border-blue-500/10">
          {template.category}
        </span>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-bold text-xl text-white tracking-tight group-hover:text-blue-400 transition-colors">{template.title}</h3>
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2 font-medium">{template.description}</p>
      </div>

      <button
        onClick={() => onUse(template)}
        className="mt-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
      >
        <Plus size={18} strokeWidth={3} />
        ব্যবহার করুন
      </button>
    </motion.div>
  )
));

TemplateCard.displayName = 'TemplateCard';

export default function BrowseTemplates() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTemplates = useMemo(() => 
    activeCategory === 'All' 
      ? TEMPLATES 
      : TEMPLATES.filter(t => t.category === activeCategory)
  , [activeCategory]);

  const handleUseTemplate = useCallback(async (template: Template) => {
    const content = template.content || `<h1>${template.title}</h1><p>এখানে আপনার ${template.title.toLowerCase()} শুরু করুন...</p>`;

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
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-sans">
      {/* Background Decor */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/4" />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0d0d]/80 backdrop-blur-2xl border-b border-white/5 px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => navigate('/tools')} 
            className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all active:scale-90"
            title="ফিরে যান"
          >
            <ArrowLeft size={24} className="text-white/80" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
               <Zap size={12} className="text-blue-500 fill-blue-500" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Library</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
              পেজ <span className="text-blue-500">টেমপ্লেটস</span>
            </h1>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
           <Sparkles size={16} />
           <span className="text-[10px] font-black uppercase tracking-widest">{TEMPLATES.length} টেমপ্লেট</span>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full space-y-10">
        {/* Categories Scroller */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 -mx-2 px-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border whitespace-nowrap active:scale-95",
                activeCategory === cat.id 
                  ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20" 
                  : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
              )}
            >
              <cat.icon size={16} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-40">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template) => (
              <TemplateCard 
                key={template.id} 
                template={template} 
                onUse={handleUseTemplate} 
              />
            ))}
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
