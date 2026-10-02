/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    if (!targetId) return;
    const note = allNotes.find(n => n.id === targetId);
    if (!note) return;

    const fullPrompt = `${SYSTEM_PROMPT}

EXISTING CONTEXT:
---
TITLE: ${note.title}
CONTENT: ${note.content}
${subPagesContext ? `\nSUB-PAGES CONTEXT:${subPagesContext}` : ""}
---

USER REQUIREMENTS:
"${changeRequest || "Improve structure and quality."}"

Return the result as a JSON array.`;

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
            title: data.title || 'Untitled',
            content: content,
            emoji: data.emoji || (currentParent ? '' : '📄'),
            parentId: currentParent,
            workspaceId: activeWs,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }

      setStatus({ type: 'success', message: 'Content architected successfully!' });
      setImportData('');
      setTargetId('');
      setParentId(null);
      loadNotes();
    } catch (err) {
      setStatus({ type: 'error', message: 'Architecting failed.' });
    } finally {
      setIsImporting(false);
    }
  };

  const listItems = searchQuery.trim() 
    ? displayNotes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : recentNotes;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-sans overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-[#0d0d0d]/80 backdrop-blur-2xl border-b border-white/5 px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/tools')} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all">
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
               <Zap size={12} className="text-blue-500 fill-blue-500" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">System Architect</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
              Content <span className="text-blue-500">Architect</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="px-6 py-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Config */}
        <div className="lg:col-span-5 space-y-10">
          <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Code size={18} className="text-blue-400" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em]">Step 1: Get Prompt</h2>
            </div>
            <p className="text-[11px] text-white/30 leading-relaxed font-medium">
              Use this prompt to generate structured JSON content from your favorite AI model.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleCopyPrompt}
                className="w-full py-4.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest border border-white/5"
              >
                {copied === 'prompt' ? <Check size={16} /> : <Copy size={16} />}
                {copied === 'prompt' ? 'Copied' : 'Copy System Prompt'}
              </button>
              {targetId && (
                <button 
                  onClick={handleCopyFullPrompt}
                  className="w-full py-4.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20"
                >
                  {copied === 'update' ? <Check size={16} /> : <Sparkles size={16} />}
                  {copied === 'update' ? 'Full Prompt Copied' : 'Copy Contextual Prompt'}
                </button>
              )}
            </div>
          </section>

          <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <HardDrive size={18} className="text-purple-400" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em]">Step 2: Target Selection</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={16} />
              <input 
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages..."
                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-xs text-white focus:outline-none focus:border-purple-500/30 transition-all"
              />
            </div>
            <div className="grid gap-2 max-h-[280px] overflow-y-auto no-scrollbar pr-2">
              <button 
                onClick={() => { setTargetId(''); setParentId(null); }}
                className={cn("p-4 rounded-xl border transition-all flex items-center justify-between", (!targetId && !parentId) ? "bg-purple-500/10 border-purple-500/40" : "bg-white/5 border-white/5")}
              >
                <div className="flex items-center gap-3"><Plus size={16} /><span className="font-bold text-[10px] uppercase">New Independent Page</span></div>
                {(!targetId && !parentId) && <Check size={16} className="text-purple-400" />}
              </button>
              {listItems.map(note => (
                <div key={note.id} className="flex gap-2">
                  <button 
                    onClick={() => { setTargetId(note.id); setParentId(null); }}
                    className={cn("flex-1 p-4 rounded-xl border transition-all flex items-center justify-between text-left min-w-0", targetId === note.id ? "bg-green-500/10 border-green-500/40" : "bg-white/5 border-white/5")}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{note.emoji || '📄'}</span>
                      <h4 className="font-bold text-[11px] truncate uppercase tracking-tight">{note.title || 'Untitled'}</h4>
                    </div>
                  </button>
                  <button 
                    onClick={() => { setParentId(note.id); setTargetId(''); }}
                    className={cn("w-12 rounded-xl border transition-all flex items-center justify-center", parentId === note.id ? "bg-blue-500/10 border-blue-500/40" : "bg-white/5 border-white/5")}
                    title="Make Sub-page of this"
                  >
                    <ChevronLeft size={16} className={cn("transition-transform", parentId === note.id && "rotate-180 text-blue-400")} />
                  </button>
                </div>
              ))}
            </div>

            {targetId && (
              <div className="pt-6 border-t border-white/5 space-y-4 animate-in fade-in duration-500">
                <textarea 
                  value={changeRequest}
                  onChange={(e) => setChangeRequest(e.target.value)}
                  placeholder="What changes do you want?"
                  className="w-full h-32 bg-black/40 border border-white/5 rounded-2xl p-4 text-[11px] text-white focus:outline-none focus:border-blue-500/30 resize-none"
                />
              </div>
            )}
          </section>
        </div>

        {/* Right Column: JSON Input & Preview */}
        <div className="lg:col-span-7 space-y-10">
          <section className="space-y-6">
            <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-3">
                  <FileText size={18} className="text-green-400" />
                  <h2 className="text-xs font-black uppercase tracking-[0.2em]">Step 3: Import JSON</h2>
               </div>
               <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border", previewData ? "bg-green-500/10 border-green-500/20 text-green-400" : jsonError ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white/5 border-white/5 text-white/20")}>
                  {previewData ? 'Structure Valid' : jsonError ? 'Parsing Error' : 'Waiting...'}
               </div>
            </div>
            
            <textarea 
              value={importData} onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste JSON array here..."
              className="w-full h-80 bg-black/40 border-2 border-white/5 rounded-[2.5rem] p-8 text-green-400/80 font-mono text-[11px] leading-relaxed focus:outline-none focus:border-green-500/40 transition-all resize-none shadow-inner"
            />

            {jsonError && (
              <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center gap-3 text-red-400">
                <AlertCircle size={16} />
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">JSON Glitch: ${jsonError}</p>
              </div>
            )}

            <AnimatePresence>
              {previewData && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <div className="px-6 py-4 bg-white/5 border-b border-white/5">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Architectural Preview</span>
                  </div>
                  <div className="p-8 max-h-[400px] overflow-y-auto no-scrollbar">
                    {previewData.map((data: any, idx: number) => (
                      <div key={idx} className="mb-10 last:mb-0">
                        <div className="flex items-center gap-4 mb-6">
                          <span className="text-4xl">{data.emoji || '📄'}</span>
                          <h1 className="text-2xl font-black text-white uppercase">{data.title || 'Untitled'}</h1>
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
              className="w-full py-6 bg-green-600 hover:bg-green-500 disabled:opacity-20 text-black font-black text-sm uppercase tracking-[0.3em] rounded-[1.5rem] flex items-center justify-center gap-4 transition-all shadow-xl shadow-green-500/20"
            >
              {isImporting ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
              <span>{targetId ? 'Update Existing' : parentId ? 'Architect Sub-pages' : 'Architect Content'}</span>
            </button>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {status && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-5 rounded-3xl border border-white/10 bg-[#121212] shadow-2xl flex items-center gap-4">
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
