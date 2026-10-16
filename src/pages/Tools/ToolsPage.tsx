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
  Sparkles, Wrench, ArrowLeft, ArrowRight,
  Layout, Compass, Wand2, MousePointerClick, FileJson2, Rocket
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../utils/translator';

/**
 * ToolsPage — full rewrite.
 *
 * One design system, shared with the Content Architect page:
 * warm charcoal background, a single amber accent, 24px-radius surface
 * cards with hairline borders, the same sticky glass header, the same
 * eyebrow + title typography, and 8px-rhythm spacing throughout.
 */
export default function ToolsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const steps = [
    { icon: MousePointerClick, label: t('architect.step1') },
    { icon: FileJson2, label: t('architect.step3') },
    { icon: Rocket, label: t('architect.importNew') },
  ];

  return (
    <div className="min-h-screen bg-[#0E0D0B] text-white font-sans overflow-x-hidden flex flex-col">
      {/* Ambient glow (same warm accent everywhere) */}
      <div className="pointer-events-none fixed -top-40 right-0 w-[420px] h-[420px] bg-amber-500/[0.07] blur-[120px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 -left-32 w-[360px] h-[360px] bg-amber-600/[0.04] blur-[120px] rounded-full" />

      {/* Header — identical pattern to the Architect page header */}
      <header className="sticky top-0 z-[100] bg-[#0E0D0B]/85 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto w-full px-5 sm:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/main')}
            className="w-11 h-11 shrink-0 flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] rounded-2xl transition-all active:scale-90"
            aria-label={t('common.back')}
          >
            <ArrowLeft size={21} className="text-white/85" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Wrench size={11} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300/70">
                {t('tools.eyebrow')}
              </span>
            </div>
            <h1 className="text-[24px] font-black tracking-tight leading-tight truncate">
              {t('tools.title')}
            </h1>
          </div>
          <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-[10px] font-black uppercase tracking-wider text-amber-300 shrink-0">
            {t('tools.available', { count: 2 })}
          </span>
        </div>
      </header>

      <main className="relative flex-1 w-full max-w-5xl mx-auto px-5 sm:px-8 py-7 sm:py-9 pb-28">
        {/* Intro */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-[15px] leading-relaxed text-white/45 font-medium max-w-2xl"
        >
          {t('tools.subtitle')}
        </motion.p>

        {/* Featured tool — AI Content Architect */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          onClick={() => navigate('/external-ai-import')}
          className="group w-full text-left mt-7 rounded-3xl border border-amber-400/[0.16] bg-gradient-to-br from-amber-400/[0.09] via-white/[0.03] to-transparent p-6 sm:p-8 shadow-2xl hover:border-amber-400/30 transition-colors active:scale-[0.995]"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 shrink-0">
              <Sparkles size={26} />
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-[9px] font-black uppercase tracking-[0.18em] text-amber-300 shrink-0">
              {t('tools.badgeAi')}
            </span>
          </div>

          <h2 className="text-[22px] sm:text-2xl font-black tracking-tight mt-5">
            {t('tools.architect')}
          </h2>
          <p className="text-sm leading-relaxed text-white/45 font-medium mt-2 max-w-xl">
            {t('tools.architectDesc')}
          </p>

          {/* Mini workflow */}
          <div className="flex flex-wrap items-center gap-2 mt-6">
            {steps.map((step, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/25 border border-white/[0.07] text-[10px] font-bold text-white/55">
                  <step.icon size={12} className="text-amber-300" />
                  {step.label}
                </span>
                {i < steps.length - 1 && <ArrowRight size={12} className="text-white/20" />}
              </span>
            ))}
          </div>

          <span className="mt-7 flex items-center justify-between border-t border-white/[0.06] pt-5">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
              {t('tools.open')}
            </span>
            <span className="w-9 h-9 rounded-full bg-amber-400 text-black flex items-center justify-center transition-transform group-hover:translate-x-1">
              <ArrowRight size={17} strokeWidth={2.5} />
            </span>
          </span>
        </motion.button>

        {/* Second tool — Templates */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          onClick={() => navigate('/template')}
          className="group w-full text-left mt-5 rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6 sm:p-7 shadow-xl hover:bg-white/[0.045] hover:border-white/[0.12] transition-colors active:scale-[0.995]"
        >
          <div className="flex items-center gap-5">
            <span className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-amber-300 shrink-0">
              <Layout size={25} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2.5 flex-wrap">
                <span className="text-lg font-black tracking-tight">{t('tools.templates')}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
                  {t('tools.badgeLibrary')}
                </span>
              </span>
              <span className="block text-[13px] leading-relaxed text-white/40 font-medium mt-1.5">
                {t('tools.templatesDesc')}
              </span>
            </span>
            <span className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/60 flex items-center justify-center shrink-0 transition-all group-hover:bg-amber-400 group-hover:text-black group-hover:border-amber-400">
              <ArrowRight size={17} strokeWidth={2.5} />
            </span>
          </div>
        </motion.button>

        {/* Coming soon — same card language, dashed border */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.19 }}
          className="mt-5 rounded-3xl border border-dashed border-white/[0.1] bg-white/[0.015] p-6 sm:p-7 flex items-center gap-5"
        >
          <span className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-white/35 shrink-0">
            <Compass size={21} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-black tracking-wide">
              <Wand2 size={14} className="text-amber-400/80" />
              {t('tools.comingSoon')}
            </span>
            <span className="block text-xs leading-relaxed text-white/30 font-medium mt-1">
              {t('tools.comingSoonDesc')}
            </span>
          </span>
        </motion.div>
      </main>
    </div>
  );
}
