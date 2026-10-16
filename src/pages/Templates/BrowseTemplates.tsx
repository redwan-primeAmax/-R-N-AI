/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import { useState, memo, useCallback, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layout, Briefcase, User, Sparkles } from 'lucide-react';
import { DataManager, Note } from '../../services/storage/DataManager';
import { TEMPLATES, Template } from '../../templates/template-data';
import { m as motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useLanguage, type TranslationKey } from '../../utils/translator';
import Navigation2 from '../../components/Navigation2';

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

const TemplateCard = memo(forwardRef<HTMLDivElement, { template: Template; onUse: (t: Template) => void; useLabel: string; categoryText: string; displayTitle: string; displayDescription: string }>(
  ({ template, onUse, useLabel, categoryText, displayTitle, displayDescription }, ref) => (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      className="bg-white/[0.04] border border-white/[0.09] rounded-[28px] p-5 sm:p-6 flex flex-col gap-5 backdrop-blur-xl hover:bg-white/[0.06] hover:border-cyan-300/30 transition-all group shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="w-13 h-13 min-w-[52px] min-h-[52px] bg-gradient-to-br from-cyan-300/20 to-violet-500/20 rounded-[20px] flex items-center justify-center border border-cyan-300/20">
          <template.icon size={26} className="text-cyan-300" />
        </span>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/90 bg-cyan-300/[0.08] px-3 py-1.5 rounded-full border border-cyan-300/20 whitespace-nowrap">
          {categoryText}
        </span>
      </div>

      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{template.emoji}</span>
          <h3 className="font-bold text-lg text-white tracking-tight group-hover:text-cyan-200 transition-colors truncate">{displayTitle}</h3>
        </div>
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2 font-medium">{displayDescription}</p>
      </div>

      <button
        onClick={() => onUse(template)}
        className="w-full py-3.5 bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-500 hover:brightness-110 text-[#05070D] rounded-2xl font-black text-[11px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg shadow-violet-500/20"
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
  const { t, language } = useLanguage();
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
    const displayTitle = language === 'bn' ? template.titleBn : template.title;
    let content = template.content || `<h1>${displayTitle}</h1><p>Start your ${displayTitle.toLowerCase()} here...</p>`;

    // Professional Template Parsing: Replace [Tags] with real values or clean placeholders
    const now = new Date();
    const dateStr = now.toLocaleDateString();

    content = content
      .replace(/\[Date\]/g, dateStr)
      .replace(/\[Title\]/g, displayTitle)
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
      title: displayTitle,
      content: content,
      emoji: template.emoji,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false
    };

    await DataManager.saveNote(newNote);
    navigate(`/editor/${newNote.id}`);
  }, [navigate, language]);

  return (
    <div className="relative min-h-screen bg-[#05070D] text-white flex flex-col font-sans overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0"><div className="absolute -top-40 left-1/3 w-[720px] h-[420px] bg-violet-600/[0.14] blur-[140px] rounded-full" /><div className="absolute top-40 -left-40 w-[360px] h-[360px] bg-cyan-500/[0.11] blur-[120px] rounded-full" /><div className="absolute -right-40 bottom-0 w-[360px] h-[360px] bg-fuchsia-600/[0.09] blur-[130px] rounded-full" /></div>

      <Navigation2 backTo="/tools" />

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
                  ? "bg-gradient-to-r from-cyan-300 to-violet-500 border-transparent text-[#05070D] shadow-lg shadow-violet-500/25"
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
                  displayTitle={language === 'bn' ? template.titleBn : template.title}
                  displayDescription={language === 'bn' ? template.descriptionBn : template.description}
                  categoryText={categoryLabel(template.category, t)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="mt-14 rounded-[28px] border border-dashed border-white/[0.13] bg-white/[0.02] backdrop-blur-xl py-14 flex flex-col items-center text-center px-6">
            <span className="text-3xl mb-3">🗂️</span>
            <p className="text-sm text-white/35 font-medium">{t('templates.empty')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
