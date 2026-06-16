import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, Loader2, Download, AlertCircle, 
  HelpCircle, ChevronRight, Check, SlidersHorizontal, Eye
} from 'lucide-react';
import { 
  iconsDb, 
  isLibraryDownloaded, 
  getTotalIconsCount, 
  downloadAndExtractIcons, 
  CustomIcon,
  getCategories
} from './IconManager';

interface IconChangeProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (svgContent: string) => void;
  currentIcon?: string;
}

export const IconChange = ({ isOpen, onClose, onSelectIcon, currentIcon }: IconChangeProps) => {
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const [downloadPercent, setDownloadPercent] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [hasDownloaded, setHasDownloaded] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>([]);
  const [displayedIcons, setDisplayedIcons] = useState<CustomIcon[]>([]);
  const [totalMatched, setTotalMatched] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  
  // Scopes for streaming batch
  const streamRef = useRef<number>(0);

  // Check state on mount / open
  useEffect(() => {
    if (isOpen) {
      const downloaded = isLibraryDownloaded();
      setHasDownloaded(downloaded);
      if (!downloaded) {
        setShowPrompt(true);
      } else {
        getTotalIconsCount().then(c => setTotalCount(c));
        loadCategories();
        // Load default batch
        setTimeout(() => triggerFiltering(), 100);
      }
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (err) {
      console.error("Categories failed", err);
    }
  };

  const startDownload = async () => {
    setShowPrompt(false);
    setIsDownloading(true);
    try {
      const count = await downloadAndExtractIcons((status, current, total) => {
        setDownloadProgress(status);
        if (total > 0) {
          const pct = Math.round((current / total) * 100);
          setDownloadPercent(pct);
        }
      });
      setTotalCount(count);
      setHasDownloaded(true);
      setIsDownloading(false);
      loadCategories();
      triggerFiltering();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "ডাউনলোড করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
      setIsDownloading(false);
      setShowPrompt(true);
    }
  };

  const triggerFiltering = async (query = searchQuery, cat = selectedCategory) => {
    // Cancel previous stream
    streamRef.current += 1;
    const currentStreamId = streamRef.current;
    
    setIsStreaming(true);
    setDisplayedIcons([]);

    try {
      let results: CustomIcon[] = [];
      
      if (!query.trim() && cat === 'All') {
        // Default: display first 500 items sorted by id for consistency
        results = await iconsDb.icons.limit(800).toArray();
      } else {
        // Query database with search
        const term = query.toLowerCase().trim();
        const baseQuery = iconsDb.icons;
        
        const allIcons = await baseQuery.toArray();
        results = allIcons.filter(icon => {
          const matchTerm = !term || 
            icon.name.toLowerCase().includes(term) || 
            icon.category.toLowerCase().includes(term) || 
            icon.subcategory.toLowerCase().includes(term);
          
          const matchCat = cat === 'All' || icon.category === cat;
          return matchTerm && matchCat;
        });
      }

      setTotalMatched(results.length);

      // Stream matching elements "একটা একটা করে" (batch by batch for performance to support 50k+ icons)
      let offset = 0;
      const batchSize = 12; // Small chunks for highly responsive streaming
      
      const streamNextBatch = () => {
        if (currentStreamId !== streamRef.current) return; // stale stream check
        
        if (offset >= results.length) {
          setIsStreaming(false);
          return;
        }

        const batch = results.slice(offset, offset + batchSize);
        setDisplayedIcons(prev => [...prev, ...batch]);
        offset += batchSize;

        // Visual staggering and frame-by-frame loading
        requestAnimationFrame(streamNextBatch);
      };

      streamNextBatch();
    } catch (err) {
      console.error("Filtering error", err);
      setIsStreaming(false);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    triggerFiltering();
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    triggerFiltering(searchQuery, category);
  };

  const isCurrent = (svgContent: string) => {
    if (!currentIcon) return false;
    return currentIcon.trim() === svgContent.trim();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
          />

          {/* Bottom Sheet Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 max-h-[85vh] h-[85vh] bg-[#141414] border-t border-white/5 rounded-t-[2.5rem] shadow-2xl z-[120] flex flex-col text-white overflow-hidden pb-safe font-sans"
          >
            {/* Header top handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1 rounded-full bg-white/10" />
            </div>

            {/* Prompt modal inside bottom sheet */}
            {showPrompt && (
              <div className="flex flex-col items-center justify-center flex-1 px-8 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20 text-purple-400">
                  <Download size={32} className="animate-bounce" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-white mb-3">আইকন লাইব্রেরি ডাউনলোড করুন</h3>
                <p className="text-sm text-neutral-400 leading-relaxed mb-8">
                  ৫০,০০০+ প্রিমিয়াম ভেক্টর এবং আধুনিক ক্যাটাগরি সমন্বিত আইকন লাইব্রেরি অফলাইনে কাজের উপযোগী করে আপনার ব্রাউজারে ইনডেক্স করতে চান? এটি একবার ডাউনলোড হবে এবং পরবর্তীতে সম্পূর্ণ ক্যাশিং এ চলবে।
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={onClose}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/80 font-bold py-3.5 rounded-2xl border border-white/5 transition-all text-sm active:scale-[0.98]"
                  >
                    না, পরে হবে
                  </button>
                  <button
                    onClick={startDownload}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-3.5 rounded-2xl hover:shadow-lg hover:shadow-purple-500/20 transition-all text-sm active:scale-[0.98]"
                  >
                    হ্যাঁ, ডাউনলোড করুন
                  </button>
                </div>
              </div>
            )}

            {/* Download Progress Bar Screen */}
            {isDownloading && (
              <div className="flex flex-col items-center justify-center flex-1 px-12 text-center max-w-lg mx-auto">
                <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
                  <Loader2 size={42} className="text-purple-500 animate-spin" />
                  {downloadPercent > 0 && (
                    <span className="absolute text-xs font-black text-purple-400">{downloadPercent}%</span>
                  )}
                </div>
                <h4 className="text-lg font-black tracking-tight text-white mb-2">লাইব্রেরি প্রস্তুত হচ্ছে</h4>
                <p className="text-xs text-purple-300/60 font-mono select-none tracking-widest uppercase mb-6">
                  {downloadProgress || 'অফলাইন ইন্ডেক্স তৈরি হচ্ছে...'}
                </p>
                {/* Progress bar container */}
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/[0.02]">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                    animate={{ width: `${downloadPercent || 20}%` }}
                    transition={{ ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}

            {/* Standard Dashboard Screen */}
            {hasDownloaded && !isDownloading && !showPrompt && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Search Header Container */}
                <div className="px-6 pb-4 border-b border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        <span>আইকন গ্যালারি</span>
                        <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] rounded-full font-mono font-bold uppercase select-none">
                          {totalCount.toLocaleString()} Icons
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-400">খুঁজুন অথবা ফিল্টার চিপস সিলেক্ট করে ব্রাউজ করুন</p>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-1.5 bg-white/5 hover:bg-white/15 rounded-xl border border-white/5 text-neutral-400 hover:text-white transition-all active:scale-95"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Search Bar Form */}
                  <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="যেকোনো আইকনের নাম লিখে এন্টার চাপুন..."
                        className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-2xl py-3 pl-11 pr-4 text-sm text-white font-medium outline-none transition-all placeholder:text-neutral-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-purple-500 hover:bg-purple-600 text-white px-5 rounded-2xl text-xs font-bold transition-all active:scale-[0.98]"
                    >
                      খুঁজুন
                    </button>
                  </form>
                </div>

                {/* Sub category / Category Filters Scroll list */}
                <div className="px-6 py-3 border-b border-white/5 flex gap-1.5 overflow-x-auto scrollbar-none select-none shrink-0">
                  <button
                    onClick={() => handleCategorySelect('All')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      selectedCategory === 'All'
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/[0.03]'
                    }`}
                  >
                    সকল ক্যাটাগরি
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/[0.03]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Main Results Container */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {/* Total matches info */}
                  {searchQuery && (
                    <div className="mb-3 text-xs text-neutral-400 flex items-center justify-between">
                      <span>ম্যাচিং ফলাফল: <strong className="text-purple-400">{totalMatched}</strong> টি আইকন</span>
                      {isStreaming && (
                        <span className="flex items-center gap-1.5 text-[10px] text-purple-400 animate-pulse uppercase font-black tracking-wider">
                          <Loader2 size={10} className="animate-spin" />
                          লোড হচ্ছে...
                        </span>
                      )}
                    </div>
                  )}

                  {/* 2 columns grid as requested ("এসবিজিগুলো দুই গুণ এক গ্রিডে দেখাবে") */}
                  <div className="grid grid-cols-2 gap-3 pb-8">
                    {displayedIcons.map((icon, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: Math.min(idx * 0.01, 0.15) }}
                        key={icon.id}
                        onClick={() => {
                          onSelectIcon(icon.content);
                          onClose();
                        }}
                        className={`flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 hover:border-purple-500/40 hover:bg-white/[0.04] rounded-2xl cursor-pointer transition-all group active:scale-[0.98] ${
                          isCurrent(icon.content) ? 'ring-2 ring-purple-500 border-transparent bg-purple-500/[0.02]' : ''
                        }`}
                      >
                        {/* SVG Visual icon display */}
                        <div 
                          className="w-9 h-9 flex items-center justify-center shrink-0 border border-white/[0.03] rounded-xl group-hover:scale-105 transition-all text-neutral-400 group-hover:text-purple-400 svg-icon"
                          dangerouslySetInnerHTML={{ __html: icon.content }}
                        />
                        
                        {/* Meta information */}
                        <div className="overflow-hidden pr-2 flex flex-col justify-center">
                          <p className="text-[11px] font-black tracking-tight text-white truncate capitalize line-clamp-1 group-hover:text-purple-300 transition-colors">
                            {icon.name}
                          </p>
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider truncate">
                            {icon.category} {icon.subcategory ? `• ${icon.subcategory}` : ''}
                          </span>
                        </div>
                        
                        {/* Selection check */}
                        {isCurrent(icon.content) && (
                          <div className="ml-auto bg-purple-500 p-1 rounded-full shrink-0">
                            <Check size={8} className="text-white" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Empty state */}
                  {displayedIcons.length === 0 && !isStreaming && (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-neutral-500">
                      <SlidersHorizontal size={36} className="text-neutral-600 mb-4" />
                      <p className="text-sm font-bold">কোনো ম্যাচিং আইকন পাওয়া যায়নি।</p>
                      <p className="text-xs text-neutral-600 mt-1">সব ক্যাটাগরি চিপস সিলেক্ট করে আবার ও খুঁজুন।</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
