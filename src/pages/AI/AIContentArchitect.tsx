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

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { cn } from '../../utils/cn';
import {
  ChevronLeft,
  Copy,
  Check,
  Sparkles,
  HardDrive,
  Search,
  AlertCircle,
  ArrowRight,
  FileText,
  Plus,
  X,
  Loader2,
  Zap,
  Code,
  Braces,
  CornerDownRight,
  Layers,
  Wand2
} from 'lucide-react';
import { DataManager } from '../../services/storage/DataManager';
import { Note } from '../../types';
import { useLanguage } from '../../utils/translator';

const SYSTEM_PROMPT = `You are a World-Class Master Content Architect and Senior Bengali Editorial Specialist. 
Your primary directive is to transform scattered data or brief concepts into elite, high-fidelity, deeply structured JSON architectures optimized for a Notion-style interface.

### JSON ARCHITECTURE (STRICT FORMAT):
Return a single JSON ARRAY of objects. Even for single-page topics, return an array with one object.
[
  {
    "tempId": "unique-slug-0", 
    "title": "Title (Clean, Max 30 chars, Elegant Bengali)",
    "content": "Rich, multi-layered HTML structure with high-value density",
    "emoji": "Vibrant emoji icon (REQUIRED for main page)"
  }
]

### CORE ARCHITECTURAL STANDARDS:
1. DEEP HIERARCHY & SMARTER LINKING:
   - For complex ideas, decompose into a "Main Navigation Page" and multiple "Deep Dive Sub-pages".
   - Implement cross-linkage in HTML: <a class='sub-page-link' data-id='tempId-of-subpage'>Link Label</a>.
   - Use <div class='cards-grid'> to house these sub-page links for a modern dashboard look.

2. ADVANCED DATA VIBRANCY:
   - Utilize <table> for comparative data.
   - For educational content, use the "Bilingual Layer": <p class='bilingual-row'><strong>English</strong> (Bengali Pronunciation) <mark>Bengali Meaning</mark></p>

3. WIDGET & SEMANTIC COMPONENTS:
   - TASK LISTS: <ul data-type='taskList'><li data-checked='false'><p>Item</p></li></ul>.
   - CALLOUTS: <blockquote class='expert-tip'>Insight here...</blockquote>.
   - STATUS BADGES: <span class='badge bg-red-400/10 text-red-500'>CRITICAL</span>.

4. LINGUISTIC PRECISION:
   - Output must be in **Standard Modern Bengali** (Shuddho).
   - Return ONLY the raw JSON array. Start with [ and end with ].`;

