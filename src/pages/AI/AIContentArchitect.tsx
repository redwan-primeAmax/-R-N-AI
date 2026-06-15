/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { 
  ChevronLeft, 
  Copy, 
  Check, 
  Sparkles, 
  HardDrive, 
  Search,
  Info,
  AlertCircle,
  ArrowRight,
  FileText,
  RefreshCw,
  Plus,
  X,
  Loader2
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
    "description": "Powerful 1-line summary in Bengali (max 80 chars)",
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
   - Use <hr class='my-8 opacity-5'> for delicate section breaks.
   - For educational content, use the "Bilingual Layer": <p class='bilingual-row'><strong>English</strong> (Bengali Pronunciation) <mark>Bengali Meaning</mark></p>

3. WIDGET & SEMANTIC COMPONENTS:
   - TASK LISTS: <ul data-type='taskList'><li data-checked='false'><p>Item</p></li></ul>.
   - CALLOUTS: <blockquote class='expert-tip'>Insight here...</blockquote>.
   - STATUS BADGES: <span class='badge bg-red-400/10 text-red-500'>CRITICAL</span>.

4. LINGUISTIC PRECISION:
   - Output must be in **Standard Modern Bengali** (Shuddho). Avoid mixed-language clutter unless technical.
   - Strictly avoid conversational filler. No introductory text outside the JSON.

### FINAL OUTPUT DIRECTIVE:
Return ONLY the raw JSON array. Start with [ and end with ]. Your response must be directly parsable by JSON.parse().`;

const AIContentArchitect: React.FC = () => {
  const navigate = useNavigate();
  const [allNotes, setAllNotes] = useState<Note[]>([]); // Full list including sub-pages for logic
  const [displayNotes, setDisplayNotes] = useState<Note[]>([]); // Filtered for UI selection
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

  useEffect(() => {
    DataManager.getAllNotes().then(notes => {
      setAllNotes(notes);
      
      // Filter for UI display: No trash, No sub-pages
      const filtered = notes.filter(n => !n.isTrashed && !n.parentId);
      setDisplayNotes(filtered);
      setRecentNotes(filtered.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 15));
    });
  }, []);

  // Fetch sub-pages context when targetId changes
  useEffect(() => {
    if (targetId) {
      const loadContext = async () => {
        // Find ALL sub-pages of the target, including them in the prompt context
        const subPages = allNotes.filter(n => n.parentId === targetId && !n.isTrashed);
        let context = "";
        for (const sp of subPages) {
          context += `\n--- SUB-PAGE: ${sp.title} ---\n${sp.content}\n`;
        }
        setSubPagesContext(context);
      };
      loadContext();
    } else {
      setSubPagesContext('');
    }
  }, [targetId, allNotes]);

  const cleanAndFixJson = (str: string) => {
    let snippet = str.trim();
    
    // Find the actual JSON component
    const firstBrace = Math.min(
      snippet.indexOf('{') === -1 ? Infinity : snippet.indexOf('{'),
      snippet.indexOf('[') === -1 ? Infinity : snippet.indexOf('[')
    );
    const lastBrace = Math.max(
      snippet.lastIndexOf('}'),
      snippet.lastIndexOf(']')
    );
    
    if (firstBrace !== Infinity && lastBrace !== -1) {
      snippet = snippet.substring(firstBrace, lastBrace + 1);
    }

    // Basic cleaning (trailing commas)
    snippet = snippet.replace(/,\s*([}\]])/g, '$1');

    return snippet;
  };

  useEffect(() => {
    if (!importData.trim()) {
      setPreviewData(null);
      setJsonError(null);
      return;
    }

    const cleaned = cleanAndFixJson(importData);
    
    try {
      // Step 1: Try standard parse
      setPreviewData(JSON.parse(cleaned));
      setJsonError(null);
    } catch (e) {
      // Step 2: Try to fix unescaped double quotes in HTML attributes
      // This identifies patterns like class="foo" and turns them into class='foo'
      // effectively bypassing the escaping issue for shallow attributes.
      try {
        const heuristicFix = cleaned.replace(/(\w+)="([^"]*)"/g, "$1='$2'");
        setPreviewData(JSON.parse(heuristicFix));
        setJsonError(null);
      } catch (e2) {
        // Step 3: Last resort - provide clear error
        setPreviewData(null);
        setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
      }
    }
  }, [importData]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT);
    setCopied('prompt');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFullPrompt = async () => {
    if (!targetId) return;
    const note = await DataManager.getNoteById(targetId);
    if (!note) return;

    const fullPrompt = `${SYSTEM_PROMPT}

EXISTING CONTEXT:
---
MAIN PAGE TITLE: ${note.title}
DESCRIPTION: ${note.description || "None"}
MAIN CONTENT: ${note.content}
${subPagesContext ? `\nSUB-PAGES CONTEXT:${subPagesContext}` : ""}
---

USER REQUIREMENTS/CHANGES:
"${changeRequest || "Improve the structure and content. Handle sub-pages if necessary."}"

TASK: Update the existing content or create new sub-pages based on the requirements. Return the result in the specified JSON format.`;

    navigator.clipboard.writeText(fullPrompt);
    setCopied('update');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateUpdatePrompt = async () => {
    // This is now redundant or can be used for just requirement copy
    handleCopyFullPrompt();
  };

  const handleImport = async () => {
    if (!previewData) return;
    setIsImporting(true);
    try {
      const items = Array.isArray(previewData) ? previewData : [previewData];
      const activeWs = await DataManager.getActiveWorkspaceId();
      
      // Step 1: Assign real IDs and Map them
      const idMap: Record<string, string> = {};
      const processedItems = items.map(item => {
        const realId = (targetId && items.length === 1) 
          ? targetId 
          : `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        if (item.tempId) {
          idMap[item.tempId] = realId;
        }
        return { ...item, realId };
      });

      // Step 2: Establish Hierarchy
      // If we have multiple items and no parent selection, make the first one the parent
      let baseParentId = parentId;
      const mainPackId = processedItems[0].realId;

      // Step 3: Save each note with resolved links
      for (let i = 0; i < processedItems.length; i++) {
        const data = processedItems[i];
        if (!data.title || !data.content) continue;

        // Resolve internal links: replace data-id='tempId' with real ID
        let finalContent = data.content;
        Object.entries(idMap).forEach(([temp, real]) => {
          // Replace tempId with realId in the content
          const regex = new RegExp(`data-id=['"]${temp}['"]`, 'g');
          finalContent = finalContent.replace(regex, `data-id='${real}'`);
          
          // Also handle simple href='#tempId' if AI used it
          const hrefRegex = new RegExp(`href=['"]#${temp}['"]`, 'g');
          finalContent = finalContent.replace(hrefRegex, `href='/editor/${real}'`);
        });

        // Hierarchy logic
        let currentParent = baseParentId || undefined;
        if (i > 0 && !baseParentId && !targetId) {
          currentParent = mainPackId;
        }

        if (targetId && i === 0 && items.length === 1) {
          const existingNote = await DataManager.getNoteById(targetId);
          if (existingNote) {
            await DataManager.saveNote({
              ...existingNote,
              title: data.title,
              description: data.description || existingNote.description,
              content: finalContent,
              emoji: data.emoji !== undefined ? data.emoji : existingNote.emoji,
              updatedAt: Date.now()
            });
          }
        } else {
          await DataManager.saveNote({
            id: data.realId,
            title: data.title,
            description: data.description || '',
            content: finalContent,
            emoji: data.emoji || (currentParent ? '' : '📄'),
            parentId: currentParent,
            workspaceId: activeWs,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }

      setStatus({ type: 'success', message: 'ডেটা সফলভাবে ইম্পোর্ট ও লিংক করা হয়েছে!' });
      setImportData('');
      setTargetId('');
      setParentId(null);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'ইম্পোর্ট ব্যর্থ হয়েছে।' });
    } finally {
      setIsImporting(false);
    }
  };

  const listItems = searchQuery.trim() 
    ? displayNotes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : recentNotes;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-40 selection:bg-blue-500/30">
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/80 backdrop-blur-2xl border-b border-white/5 px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/main')} 
            className="p-3 -m-1 text-white/40 hover:text-white transition-all rounded-full hover:bg-white/5"
          >
            <ChevronLeft size={28} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              AI CONTENT ARCHITECT
              <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400 font-black">2.0</span>
            </h1>
            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] mt-0.5">Automated Content Architect (ঐতিহাসিক)</p>
          </div>
        </div>
      </header>

      <main className="px-6 py-12 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Configuration */}
        <div className="lg:col-span-5 space-y-12">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5">
                <Sparkles size={20} />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest">১. সিস্টেম প্রম্পট অনুলিপি</h2>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 space-y-6">
              <p className="text-[11px] text-white/40 leading-relaxed font-black">
                {targetId 
                  ? "নোট সিলেক্ট করা হয়েছে। আপনি চাইলে শুধু সিস্টেম প্রম্পট অথবা নোটের কন্টেন্টসহ ফুল প্রম্পট কপি করতে পারেন।" 
                  : "নিচের প্রম্পটটি AI (ChatGPT/Claude)-এ দিলে সে একদম সঠিক ফরম্যাটে রেজাল্ট দিবে।"}
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={handleCopyPrompt}
                  className={cn(
                    "flex-1 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[24px] flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest",
                    !targetId && "bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/20"
                  )}
                >
                  {copied === 'prompt' ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copied === 'prompt' ? 'কপি হয়েছে' : 'বেসিক প্রম্পট'}</span>
                </button>

                {targetId && (
                  <button 
                    onClick={handleCopyFullPrompt}
                    className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[24px] flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95"
                  >
                    {copied === 'update' ? <Check size={18} /> : <Sparkles size={18} />}
                    <span>{copied === 'update' ? 'ফুল প্রম্পট কপি হয়েছে' : 'ফুল প্রম্পট কপি'}</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                <HardDrive size={20} />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest">২. গন্তব্য নির্বাচন</h2>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="পাতা খুঁজুন..."
                  className="w-full bg-white/5 border border-white/10 rounded-[20px] pl-12 pr-6 py-4 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="grid gap-2 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                <button 
                  onClick={() => { setTargetId(''); setParentId(null); }}
                  className={cn("p-4 rounded-2xl border transition-all flex items-center justify-between group", (!targetId && !parentId) ? "bg-purple-500/10 border-purple-500/50" : "bg-white/5 border-white/5 hover:bg-white/10")}
                >
                  <div className="flex items-center gap-3"><Plus size={16} className="text-white/20" /><span className="font-bold text-[10px] uppercase">নতুন স্বতন্ত্র পাতা</span></div>
                  {(!targetId && !parentId) && <Check size={16} className="text-purple-400" />}
                </button>
                {listItems.map(note => (
                   <div key={note.id} className="flex gap-1.5">
                      <button 
                        onClick={() => { setTargetId(note.id); setParentId(null); }}
                        className={cn("flex-1 p-4 rounded-2xl border transition-all flex items-center justify-between group text-left min-w-0", targetId === note.id ? "bg-green-500/10 border-green-500/50" : "bg-white/5 border-white/5 hover:bg-white/10")}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl shrink-0">{note.emoji || '📄'}</span>
                          <div className="min-w-0 overflow-hidden">
                            <h4 className="font-bold text-[11px] truncate text-white/80">{note.title || 'শিরোনামহীন'}</h4>
                            <p className="text-[8px] text-white/20 font-black uppercase">Update Existing</p>
                          </div>
                        </div>
                        {targetId === note.id && <Check size={16} className="text-green-400" />}
                      </button>
                      <button 
                        onClick={() => { setParentId(note.id); setTargetId(''); }}
                        className={cn("w-12 rounded-2xl border transition-all flex items-center justify-center shrink-0", parentId === note.id ? "bg-blue-500/10 border-blue-500/50" : "bg-white/5 border-white/5 hover:bg-white/10")}
                      >
                        <ChevronLeft size={16} className={cn("transition-transform", parentId === note.id ? "text-blue-400 rotate-180" : "text-white/20")} />
                      </button>
                   </div>
                ))}
              </div>

              {targetId && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-white/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-purple-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">আপডেট রিকোয়ারমেন্ট</span>
                  </div>
                  <textarea 
                    value={changeRequest}
                    onChange={(e) => setChangeRequest(e.target.value)}
                    placeholder="নোটটিতে কী কী পরিবর্তন করতে চান তা এখানে লিখুন..."
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] text-white focus:outline-none focus:border-purple-500/30 resize-none"
                  />
                  <p className="text-[8px] text-white/20 font-black uppercase leading-relaxed">
                    সংকেত: আপনি নির্দিষ্ট কোনো অংশ ডিলিট করতে, বা নতুন কোনো সাব-টপিক এড করতে বলতে পারেন।
                  </p>
                </motion.div>
              )}
            </div>
          </section>
        </div>

        {/* Content & Preview */}
        <div className="lg:col-span-7 space-y-12">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-400 border border-green-500/20">
                <FileText size={20} />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest">৩. ডেটা ইম্পোর্ট ও প্রিভিউ</h2>
            </div>
            <div className="space-y-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/10 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <textarea 
                  value={importData} onChange={(e) => setImportData(e.target.value)}
                  placeholder="AI থেকে প্রাপ্ত JSON ডেটা এখানে পেস্ট করুন..."
                  className="w-full h-64 bg-[#0A0A0B] border-2 border-white/5 group-hover:border-green-500/20 rounded-[40px] px-8 py-10 text-green-400/80 font-mono text-[11px] leading-relaxed focus:outline-none focus:border-green-500/50 transition-all resize-none shadow-[inset_0_4px_40px_rgba(0,0,0,0.5)] placeholder:text-green-500/20"
                  style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                />
                <div className="absolute top-6 right-8">
                  <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-2", previewData ? "bg-green-500/10 border-green-500/20 text-green-400" : jsonError ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white/5 border-white/10 text-white/20 backdrop-blur-md")}>
                    {previewData ? 'Structure OK' : jsonError ? 'Invalid JSON' : 'No Data'}
                    {jsonError && <AlertCircle size={10} />}
                  </div>
                </div>
              </div>

              {jsonError && (
                <div className="px-6 py-3 bg-red-400/5 border border-red-400/10 rounded-2xl flex items-center gap-3">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-[10px] text-red-400/80 font-black uppercase">Fix required: Quotes inside content must be escaped</p>
                </div>
              )}

              <AnimatePresence>
                {previewData && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white/[0.03] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                    <div className="px-6 py-4 bg-white/5 flex items-center border-b border-white/5">
                       <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Live Preview</span>
                    </div>
                    <div className="p-10 max-h-[500px] overflow-y-auto no-scrollbar bg-black/40">
                      {(Array.isArray(previewData) ? previewData : [previewData]).map((data, idx) => (
                        <div key={idx} className="mb-12 last:mb-0 border-b border-white/5 pb-12 last:border-0 last:pb-0">
                          <div className="flex items-start gap-5 mb-8">
                            <span className="text-5xl shrink-0 leading-none">{data.emoji || '📄'}</span>
                            <div className="min-w-0">
                               <h1 className="text-3xl font-black text-white leading-tight mb-2 uppercase">{data.title || 'Untitled'}</h1>
                               <p className="text-sm text-white/40 font-black italic">{data.description || 'No description provided.'}</p>
                            </div>
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none text-white/70 preview-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content) }} />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={handleImport} disabled={!previewData || isImporting}
                className="w-full py-7 bg-green-500 hover:bg-green-400 disabled:opacity-20 text-black font-black text-[14px] uppercase tracking-[0.2em] rounded-[40px] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-green-500/20 active:scale-95"
              >
                {isImporting ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
                <span>{targetId ? 'আপডেট করুন' : parentId ? 'সাব-পেজ বানান' : 'তৈরি করুন'}</span>
              </button>
            </div>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {status && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-10 py-6 rounded-full border border-white/10 bg-black/80 backdrop-blur-xl flex items-center gap-4 min-w-[320px]">
            <div className={cn("w-2 h-2 rounded-full", status.type === 'success' ? "bg-green-500" : "bg-red-500")} />
            <p className="text-[10px] font-black uppercase tracking-widest text-white">{status.message}</p>
            <button onClick={() => setStatus(null)} className="ml-auto opacity-40 hover:opacity-100"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .preview-content h1 { font-size: 1.75rem; font-weight: 900; margin-bottom: 1rem; color: white; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem; }
        .preview-content h2 { font-size: 1.4rem; font-weight: 800; margin-top: 2rem; margin-bottom: 0.75rem; color: #fff; }
        .preview-content p { margin-bottom: 1.25rem; line-height: 1.8; font-size: 14px; }
        .preview-content strong { color: white; font-weight: 800; }
        .preview-content mark { background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 0 4px; border-radius: 4px; border: 1px solid rgba(59,130,246,0.1); }
        .preview-content ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .preview-content blockquote { border-left: 4px solid #3b82f6; padding: 1rem 1.5rem; background: rgba(255,255,255,0.02); border-radius: 0 1rem 1rem 0; font-style: italic; color: rgba(255,255,255,0.6); margin: 1.5rem 0; }
        .image-placeholder { background: rgba(255,255,255,0.02); border: 2px dashed rgba(255,255,255,0.05); border-radius: 1.5rem; padding: 3rem; text-align: center; color: rgba(255,255,255,0.2); font-size: 9px; font-weight: 900; margin: 1.5rem 0; }
        .sub-page-link { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          padding: 12px 16px; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(255,255,255,0.05); 
          border-radius: 12px; 
          color: #fff; 
          text-decoration: none; 
          font-weight: 700; 
          font-size: 13px; 
          margin: 8px 0;
          transition: all 0.2s ease;
        }
        .sub-page-link:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); transform: translateX(4px); }
        .sub-page-link::before { content: '📄'; font-size: 14px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default AIContentArchitect;
