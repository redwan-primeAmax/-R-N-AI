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

import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../utils/translator';

/**
 * Navigation2 — the standardized bar for headerless sub-pages.
 * Exactly two actions: Back (previous page) and Home (main Home page).
 * Rendered in place of each sub-page's old title header.
 */
export default function Navigation2({ backTo, onBack }: { backTo?: string; onBack?: () => void }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="sticky top-0 z-[100] border-b border-white/[0.06] bg-black/40 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={() => (onBack ? onBack() : backTo ? navigate(backTo) : navigate(-1))}
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.05] px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-white/80 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
          aria-label={t('common.back')}
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          {t('common.back')}
        </button>
        <span className="flex-1" />
        <button
          onClick={() => navigate('/main')}
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.05] px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-white/80 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
          aria-label={t('nav.home')}
        >
          <Home size={16} />
          {t('nav.home')}
        </button>
      </div>
    </div>
  );
}