const AIContentArchitect: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [displayNotes, setDisplayNotes] = useState<Note[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [importData, setImportData] = useState('');
  const [targetId, setTargetId] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [changeRequest, setChangeRequest] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copied, setCopied] = useState<'prompt' | 'update' | false>(false);
  const [previewData, setPreviewData] = useState<any | any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [subPagesContext, setSubPagesContext] = useState<string>('');

  const loadNotes = useCallback(async () => {
    const notes = await DataManager.getAllNotes();
    setAllNotes(notes);
    const filtered = notes.filter(n => !n.isTrashed && !n.parentId);
    setDisplayNotes(filtered);
    setRecentNotes(filtered.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 15));
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (targetId) {
      const subPages = allNotes.filter(n => n.parentId === targetId && !n.isTrashed);
      let context = "";
      subPages.forEach(sp => {
        context += `\n--- SUB-PAGE: ${sp.title} ---\n${sp.content}\n`;
      });
      setSubPagesContext(context);
    } else {
      setSubPagesContext('');
    }
  }, [targetId, allNotes]);

  const cleanJsonString = (str: string) => {
    let cleaned = str.trim();
    // Remove Markdown backticks if present
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    
    // Find first [ or { and last ] or }
    const startIdx = Math.min(
      cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('['),
      cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{')
    );
    const endIdx = Math.max(
      cleaned.lastIndexOf(']'),
      cleaned.lastIndexOf('}')
    );
    
    if (startIdx !== Infinity && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
    
    // Fix unescaped newlines in JSON strings which cause JSON.parse to fail
    // This regex looks for newlines that are inside double quotes (JSON strings)
    // Note: This is a simplified approach, perfect JSON parsing with regex is hard
    // but this handles 90% of AI "raw" JSON output glitches.
    cleaned = cleaned.replace(/"([^"]*)"/g, (match, content) => {
      // Replace literal newlines with \n
      const fixedContent = content.replace(/\n/g, '\\n');
      return `"${fixedContent}"`;
    });

    return cleaned;
  };

  useEffect(() => {
    if (!importData.trim()) {
      setPreviewData(null);
      setJsonError(null);
      return;
    }

    const cleaned = cleanJsonString(importData);
    
    try {
      const parsed = JSON.parse(cleaned);
      setPreviewData(Array.isArray(parsed) ? parsed : [parsed]);
      setJsonError(null);
    } catch (e) {
      setPreviewData(null);
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON structure');
    }
  }, [importData]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT);
    setCopied('prompt');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFullPrompt = async () => {
    const requirements = changeRequest.trim() || (targetId
      ? "Improve structure and quality."
      : "Create the content exactly as described in the target below.");

    let fullPrompt: string;
    if (targetId) {
      const note = allNotes.find(n => n.id === targetId);
      if (!note) return;
      fullPrompt = `${SYSTEM_PROMPT}\n\nEXISTING CONTEXT:\n---\nTITLE: ${note.title}\nCONTENT: ${note.content}\n${subPagesContext ? `\nSUB-PAGES CONTEXT:${subPagesContext}` : ""}\n---\n\nUSER REQUIREMENTS:\n"${requirements}"\n\nReturn the result as a JSON array.`;
    } else if (parentId) {
      const parent = allNotes.find(n => n.id === parentId);
      fullPrompt = `${SYSTEM_PROMPT}\n\nTARGET: Create NEW SUB-PAGES under the existing page "${parent?.title || ''}".\nLink the sub-pages from the parent context where relevant.\n\nUSER REQUIREMENTS:\n"${requirements}"\n\nReturn the result as a JSON array.`;
    } else {
      // New Independent Page — previously this path silently did nothing.
      fullPrompt = `${SYSTEM_PROMPT}\n\nTARGET: Create a BRAND-NEW INDEPENDENT PAGE. There is no existing page context; build the complete page (and any linked sub-pages) from the requirements alone.\n\nUSER REQUIREMENTS:\n"${requirements}"\n\nReturn the result as a JSON array.`;
    }

    navigator.clipboard.writeText(fullPrompt);
    setCopied('update');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = async () => {
    if (!previewData) return;
    setIsImporting(true);
    try {
      const items = previewData;
      const activeWs = await DataManager.getActiveWorkspaceId();
      const idMap: Record<string, string> = {};
      
      // Phase 1: Assign IDs
      const processedItems = items.map((item: any) => {
        const realId = (targetId && items.length === 1) 
          ? targetId 
          : `arch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        if (item.tempId) idMap[item.tempId] = realId;
        return { ...item, realId };
      });

      const mainId = processedItems[0].realId;
      const baseParent = parentId;

      // Phase 2: Save and Link
      for (let i = 0; i < processedItems.length; i++) {
        const data = processedItems[i];
        let content = data.content || '';

        // Resolve temp links
        Object.entries(idMap).forEach(([temp, real]) => {
          content = content.split(`data-id='${temp}'`).join(`data-id='${real}'`);
          content = content.split(`data-id="${temp}"`).join(`data-id='${real}'`);
          content = content.split(`href='#${temp}'`).join(`href='/editor/${real}'`);
        });

        let currentParent = baseParent || undefined;
        if (i > 0 && !baseParent && !targetId) {
          currentParent = mainId;
        }

        if (targetId && i === 0 && items.length === 1) {
          const note = allNotes.find(n => n.id === targetId);
          if (note) {
            await DataManager.saveNote({
              ...note,
              title: data.title || note.title,
              content: content,
              emoji: data.emoji || note.emoji,
              updatedAt: Date.now()
            });
          }
        } else {
          await DataManager.saveNote({
            id: data.realId,
            title: data.title || t('architect.untitled'),
            content: content,
            emoji: data.emoji || (currentParent ? '' : '📄'),
            parentId: currentParent,
            workspaceId: activeWs,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }

      setStatus({ type: 'success', message: t('architect.success') });
      setImportData('');
      setTargetId('');
      setParentId(null);
      loadNotes();
    } catch (err) {
      setStatus({ type: 'error', message: t('architect.failed') });
    } finally {
      setIsImporting(false);
    }
  };

  const listItems = searchQuery.trim() 
    ? displayNotes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : recentNotes;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#05070D] font-sans text-white">
      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-44 left-1/3 h-[440px] w-[760px] rounded-full bg-violet-600/[0.15] blur-[140px]" />
        <div className="absolute top-52 -left-40 h-[340px] w-[340px] rounded-full bg-cyan-500/[0.11] blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-[340px] w-[340px] rounded-full bg-fuchsia-600/[0.09] blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_45%,#05070D_85%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#05070D]/75 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-5 py-4 sm:px-8">
          <button
            onClick={() => navigate('/tools')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.05] transition hover:bg-white/[0.1] active:scale-90"
            aria-label={t('common.back')}
          >
            <ChevronLeft size={21} className="text-white/85" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/80">
              <Zap size={11} className="fill-cyan-300" /> {t('architect.eyebrow')}
            </p>
            <h1 className="truncate text-[22px] font-black leading-tight tracking-tight">{t('architect.title')}</h1>
          </div>
          <span className="hidden max-w-[240px] items-center gap-2 truncate rounded-full border border-white/[0.09] bg-white/[0.05] px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-white/55 md:inline-flex">
            <Layers size={12} className="shrink-0 text-cyan-300" />
            <span className="truncate">
              {t('architect.selectedTarget')}: {targetId
                ? (allNotes.find(n => n.id === targetId)?.title || t('architect.untitled'))
                : parentId
                  ? (allNotes.find(n => n.id === parentId)?.title || t('architect.untitled'))
                  : t('architect.newPage')}
            </span>
          </span>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        {/* Intro + step tracker */}
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-3xl font-black leading-tight tracking-tight text-transparent sm:text-4xl">
              {t('architect.title')}
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-white/45">{t('architect.subtitle')}</p>
          </div>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {[t('architect.step1'), t('architect.step2'), t('architect.step3')].map((label, i) => {
              const stepNo = i + 1;
              const current = previewData ? 3 : 1;
              const done = stepNo < current || (stepNo === 1 && copied !== false) || (stepNo === 3 && !!previewData);
              const active = stepNo === current && !done;
              return (
                <span key={label} className="inline-flex shrink-0 items-center">
                  <span className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-black uppercase tracking-wider transition",
                    done
                      ? "border-transparent bg-gradient-to-r from-cyan-300 to-violet-500 text-[#05070D]"
                      : active
                        ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                        : "border-white/[0.09] bg-white/[0.04] text-white/35"
                  )}>
                    {done ? <Check size={11} strokeWidth={3.5} /> : <span>{stepNo}</span>}
                    {label}
                  </span>
                  {stepNo < 3 && <span className="mx-1.5 h-px w-5 shrink-0 bg-white/15" />}
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Step 1 + Step 2 */}
          <div className="space-y-6 lg:col-span-5">
            {/* Step 1 — Prompt studio */}
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-[28px] border border-white/[0.09] bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-7"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-sm font-black text-[#05070D] shadow-lg shadow-violet-500/25">1</span>
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
                    <Code size={15} className="text-cyan-300" /> {t('architect.step1')}
                  </h3>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">{t('architect.promptStudio')}</p>
                </div>
              </div>
              <p className="mt-4 text-[12px] font-medium leading-relaxed text-white/35">{t('architect.step1Desc')}</p>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  onClick={handleCopyPrompt}
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/[0.09] bg-white/[0.05] py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.09] active:scale-[0.99]"
                >
                  {copied === 'prompt' ? <Check size={16} className="text-cyan-300" /> : <Copy size={16} />}
                  {copied === 'prompt' ? t('architect.copied') : t('architect.copyPrompt')}
                </button>
                <button
                  onClick={handleCopyFullPrompt}
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-500 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#05070D] shadow-xl shadow-cyan-500/20 transition hover:brightness-110 active:scale-[0.99]"
                >
                  {copied === 'update' ? <Check size={16} /> : <Sparkles size={16} />}
                  {copied === 'update' ? t('architect.copied') : t('architect.copyFullPrompt')}
                </button>
              </div>
            </motion.section>

            {/* Step 2 — Target studio */}
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.07 }}
              className="rounded-[28px] border border-white/[0.09] bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-7"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-sm font-black text-[#05070D] shadow-lg shadow-violet-500/25">2</span>
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
                    <HardDrive size={15} className="text-cyan-300" /> {t('architect.step2')}
                  </h3>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">{t('architect.targetStudio')}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full border border-white/[0.09] bg-white/[0.05] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/40">
                  {t('architect.pagesCount', { count: listItems.length })}
                </span>
              </div>

              <div className="relative mt-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={16} />
                <input
                  type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('architect.searchPages')}
                  className="w-full rounded-2xl border border-white/[0.09] bg-black/30 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/25 transition focus:border-cyan-300/50 focus:outline-none"
                />
              </div>

              <div className="no-scrollbar mt-4 grid max-h-[290px] gap-2.5 overflow-y-auto pr-1">
                <button
                  onClick={() => { setTargetId(''); setParentId(null); }}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition",
                    (!targetId && !parentId)
                      ? "border-cyan-300/40 bg-cyan-300/[0.09]"
                      : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05]"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", (!targetId && !parentId) ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-200" : "border-white/[0.08] bg-white/[0.05] text-white/50")}>
                      <Plus size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-black uppercase tracking-wide">{t('architect.newPage')}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-medium text-white/35">{t('architect.newPageDesc')}</span>
                    </span>
                  </span>
                  {(!targetId && !parentId) && <Check size={17} className="shrink-0 text-cyan-300" />}
                </button>

                {listItems.map(note => (
                  <div key={note.id} className="flex gap-2">
                    <button
                      onClick={() => { setTargetId(note.id); setParentId(null); }}
                      className={cn(
                        "flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border p-4 text-left transition",
                        targetId === note.id
                          ? "border-cyan-300/40 bg-cyan-300/[0.09]"
                          : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05]"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 text-xl">{note.emoji || '📄'}</span>
                        <span className="truncate text-[12px] font-bold tracking-tight">{note.title || t('architect.untitled')}</span>
                      </span>
                      {targetId === note.id && <Check size={16} className="shrink-0 text-cyan-300" />}
                    </button>
                    <button
                      onClick={() => { setParentId(note.id); setTargetId(''); }}
                      className={cn(
                        "flex w-12 shrink-0 items-center justify-center rounded-2xl border transition",
                        parentId === note.id
                          ? "border-violet-400/40 bg-violet-400/[0.12] text-violet-200"
                          : "border-white/[0.07] bg-white/[0.03] text-white/40 hover:bg-white/[0.05]"
                      )}
                      title={t('architect.makeSubpage')}
                      aria-label={t('architect.makeSubpage')}
                    >
                      <CornerDownRight size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Instructions — always visible: new page, sub-page and existing page */}
              <div className="mt-6 space-y-3 border-t border-white/[0.07] pt-5">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/90">
                  <Wand2 size={13} /> {t('architect.instructionsLabel')}
                </label>
                <textarea
                  value={changeRequest}
                  onChange={(e) => setChangeRequest(e.target.value)}
                  placeholder={targetId ? t('architect.changePlaceholder') : t('architect.instructionsPlaceholderNew')}
                  className="h-28 w-full resize-none rounded-2xl border border-white/[0.09] bg-black/30 p-4 text-sm text-white placeholder:text-white/25 transition focus:border-cyan-300/50 focus:outline-none"
                />
              </div>
            </motion.section>
          </div>

          {/* Right: Step 3 — Import studio */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12 }}
            className="h-fit rounded-[28px] border border-white/[0.09] bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-7 lg:col-span-7"
          >
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-sm font-black text-[#05070D] shadow-lg shadow-violet-500/25">3</span>
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
                  <Braces size={15} className="text-cyan-300" /> {t('architect.step3')}
                </h3>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">{t('architect.importStudio')} · {t('architect.jsonHint')}</p>
              </div>
              <span className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[9px] font-black uppercase tracking-widest",
                previewData
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                  : jsonError
                    ? "border-red-400/25 bg-red-400/10 text-red-300"
                    : "border-white/[0.09] bg-white/[0.05] text-white/30"
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", previewData ? "bg-emerald-400" : jsonError ? "bg-red-400" : "bg-white/30")} />
                {previewData ? t('architect.valid') : jsonError ? t('architect.invalid') : t('architect.waiting')}
              </span>
            </div>

            {/* JSON terminal */}
            <div className="mt-6 overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#070B16]">
              <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">JSON</span>
              </div>
              <textarea
                value={importData} onChange={(e) => setImportData(e.target.value)}
                placeholder={t('architect.pastePlaceholder')}
                spellCheck={false}
                className="h-72 w-full resize-none bg-transparent p-6 font-mono text-xs leading-relaxed text-cyan-100/80 placeholder:text-white/20 focus:outline-none"
              />
            </div>

            {jsonError && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.06] p-4 text-red-300">
                <AlertCircle size={16} className="shrink-0" />
                <p className="text-[10px] font-black uppercase leading-relaxed tracking-widest">JSON: {jsonError}</p>
              </div>
            )}

            <AnimatePresence>
              {previewData && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-5 overflow-hidden rounded-[22px] border border-white/[0.09] bg-white/[0.03]"
                >
                  <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-6 py-4">
                    <FileText size={13} className="text-cyan-300" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{t('architect.preview')}</span>
                  </div>
                  <div className="no-scrollbar max-h-[420px] overflow-y-auto p-7 sm:p-8">
                    {previewData.map((data: any, idx: number) => (
                      <div key={idx} className="mb-10 last:mb-0">
                        <div className="mb-5 flex items-center gap-4">
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-white/[0.08] bg-white/[0.05] text-3xl">{data.emoji || '📄'}</span>
                          <h4 className="text-2xl font-black tracking-tight text-white">{data.title || t('architect.untitled')}</h4>
                        </div>
                        <div className="preview-content prose prose-invert prose-sm max-w-none text-white/60" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content) }} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleImport} disabled={!previewData || isImporting}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-500 py-5 text-sm font-black uppercase tracking-[0.22em] text-[#05070D] shadow-xl shadow-violet-500/20 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-25 disabled:hover:brightness-100"
            >
              {isImporting ? <Loader2 size={22} className="animate-spin" /> : <ArrowRight size={22} strokeWidth={2.5} />}
              <span>{targetId ? t('architect.importUpdate') : parentId ? t('architect.importSubpages') : t('architect.importNew')}</span>
            </button>
          </motion.section>
        </div>
      </main>

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 left-1/2 z-[100] flex w-[92vw] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-[#0B1020]/95 px-5 py-4 shadow-2xl backdrop-blur-xl"
          >
            <span className={cn("h-2 w-2 shrink-0 animate-pulse rounded-full", status.type === 'success' ? "bg-emerald-400" : "bg-red-400")} />
            <p className="flex-1 text-[10px] font-black uppercase leading-relaxed tracking-widest text-white/85">{status.message}</p>
            <button onClick={() => setStatus(null)} className="shrink-0 text-white/40 transition hover:text-white" aria-label={t('common.cancel')}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .preview-content h1 { font-size: 1.5rem; font-weight: 900; margin-bottom: 1rem; color: white; }
        .preview-content p { margin-bottom: 1rem; line-height: 1.7; }
        .preview-content mark { background: rgba(103, 232, 249, 0.18); color: #67e8f9; padding: 0 2px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default AIContentArchitect;
