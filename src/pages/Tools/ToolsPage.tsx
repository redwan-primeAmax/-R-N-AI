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

import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Wrench, ArrowLeft, ArrowRight, Layout, Compass, Wand2,
  MousePointerClick, FileJson2, Rocket, Layers, Zap, ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../utils/translator';

/**
 * ToolsPage — complete redesign (V2).
 *
 * "Midnight Aurora" design system, shared with the Content Architect:
 * deep-space background, aurora gradient glows, glass panels with
 * hairline borders, gradient primary actions, hero typography and a
 * bento layout. One visual language across header, hero and cards.
 */
export default function ToolsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const workflow = [
    { icon: MousePointerClick, label: t('architect.step1') },
    { icon: FileJson2, label: t('architect.step3') },
    { icon: Rocket, label: t('architect.importNew') },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#05070D] font-sans text-white">
      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-44 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-violet-600/[0.16] blur-[140px]" />
        <div className="absolute top-40 -left-40 h-[380px] w-[380px] rounded-full bg-cyan-500/[0.12] blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-[380px] w-[380px] rounded-full bg-fuchsia-600/[0.10] blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_45%,#05070D_82%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-[100] border-b border-white/[0.07] bg-[#05070D]/75 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-4 sm:px-8">
          <button
            onClick={() => navigate('/main')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.05] transition hover:bg-white/[0.1] active:scale-90"
            aria-label={t('common.back')}
          >
            <ArrowLeft size={20} className="text-white/85" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/80">
              <Wrench size={11} /> {t('tools.eyebrow')}
            </p>
            <h1 className="truncate text-[22px] font-black leading-tight tracking-tight">{t('tools.title')}</h1>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-200 sm:inline-flex">
            <Zap size={11} /> {t('tools.available', { count: 2 })}
          </span>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-5 pb-32 pt-8 sm:px-8 sm:pt-12">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-[32px] border border-white/[0.09] bg-white/[0.04] p-7 shadow-2xl backdrop-blur-xl sm:p-10"
        >
          <div className="pointer-events-none absolute" />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
            <Sparkles size={12} className="text-cyan-300" /> {t('tools.heroBadge')}
          </span>
          <h2 className="mt-5 max-w-3xl bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-4xl font-black leading-[1.05] tracking-tight text-transparent sm:text-5xl">
            {t('tools.heroTitle')}
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] font-medium leading-relaxed text-white/45">
            {t('tools.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/external-ai-import')}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-500 px-6 py-3.5 text-xs font-black uppercase tracking-[0.16em] text-[#05070D] shadow-xl shadow-cyan-500/20 transition hover:brightness-110 active:scale-[0.98]"
            >
              {t('tools.startNow')} <ArrowRight size={15} strokeWidth={3} />
            </button>
            <button
              onClick={() => navigate('/template')}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-3.5 text-xs font-black uppercase tracking-[0.16em] text-white/75 transition hover:bg-white/[0.09] active:scale-[0.98]"
            >
              <Layout size={15} /> {t('tools.browseTemplates')}
            </button>
          </div>
        </motion.section>

        {/* Bento grid */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Featured: Content Architect */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            onClick={() => navigate('/external-ai-import')}
            className="group relative overflow-hidden rounded-[30px] border border-cyan-300/[0.16] bg-gradient-to-br from-cyan-400/[0.12] via-white/[0.04] to-violet-500/[0.10] p-7 text-left shadow-2xl backdrop-blur-xl transition hover:border-cyan-300/30 active:scale-[0.995] sm:p-8 lg:col-span-2"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-cyan-300 to-violet-500 text-[#05070D] shadow-lg shadow-violet-500/25">
                <Sparkles size={29} />
              </span>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                {t('tools.badgeAi')}
              </span>
            </div>

            <h3 className="mt-6 text-[26px] font-black tracking-tight sm:text-3xl">{t('tools.architect')}</h3>
            <p className="mt-2.5 max-w-xl text-sm font-medium leading-relaxed text-white/45">
              {t('tools.architectDesc')}
            </p>

            <p className="mt-7 text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
              {t('tools.workflow')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {workflow.map((step, i) => (
                <span key={i} className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-black/30 px-3 py-2 text-[10px] font-bold text-white/60">
                    <step.icon size={12} className="text-cyan-300" /> {step.label}
                  </span>
                  {i < workflow.length - 1 && <ChevronRight size={13} className="text-white/20" />}
                </span>
              ))}
            </div>

            <span className="mt-8 flex items-center justify-between border-t border-white/[0.08] pt-5">
              <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
                <Layers size={14} /> {t('tools.bestFor')}
              </span>
              <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-white">
                {t('tools.open')}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-cyan-300 to-violet-500 text-[#05070D] transition-transform group-hover:translate-x-1">
                  <ArrowRight size={17} strokeWidth={3} />
                </span>
              </span>
            </span>
          </motion.button>

          {/* Right column stack */}
          <div className="grid gap-5">
            {/* Templates */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              onClick={() => navigate('/template')}
              className="group rounded-[30px] border border-white/[0.09] bg-white/[0.04] p-7 text-left shadow-xl backdrop-blur-xl transition hover:bg-white/[0.06] active:scale-[0.995]"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/[0.09] bg-white/[0.06] text-cyan-300">
                <Layout size={26} />
              </span>
              <span className="mt-5 flex flex-wrap items-center gap-2.5">
                <span className="text-xl font-black tracking-tight">{t('tools.templates')}</span>
                <span className="rounded-full border border-white/[0.09] bg-white/[0.05] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
                  {t('tools.badgeLibrary')}
                </span>
              </span>
              <span className="mt-2 block text-[13px] font-medium leading-relaxed text-white/40">
                {t('tools.templatesDesc')}
              </span>
              <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
                {t('tools.libraryHint')}
                <ArrowRight size={14} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />
              </span>
            </motion.button>

            {/* Coming soon */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.22 }}
              className="rounded-[30px] border border-dashed border-white/[0.13] bg-white/[0.02] p-7 backdrop-blur-xl"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/[0.08] bg-white/[0.04] text-white/40">
                <Compass size={21} />
              </span>
              <p className="mt-4 flex items-center gap-2 text-sm font-black tracking-wide">
                <Wand2 size={14} className="text-violet-300" /> {t('tools.comingSoon')}
              </p>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-white/30">
                {t('tools.comingSoonDesc')}
              </p>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                <Zap size={11} className="text-cyan-300" /> {t('tools.instantSetup')}
              </p>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
