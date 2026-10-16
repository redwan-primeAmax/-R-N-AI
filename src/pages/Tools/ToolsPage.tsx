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
import { Sparkles, Layout, ChevronRight } from 'lucide-react';
import Navigation2 from '../../components/Navigation2';
import { useLanguage } from '../../utils/translator';

/**
 * ToolsPage — only the two core tools remain:
 * AI Content Architect and Templates. Each card is a single clean row:
 * icon on the left, title on the right. No hero, badges or extra text.
 */
export default function ToolsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tools = [
    { icon: Sparkles, title: t('tools.architect'), path: '/external-ai-import' },
    { icon: Layout, title: t('tools.templates'), path: '/template' },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#05070D] font-sans text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-44 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-violet-600/[0.13] blur-[140px]" />
        <div className="absolute top-52 -left-40 h-[320px] w-[320px] rounded-full bg-cyan-500/[0.10] blur-[120px]" />
      </div>

      <Navigation2 backTo="/main" />

      <main className="relative mx-auto w-full max-w-3xl space-y-4 px-5 pb-32 pt-8 sm:px-8">
        {tools.map((tool, i) => (
          <motion.button
            key={tool.path}
            type="button"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
            onClick={() => navigate(tool.path)}
            className="group flex w-full items-center gap-5 rounded-[28px] border border-white/[0.09] bg-white/[0.04] p-6 text-left shadow-xl backdrop-blur-xl transition hover:bg-white/[0.06] active:scale-[0.995] sm:p-7"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-cyan-300 to-violet-500 text-[#05070D] shadow-lg shadow-violet-500/20">
              <tool.icon size={28} />
            </span>
            <span className="min-w-0 flex-1 truncate text-xl font-black tracking-tight sm:text-2xl">
              {tool.title}
            </span>
            <ChevronRight size={22} className="shrink-0 text-white/25 transition group-hover:translate-x-1 group-hover:text-cyan-300" />
          </motion.button>
        ))}
      </main>
    </div>
  );
}
