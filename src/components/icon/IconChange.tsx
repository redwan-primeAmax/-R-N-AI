import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, Loader2, Download, ChevronRight, Eye, RefreshCw
} from 'lucide-react';
import { FixedSizeGrid as Grid } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { 
  iconsDb, 
  isLibraryDownloaded, 
  getTotalIconsCount, 
  downloadAndExtractIcons, 
  CustomIcon,
  getCategories,
  AVAILABLE_LIBRARIES,
  IconLibrary
} from './IconManager';

interface IconChangeProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (svg: string) => void;
  currentIcon?: string;
}

export const IconChange = ({ isOpen, onClose, onSelectIcon, currentIcon }: IconChangeProps) => {
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const [downloadPercent, setDownloadPercent] = useState<number>(0);
  const [foundCount, setFoundCount] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [hasDownloaded, setHasDownloaded] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedLibrary, setSelectedLibrary] = useState<IconLibrary | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [displayedIcons, setDisplayedIcons] = useState<CustomIcon[]>([]);
  const [totalMatched, setTotalMatched] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const searchIdRef = useRef<number>(0);

  // Check state on mount / open
  useEffect(() => {
    if (isOpen) {
      const downloaded = isLibraryDownloaded();
      setHasDownloaded(downloaded);
      if (!downloaded) {
        setShowPrompt(true);
      } else {
        getTotalIconsCount().then(c => {
          setTotalCount(c);
          setFoundCount(c);
        });
        loadCategories();
        // Initial search to populate
        searchIcons('', 'All');
      }
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(['All', ...cats]);
    } catch (err) {
      console.error("Categories failed", err);
    }
  };

  const startDownload = async (library: IconLibrary) => {
    setSelectedLibrary(library);
    setShowPrompt(false);
    setIsDownloading(true);
    setFoundCount(0);
    try {
      const count = await downloadAndExtractIcons(library.fileName, (status, current, total, found) => {
        setDownloadProgress(status);
        setFoundCount(found);
        if (total > 0) {
          const pct = Math.round((current / total) * 100);
          setDownloadPercent(pct);
        }
      });
      setTotalCount(count);
      setFoundCount(count);
      setHasDownloaded(true);
      setIsDownloading(false);
      loadCategories();
      searchIcons('', 'All');
    } catch (err: any) {
      console.error(err);
      alert(err.message || "ডাউনলোড করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
      setIsDownloading(false);
      setShowPrompt(true);
    }
  };

  const searchIcons = async (query: string, cat: string) => {
    searchIdRef.current += 1;
    const currentSearchId = searchIdRef.current;
    
    setIsLoading(true);
    setDisplayedIcons([]);
    setTotalMatched(0);

    try {
      if (!query.trim() && cat === 'All') {
        const count = await iconsDb.icons.count();
        if (currentSearchId !== searchIdRef.current) return;
        setTotalMatched(count);
        
        const CHUNK_SIZE = 500;
        for (let i = 0; i < count; i += CHUNK_SIZE) {
          if (currentSearchId !== searchIdRef.current) return;
          const chunk = await iconsDb.icons.offset(i).limit(CHUNK_SIZE).toArray();
          if (currentSearchId !== searchIdRef.current) return;
          setDisplayedIcons(prev => [...prev, ...chunk]);
          await new Promise(r => setTimeout(r, 10));
        }
      } else {
        let collection = iconsDb.icons.toCollection();
        if (cat !== 'All') {
          collection = iconsDb.icons.where('category').equals(cat);
        }
        
        const allInCategory = await collection.toArray();
        if (currentSearchId !== searchIdRef.current) return;
        
        let filtered = allInCategory;
        if (query.trim()) {
          const term = query.toLowerCase().trim();
          filtered = allInCategory.filter(icon => 
            icon.name.toLowerCase().includes(term) || 
            icon.category.toLowerCase().includes(term) || 
            icon.subcategory.toLowerCase().includes(term)
          );
        }
        
        if (currentSearchId !== searchIdRef.current) return;
        setTotalMatched(filtered.length);
        
        const CHUNK_SIZE = 200;
        for (let i = 0; i < filtered.length; i += CHUNK_SIZE) {
          if (currentSearchId !== searchIdRef.current) return;
          const chunk = filtered.slice(i, i + CHUNK_SIZE);
          if (currentSearchId !== searchIdRef.current) return;
          setDisplayedIcons(prev => [...prev, ...chunk]);
          await new Promise(r => setTimeout(r, 5));
        }
      }
    } catch (err) {
      console.error("Filtering error", err);
    } finally {
      if (currentSearchId === searchIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    searchIcons(searchQuery, selectedCategory);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    searchIcons(searchQuery, category);
  };

  const isCurrent = (svgContent: string) => {
    if (!currentIcon) return false;
    return currentIcon.trim() === svgContent.trim();
  };

  // Grid Cell Renderer
  const Cell = ({ columnIndex, rowIndex, style, data }: { columnIndex: number, rowIndex: number, style: any, data: CustomIcon[] }) => {
    const index = rowIndex * 2 + columnIndex;
    const icon = data[index];
    if (!icon) return null;
    const isActive = isCurrent(icon.content);

    return (
      <div style={style} className="p-1 sm:p-2">
        <button
          onClick={() => {
            onSelectIcon(icon.content);
            onClose();
          }}
          className={`relative w-full h-full bg-[#1A1A1A] border border-white/[0.03] hover:border-purple-500/50 hover:bg-white/[0.05] rounded-[2rem] transition-all group flex flex-col items-center justify-center p-4 active:scale-95 ${
            isActive ? 'ring-2 ring-purple-500 bg-purple-500/10 border-transparent shadow-[0_0_30px_rgba(168,85,247,0.15)]' : ''
          }`}
        >
          <div 
            className="flex-1 w-full flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:scale-105 transition-all duration-500 [&>svg]:w-full [&>svg]:h-full [&>svg]:block [&>svg]:max-w-[85%] [&>svg]:max-h-[85%]"
            dangerouslySetInnerHTML={{ 
              __html: icon.content.replace(/<svg/i, '<svg preserveAspectRatio="xMidYMid meet" ') 
            }}
          />
          
          <div className="mt-auto pt-2 w-full">
            <span className="text-[9px] font-black text-neutral-600 group-hover:text-neutral-400 transition-colors truncate block w-full text-center px-2 uppercase tracking-tighter opacity-80">
              {icon.name}
            </span>
          </div>

          {isActive && (
            <div className="absolute top-4 right-4 bg-purple-500 p-1.5 rounded-full shadow-lg">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </button>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 h-[85vh] bg-[#121212] border-t border-white/5 z-[9999] rounded-t-[2.5rem] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Handle Bar */}
            <div className="flex justify-center py-2.5 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-white/10" />
            </div>

            {/* Header Area */}
            <div className="flex items-start justify-between px-6 pb-4 border-b border-white/5 shrink-0">
              <div className="flex flex-col">
                <h3 className="text-xl font-black tracking-tight text-white mb-1">আইকন সেটআপ</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">
                    {hasDownloaded ? `${totalCount.toLocaleString()} আইকন প্রস্তুত` : 'লাইব্রেরি লোড নেই'}
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-all border border-white/5 active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Prompt for lib selection */}
            {showPrompt && (
              <div className="flex flex-col items-center justify-center flex-1 px-8 text-center max-w-lg mx-auto overflow-y-auto w-full">
                <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mb-8 border border-purple-500/20 text-purple-400">
                  <Download size={40} className="animate-bounce" />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-white mb-3">লাইব্রেরি নির্বাচন করুন</h3>
                <p className="text-sm text-neutral-400 leading-relaxed mb-10 font-medium">
                  আইকনগুলো দেখার জন্য প্রথমে যেকোনো একটি প্যাক ইন্ডেক্স করতে হবে।
                </p>
                <div className="grid grid-cols-1 gap-4 w-full mb-10">
                  {AVAILABLE_LIBRARIES.map(lib => (
                    <button
                      key={lib.id}
                      onClick={() => startDownload(lib)}
                      className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-5 px-6 rounded-3xl border border-white/10 transition-all text-sm flex items-center justify-between group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
                          <Eye size={22} />
                        </div>
                        <span className="text-left font-bold">{lib.name}</span>
                      </div>
                      <ChevronRight size={18} className="text-neutral-500" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={onClose}
                  className="w-full text-neutral-500 hover:text-white font-bold py-3 transition-colors text-xs uppercase tracking-widest"
                >
                  না, পরে হবে
                </button>
              </div>
            )}

            {/* Indexing Progress */}
            {isDownloading && (
              <div className="flex flex-col items-center justify-center flex-1 px-12 text-center max-w-lg mx-auto">
                <div className="mb-10 text-center">
                  <span className="text-[10px] uppercase font-black tracking-[0.3em] text-purple-400 block mb-2 opacity-60">Scanning SVGs</span>
                  <div className="text-5xl font-black text-white tracking-tight tabular-nums">
                    {foundCount.toLocaleString()}
                  </div>
                </div>
                <div className="relative mb-10">
                  <Loader2 size={48} className="text-purple-500 animate-spin" />
                </div>
                <h4 className="text-xl font-black text-white mb-2">{selectedLibrary?.name}</h4>
                <p className="text-[10px] text-purple-300/60 font-mono tracking-[0.2em] uppercase mb-10">
                  {downloadProgress || 'ইন্ডেক্স তৈরি হচ্ছে...'}
                </p>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="bg-purple-600 h-full"
                    animate={{ width: `${downloadPercent}%` }}
                    transition={{ ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}

            {/* Main Content Dashboard */}
            {hasDownloaded && !isDownloading && !showPrompt && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Fixed Search & Filters */}
                <div className="p-6 pb-4 bg-[#121212] shrink-0">
                  <div className="relative mb-6">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
                    <input 
                      type="text"
                      placeholder="আইকন খুঁজুন..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                      className="w-full bg-white/[0.03] border border-white/10 focus:border-purple-500/50 rounded-3xl py-5 pl-14 pr-6 text-white text-base font-medium focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => handleCategorySelect(cat)}
                        className={`px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap transition-all border uppercase tracking-wider ${
                          selectedCategory === cat 
                            ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/20' 
                            : 'bg-white/5 border-white/5 text-neutral-500 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid Area */}
                <div className="flex-1 min-h-0 bg-black/20">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Loader2 className="text-purple-500 animate-spin mb-4" size={32} />
                      <p className="text-[10px] text-neutral-500 uppercase tracking-[0.3em] font-black">Search Scanning...</p>
                    </div>
                  ) : displayedIcons.length > 0 ? (
                    <AutoSizer>
                      {({ height, width }) => (
                        <Grid
                          columnCount={2}
                          columnWidth={width / 2}
                          height={height}
                          rowCount={Math.ceil(displayedIcons.length / 2)}
                          rowHeight={width / 2}
                          width={width}
                          itemData={displayedIcons}
                          className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                        >
                          {Cell}
                        </Grid>
                      )}
                    </AutoSizer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 opacity-40">
                      <Search size={64} className="mb-6 stroke-[1.5]" />
                      <p className="text-sm font-black">কোনো আইকন মেলেনি</p>
                    </div>
                  )}
                </div>

                {/* Bottom Status Bar */}
                <div className="px-8 py-4 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-600 font-mono tracking-[0.2em] uppercase shrink-0 bg-[#121212]">
                  <div className="flex items-center gap-4">
                    <span>Matched: <span className="text-purple-400 font-black">{totalMatched.toLocaleString()}</span></span>
                    <span className="w-1 h-1 rounded-full bg-neutral-800" />
                    <span>Grid: 2xN Virtualized</span>
                  </div>
                  <button 
                    onClick={() => setShowPrompt(true)}
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors font-black active:scale-95"
                  >
                    <RefreshCw size={12} />
                    Packs
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
