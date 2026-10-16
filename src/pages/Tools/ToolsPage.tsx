/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Wrench, ArrowLeft,
  Layout, Compass, ArrowRight, Wand2
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../utils/translator';

export default function ToolsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tools = [
    {
      title: t('tools.architect'),
      description: t('tools.architectDesc'),
      icon: <Sparkles className="w-6 h-6" />,
      path: '/external-ai-import',
      gradient: 'from-amber-400 to-orange-600',
      glow: 'group-hover:border-amber-400/40',
      badge: t('tools.badgeAi'),
    },
    {
      title: t('tools.templates'),
      description: t('tools.templatesDesc'),
      icon: <Layout className="w-6 h-6" />,
      path: '/template',
      gradient: 'from-teal-400 to-emerald-600',
      glow: 'group-hover:border-teal-400/40',
      badge: t('tools.badgeLibrary'),
    }
  ];

  return (
    <div className="min-h-screen bg-[#0c0a09] text-white flex flex-col font-sans overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed -top-32 right-0 w-[420px] h-[420px] bg-amber-500/[0.07] blur-[110px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 -left-24 w-[380px] h-[380px] bg-teal-500/[0.05] blur-[110px] rounded-full" />

      <header className="relative px-5 sm:px-8 pt-6 pb-5 flex items-center gap-4 sticky top-0 bg-[#0c0a09]/85 backdrop-blur-2xl z-[100] border-b border-white/[0.06]">
        <button
          onClick={() => navigate('/main')}
          className="w-11 h-11 shrink-0 flex items-center justify-center bg-white/[0.05] hover:bg-white/10 border border-white/[0.07] rounded-2xl transition-all active:scale-90"
          title={t('tools.backToMain')}
          aria-label={t('common.back')}
        >
          <ArrowLeft size={21} className="text-white/80" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Wrench size={11} className="text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">{t('tools.eyebrow')}</span>
          </div>
          <h1 className="text-[26px] font-black tracking-tight leading-tight truncate">
            {t('tools.title')}
          </h1>
        </div>
      </header>

      <main className="relative flex-1 w-full max-w-5xl mx-auto px-5 sm:px-8 py-8 pb-32">
        <p className="text-sm text-white/40 font-medium leading-relaxed max-w-xl">
          {t('tools.subtitle')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
          {tools.map((tool, idx) => (
            <motion.button
              key={tool.path}
              type="button"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              onClick={() => navigate(tool.path)}
              className={cn(
                "group text-left p-6 sm:p-7 rounded-[28px] bg-white/[0.03] border border-white/[0.07]",
                "hover:bg-white/[0.05] transition-all cursor-pointer relative overflow-hidden shadow-xl active:scale-[0.99]",
                tool.glow
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn(
                  "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 duration-300",
                  tool.gradient
                )}>
                  {tool.icon}
                </span>
                <span className="px-3 py-1 bg-white/[0.05] rounded-full border border-white/[0.07] text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
                  {tool.badge}
                </span>
              </div>

              <h3 className="text-xl font-black tracking-tight mt-5">{tool.title}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed font-medium mt-2">{tool.description}</p>

              <span className="mt-6 flex items-center justify-between text-white/30 group-hover:text-amber-300 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('tools.open')}</span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1.5" />
              </span>
            </motion.button>
          ))}
        </div>

        {/* Coming soon */}
        <div className="mt-12 rounded-[28px] border border-dashed border-white/[0.09] bg-white/[0.015] px-6 py-10 flex flex-col items-center text-center">
          <span className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-white/35">
            <Compass size={20} />
          </span>
          <h4 className="text-sm font-black tracking-wide mt-4 flex items-center gap-2">
            <Wand2 size={14} className="text-amber-400/70" />
            {t('tools.comingSoon')}
          </h4>
          <p className="text-xs text-white/30 font-medium mt-1.5 max-w-xs leading-relaxed">{t('tools.comingSoonDesc')}</p>
        </div>
      </main>
    </div>
  );
}
