import React, { useState, useRef, useMemo } from 'react';
import { Upload, Box, Trash2, Play, Search, Grid, List, Sparkles, Filter, MoreVertical } from 'lucide-react';
import { ToolManager, Tool } from './services/ToolManager';
import { motion, AnimatePresence } from 'framer-motion';
import ToolRunner from './ToolRunner';
import { cn } from '../../utils/cn';

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    const loadedTools = await ToolManager.getTools();
    setTools(loadedTools.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  };

  const filteredTools = useMemo(() => {
    return tools.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tools, searchQuery]);

  const favorites = useMemo(() => filteredTools.filter(t => t.isFavorite), [filteredTools]);
  const others = useMemo(() => filteredTools.filter(t => !t.isFavorite), [filteredTools]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await ToolManager.uploadTool(file);
      await loadTools();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('আপনি কি এই টুলটি ডিলিট করতে চান?')) {
      await ToolManager.deleteTool(id);
      await loadTools();
    }
  };

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await ToolManager.toggleFavorite(id);
    await loadTools();
  };

  if (activeTool) {
    return <ToolRunner tool={activeTool} onClose={() => setActiveTool(null)} />;
  }

  const ToolCard = ({ tool }: { tool: Tool }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => setActiveTool(tool)}
      className="group relative cursor-pointer"
    >
      <div className={cn(
        "absolute inset-0 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        tool.isFavorite ? "bg-amber-500/10" : "bg-purple-500/10"
      )} />
      <div className={cn(
        "relative p-8 bg-[#151516] border border-white/5 rounded-[40px] hover:border-purple-500/30 transition-all shadow-2xl flex flex-col h-full active:scale-[0.98]",
        tool.isFavorite ? "border-amber-500/20" : ""
      )}>
        <div className="flex items-start justify-between mb-8">
          <div className={cn(
            "w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6",
            tool.isFavorite ? "bg-gradient-to-br from-amber-400 to-orange-600 shadow-amber-500/20" : "bg-gradient-to-br from-purple-500 to-blue-600 shadow-purple-500/20"
          )}>
            <Box size={32} strokeWidth={2.5} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => handleToggleFavorite(tool.id, e)}
              className={cn(
                "p-3 rounded-2xl transition-all",
                tool.isFavorite ? "bg-amber-500/20 text-amber-500" : "bg-white/5 text-white/20 hover:text-amber-500"
              )}
              title={tool.isFavorite ? "Unfavorite" : "Favorite"}
            >
              <Sparkles size={18} fill={tool.isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              onClick={(e) => handleDelete(tool.id, e)}
              className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-white/20 rounded-2xl transition-all"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="mt-auto">
          <h3 className="text-2xl font-black tracking-tight mb-2 group-hover:text-purple-400 transition-colors uppercase truncate">
            {tool.name}
          </h3>
          <div className="flex items-center gap-4 text-white/30 text-[10px] font-bold uppercase tracking-widest leading-none">
            <span className="flex items-center gap-1">
              <List size={10} /> {Object.keys(tool.files).length} Assets
            </span>
            <span className="w-1 h-1 bg-white/10 rounded-full" />
            <span>Ready to Launch</span>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 p-4 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
           <Play size={24} fill="currentColor" className="text-purple-500" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] pointer-events-none translate-y-1/2" />

      <div className="relative max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-purple-500/20">
                <Sparkles size={12} />
                Dynamic Tool Library
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-2">
                টুলস <span className="text-purple-500">লাইব্রেরি</span>
              </h1>
              <p className="text-white/40 text-lg font-medium">আপনার ডিজিটাল অস্ত্রাগার: ১০০০+ টুলের সম্ভাবনা</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-8 py-4 bg-white text-black hover:bg-purple-500 hover:text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-purple-500/10"
              >
                <Upload size={18} />
                {isUploading ? 'পার্সিং হচ্ছে...' : 'নতুন টুল যোগ করুন'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 p-2 bg-[#151516] border border-white/5 rounded-3xl focus-within:border-purple-500/50 transition-all shadow-2xl">
             <div className="pl-4 text-white/20">
               <Search size={22} />
             </div>
             <input 
               type="text"
               placeholder="লাইব্রেরি থেকে টুল খুঁজুন (যেমন: ক্যালকুলেটর, কনভার্টার)..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="flex-1 bg-transparent border-none focus:ring-0 text-lg py-3 placeholder:text-white/10"
             />
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".zip"
            className="hidden"
          />
        </header>

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div className="mb-16">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-amber-500/50 mb-8 ml-4">আপনার পছন্দের টুলগুলো</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               <AnimatePresence mode="popLayout">
                 {favorites.map(tool => <ToolCard key={`fav-${tool.id}`} tool={tool} />)}
               </AnimatePresence>
            </div>
          </div>
        )}

        {/* All Tools Section */}
        <div>
          {others.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-8 px-4">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/20">অন্যান্য টুলস সংগ্রহ ({others.length})</h2>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white")}
                    >
                      <Grid size={18} />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white")}
                    >
                      <List size={18} />
                    </button>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {others.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {others.map((tool) => (
                      <motion.div
                        key={tool.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onClick={() => setActiveTool(tool)}
                        className="group flex items-center gap-6 p-6 bg-[#151516] border border-white/5 rounded-3xl hover:border-purple-500/30 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <div className="w-14 h-14 bg-white/5 text-purple-400 rounded-2xl flex items-center justify-center shrink-0">
                          <Box size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white uppercase tracking-tight truncate">{tool.name}</h3>
                          <p className="text-xs text-white/40">{Object.keys(tool.files).length} assets in package</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <button onClick={(e) => handleToggleFavorite(tool.id, e)} className={cn("p-3 rounded-2xl transition-all", tool.isFavorite ? "text-amber-500" : "text-white/20")}>
                             <Sparkles size={18} fill={tool.isFavorite ? "currentColor" : "none"} />
                           </button>
                           <button className="p-3 bg-white/5 text-purple-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-all">
                             <Play size={20} fill="currentColor" />
                           </button>
                           <button onClick={(e) => handleDelete(tool.id, e)} className="p-3 bg-white/5 hover:bg-red-500/20 text-white/20 hover:text-red-500 rounded-2xl transition-all">
                             <Trash2 size={20} />
                           </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          ) : !favorites.length && !isUploading && (
            <div className="py-32 flex flex-col items-center justify-center text-center">
              <div className="w-32 h-32 bg-white/5 text-white/5 rounded-[40px] flex items-center justify-center mb-8">
                <Search size={64} />
              </div>
              <h2 className="text-2xl font-black uppercase text-white/60 mb-2">কোনো টুল পাওয়া যায়নি</h2>
              <p className="text-white/20 max-w-sm">আপনার সার্চ বা ফিল্টার পরিবর্তন করে দেখুন অথবা নতুন টুল আপলোড করুন।</p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-6 text-purple-400 hover:text-purple-300 font-bold"
                >
                  সার্চ ক্লিয়ার করুন
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
