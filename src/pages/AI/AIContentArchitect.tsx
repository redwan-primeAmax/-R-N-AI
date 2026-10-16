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
  Code
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
    <div className="min-h-screen bg-[#0E0D0B] text-white flex flex-col font-sans overflow-x-hidden">
      <div className="pointer-events-none fixed -top-24 right-0 w-[380px] h-[380px] bg-amber-500/[0.07] blur-[110px] rounded-full" />
      <header className="sticky top-0 z-40 bg-[#0E0D0B]/85 backdrop-blur-2xl border-b border-white/[0.06] px-5 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/tools')} className="w-11 h-11 shrink-0 flex items-center justify-center bg-white/[0.05] hover:bg-white/10 border border-white/[0.07] rounded-2xl transition-all active:scale-90" aria-label={t('common.back')}>
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
               <Zap size={11} className="text-amber-400 fill-amber-400" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">{t('architect.eyebrow')}</span>
            </div>
            <h1 className="text-[24px] font-black tracking-tight leading-tight truncate">
              {t('architect.title')}
            </h1>
          </div>
        </div>
      </header>

      <main className="relative px-5 sm:px-8 py-8 max-w-7xl mx-auto w-full">
        <p className="text-sm text-white/40 font-medium leading-relaxed max-w-2xl">{t('architect.subtitle')}</p>
        {/* Step progress */}
        <div className="flex items-center gap-2 mt-6 mb-8 flex-wrap">
          {[t('architect.step1'), t('architect.step2'), t('architect.step3')].map((label, i) => {
            const stepNo = i + 1;
            const current = previewData ? 3 : 1;
            const done = stepNo < current || (stepNo === 1 && copied !== false) || (stepNo === 3 && !!previewData);
            const active = stepNo === current && !done;
            return (
              <span key={label} className="inline-flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider",
                  done ? "bg-amber-400 text-black border-amber-300" : active ? "bg-amber-400/10 text-amber-300 border-amber-400/40" : "bg-white/[0.03] text-white/35 border-white/[0.08]"
                )}>
                  {done ? <Check size={11} strokeWidth={3.5} /> : <span>{stepNo}</span>}
                  {label}
                </span>
                {stepNo < 3 && <span className="w-4 h-px bg-white/10" />}
              </span>
            );
          })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Config */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center shrink-0">1</span>
              <Code size={17} className="text-amber-300" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em]">{t('architect.step1')}</h2>
            </div>
            <p className="text-[11px] text-white/30 leading-relaxed font-medium">
              {t('architect.step1Desc')}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleCopyPrompt}
                className="w-full py-4.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest border border-white/5"
              >
                {copied === 'prompt' ? <Check size={16} /> : <Copy size={16} />}
                {copied === 'prompt' ? t('architect.copied') : t('architect.copyPrompt')}
              </button>
              <button
                onClick={handleCopyFullPrompt}
                className="w-full py-4 bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-amber-950 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-[0.99]"
              >
                {copied === 'update' ? <Check size={16} /> : <Sparkles size={16} />}
                {copied === 'update' ? t('architect.copied') : t('architect.copyFullPrompt')}
              </button>
            </div>
          </section>

          <section className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center shrink-0">2</span>
              <HardDrive size={17} className="text-amber-300" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em]">{t('architect.step2')}</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={16} />
              <input 
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('architect.searchPages')}
                className="w-full bg-black/30 border border-white/[0.08] rounded-2xl pl-12 pr-5 py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/40 transition-all"
              />
            </div>
            <div className="grid gap-2 max-h-[280px] overflow-y-auto no-scrollbar pr-2">
              <button 
                onClick={() => { setTargetId(''); setParentId(null); }}
                className={cn("p-4 rounded-2xl border transition-all flex items-center justify-between", (!targetId && !parentId) ? "bg-amber-400/10 border-amber-400/40" : "bg-white/5 border-white/5")}
              >
                <div className="flex items-center gap-3"><Plus size={16} /><span className="font-bold text-[10px] uppercase">{t('architect.newPage')}</span></div>
                {(!targetId && !parentId) && <Check size={16} className="text-amber-300" />}
              </button>
              {listItems.map(note => (
                <div key={note.id} className="flex gap-2">
                  <button 
                    onClick={() => { setTargetId(note.id); setParentId(null); }}
                    className={cn("flex-1 p-4 rounded-2xl border transition-all flex items-center justify-between text-left min-w-0", targetId === note.id ? "bg-amber-400/[0.08] border-amber-400/30" : "bg-white/5 border-white/5")}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{note.emoji || '📄'}</span>
                      <h4 className="font-bold text-[11px] truncate uppercase tracking-tight">{note.title || t('architect.untitled')}</h4>
                    </div>
                  </button>
                  <button 
                    onClick={() => { setParentId(note.id); setTargetId(''); }}
                    className={cn("w-12 rounded-2xl border transition-all flex items-center justify-center", parentId === note.id ? "bg-amber-400/[0.08] border-amber-400/30" : "bg-white/5 border-white/5")}
                    title={t('architect.makeSubpage')}
                  >
                    <ChevronLeft size={16} className={cn("transition-transform", parentId === note.id && "rotate-180 text-amber-300")} />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-5 border-t border-white/[0.06] space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300/80">
                <Sparkles size={12} />
                {t('architect.instructionsLabel')}
              </label>
              <textarea
                value={changeRequest}
                onChange={(e) => setChangeRequest(e.target.value)}
                placeholder={targetId ? t('architect.changePlaceholder') : t('architect.instructionsPlaceholderNew')}
                className="w-full h-28 bg-black/30 border border-white/[0.08] rounded-2xl p-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/40 resize-none transition-colors"
              />
            </div>
          </section>
        </div>

        {/* Right Column: JSON Input & Preview */}
        <div className="lg:col-span-7">
          <section className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
               <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center shrink-0">3</span>
                  <FileText size={17} className="text-amber-300" />
                  <h2 className="text-xs font-black uppercase tracking-[0.2em]">{t('architect.step3')}</h2>
               </div>
               <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border", previewData ? "bg-green-500/10 border-green-500/20 text-green-400" : jsonError ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white/5 border-white/5 text-white/20")}>
                  {previewData ? t('architect.valid') : jsonError ? t('architect.invalid') : t('architect.waiting')}
               </div>
            </div>
            
            <textarea 
              value={importData} onChange={(e) => setImportData(e.target.value)}
              placeholder={t('architect.pastePlaceholder')}
              className="w-full h-72 bg-black/30 border border-white/[0.08] rounded-3xl p-6 text-emerald-300/80 font-mono text-xs leading-relaxed focus:outline-none focus:border-amber-400/40 transition-all resize-none"
            />

            {jsonError && (
              <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center gap-3 text-red-400">
                <AlertCircle size={16} />
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">JSON: {jsonError}</p>
              </div>
            )}

            <AnimatePresence>
              {previewData && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.02] border border-white/[0.07] rounded-3xl overflow-hidden">
                  <div className="px-6 py-4 bg-white/5 border-b border-white/5">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{t('architect.preview')}</span>
                  </div>
                  <div className="p-8 max-h-[400px] overflow-y-auto no-scrollbar">
                    {previewData.map((data: any, idx: number) => (
                      <div key={idx} className="mb-10 last:mb-0">
                        <div className="flex items-center gap-4 mb-6">
                          <span className="text-4xl">{data.emoji || '📄'}</span>
                          <h1 className="text-2xl font-black text-white uppercase">{data.title || t('architect.untitled')}</h1>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none text-white/60 preview-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content) }} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleImport} disabled={!previewData || isImporting}
              className="w-full py-5 bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 disabled:opacity-25 disabled:hover:from-amber-300 disabled:hover:to-amber-500 text-amber-950 font-black text-sm uppercase tracking-[0.25em] rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-amber-500/20 active:scale-[0.99]"
            >
              {isImporting ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
              <span>{targetId ? t('architect.importUpdate') : parentId ? t('architect.importSubpages') : t('architect.importNew')}</span>
            </button>
          </section>
        </div>
        </div>
      </main>

      <AnimatePresence>
        {status && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl border border-white/10 bg-[#171512]/95 backdrop-blur-xl shadow-2xl flex items-center gap-3 max-w-[92vw]">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", status.type === 'success' ? "bg-green-500" : "bg-red-500")} />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">{status.message}</p>
            <button onClick={() => setStatus(null)} className="ml-4 opacity-40 hover:opacity-100"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .preview-content h1 { font-size: 1.5rem; font-weight: 900; margin-bottom: 1rem; color: white; }
        .preview-content p { margin-bottom: 1rem; line-height: 1.7; }
        .preview-content mark { background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 0 2px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default AIContentArchitect;
