/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { useState, memo, useCallback, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Layout, Zap, Briefcase, User, Sparkles } from 'lucide-react';
import { DataManager, Note } from '../../services/storage/DataManager';
import { TEMPLATES, Template } from '../../templates/template-data';
import { m as motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useLanguage, type TranslationKey } from '../../utils/translator';

/** Categories that actually exist in the template data. */
const CATEGORY_KEYS: { id: string; key: TranslationKey; icon: any }[] = [
  { id: 'All', key: 'templates.all', icon: Layout },
  { id: 'Live', key: 'templates.live', icon: Sparkles },
  { id: 'Work', key: 'templates.work', icon: Briefcase },
  { id: 'Personal', key: 'templates.personal', icon: User },
];

const categoryLabel = (category: string, t: (k: TranslationKey) => string) => {
  switch (category) {
    case 'Live': return t('templates.live');
    case 'Work': return t('templates.work');
    case 'Personal': return t('templates.personal');
    default: return category;
  }
};

const TemplateCard = memo(forwardRef<HTMLDivElement, { template: Template; onUse: (t: Template) => void; useLabel: string; categoryText: string }>(
  ({ template, onUse, useLabel, categoryText }, ref) => (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      className="bg-white/[0.03] border border-white/[0.07] rounded-[26px] p-5 sm:p-6 flex flex-col gap-5 hover:bg-white/[0.05] hover:border-teal-400/30 transition-all group shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="w-13 h-13 min-w-[52px] min-h-[52px] bg-teal-400/10 rounded-2xl flex items-center justify-center border border-teal-400/15">
          <template.icon size={26} className="text-teal-300" />
        </span>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-300/80 bg-teal-400/[0.07] px-3 py-1.5 rounded-full border border-teal-400/15 whitespace-nowrap">
          {categoryText}
        </span>
      </div>

      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{template.emoji}</span>
          <h3 className="font-bold text-lg text-white tracking-tight group-hover:text-teal-300 transition-colors truncate">{template.title}</h3>
        </div>
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2 font-medium">{template.description}</p>
      </div>

      <button
        onClick={() => onUse(template)}
        className="w-full py-3.5 bg-gradient-to-b from-teal-400 to-teal-600 hover:from-teal-300 hover:to-teal-500 text-teal-950 rounded-2xl font-black text-[11px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg shadow-teal-500/20"
      >
        <Plus size={16} strokeWidth={3} />
        {useLabel}
      </button>
    </motion.div>
  )
));

TemplateCard.displayName = 'TemplateCard';

export default function BrowseTemplates() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = useMemo(
    () => CATEGORY_KEYS.map(c => ({ ...c, label: t(c.key) })),
    [t]
  );

  const filteredTemplates = useMemo(() =>
    activeCategory === 'All'
      ? TEMPLATES
      : TEMPLATES.filter(tpl => tpl.category === activeCategory)
  , [activeCategory]);

  const handleUseTemplate = useCallback(async (template: Template) => {
    let content = template.content || `<h1>${template.title}</h1><p>Start your ${template.title.toLowerCase()} here...</p>`;

    // Professional Template Parsing: Replace [Tags] with real values or clean placeholders
    const now = new Date();
    const dateStr = now.toLocaleDateString();

    content = content
      .replace(/\[Date\]/g, dateStr)
      .replace(/\[Title\]/g, template.title)
      .replace(/\[Name\]/g, 'User')
      .replace(/\[Count\]/g, '0')
      .replace(/\[Type\]/g, 'General')
      .replace(/\[Names\]/g, 'Participants')
      .replace(/\[Topic\]/g, 'New Topic')
      .replace(/\[Description\]/g, 'Description goes here...')
      .replace(/\[Text\]/g, '...')
      .replace(/\[Emoji\]/g, '✨');

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
    <div className="min-h-screen bg-[#0a0f0e] text-white flex flex-col font-sans overflow-x-hidden">
      <div className="pointer-events-none fixed top-0 right-0 w-[420px] h-[420px] bg-teal-500/[0.06] blur-[120px] rounded-full -translate-y-1/3 translate-x-1/4" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0f0e]/85 backdrop-blur-2xl border-b border-white/[0.06] px-5 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/tools')}
            className="w-11 h-11 shrink-0 flex items-center justify-center bg-white/[0.05] hover:bg-white/10 border border-white/[0.07] rounded-2xl transition-all active:scale-90"
            title={t('common.back')}
            aria-label={t('common.back')}
          >
            <ArrowLeft size={21} className="text-white/80" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Zap size={11} className="text-teal-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">{t('templates.eyebrow')}</span>
            </div>
            <h1 className="text-[24px] font-black tracking-tight leading-tight truncate">{t('templates.title')}</h1>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-400/10 border border-teal-400/20 rounded-full text-[10px] font-black uppercase tracking-wider text-teal-300 shrink-0">
            <Layout size={12} />
            {t('templates.count', { count: TEMPLATES.length })}
          </span>
        </div>
      </header>

      <main className="relative flex-1 w-full max-w-6xl mx-auto px-5 sm:px-8 py-7 pb-32">
        <p className="text-sm text-white/40 font-medium leading-relaxed max-w-xl">{t('templates.subtitle')}</p>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mt-6 -mx-1 px-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all border whitespace-nowrap active:scale-95",
                activeCategory === cat.id
                  ? "bg-teal-400 border-teal-300 text-teal-950 shadow-lg shadow-teal-500/25"
                  : "bg-white/[0.03] border-white/[0.07] text-white/45 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <cat.icon size={14} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Template Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mt-7">
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={handleUseTemplate}
                  useLabel={t('templates.use')}
                  categoryText={categoryLabel(template.category, t)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="mt-14 rounded-[26px] border border-dashed border-white/[0.09] py-14 flex flex-col items-center text-center px-6">
            <span className="text-3xl mb-3">🗂️</span>
            <p className="text-sm text-white/35 font-medium">{t('templates.empty')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
