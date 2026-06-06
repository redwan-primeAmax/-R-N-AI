
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Box, Download, CheckCircle2, ChevronRight, 
  Trash2, ArrowLeft, Upload, Globe, Package, Loader2, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { extensionManager } from '../../services/ExtensionManager';

export default function ExtensionsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'marketplace' | 'installed'>('marketplace');
  const [installedExtensions, setInstalledExtensions] = useState(extensionManager.getInstalledExtensions());
  const [isUploading, setIsUploading] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<any>(null);

  useEffect(() => {
    const unsub = extensionManager.onChange(() => {
      setInstalledExtensions(extensionManager.getInstalledExtensions());
    });

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'install-extension' && event.data?.folder) {
        try {
          const manifest = await extensionManager.installFromLibrary(event.data.folder);
          window.dispatchEvent(new CustomEvent('app-notification', { 
            detail: { message: `"${manifest.name}" সফলভাবে ইনস্টল হয়েছে!`, type: 'success' } 
          }));
        } catch (err: any) {
          alert(`ইনস্টলেশন ব্যর্থ: ${err.message}`);
        }
      } else if (event.data?.type === 'uninstall-extension' && event.data?.id) {
        handleRemove(event.data.id, 'এক্সটেনশন');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => { 
      unsub(); 
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleUploadZip = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        setIsUploading(true);
        try {
          const result = await extensionManager.loadLibraryZip(file);
          if (result.hasUI) {
            setTab('marketplace');
            window.dispatchEvent(new CustomEvent('app-notification', { 
              detail: { message: 'এক্সটেনশন লাইব্রেরি লোড হয়েছে।', type: 'info' } 
            }));
          } else {
            alert(`লাইব্রেরি লোড হয়েছে (${result.extensionCount} টি এক্সটেনশন পাওয়া গেছে)`);
          }
        } catch (err: any) {
          alert(`Error: ${err.message}`);
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  const handleRemove = async (id: string, name: string) => {
    if (window.confirm(`আপনি কি নিশ্চিতভাবে "${name}" মুছে ফেলতে চান?`)) {
      const success = await extensionManager.unregister(id);
      if (success) {
        window.dispatchEvent(new CustomEvent('app-notification', { 
          detail: { message: 'এক্সটেনশনটি ডিলিট করা হয়েছে।', type: 'info' } 
        }));
        extensionManager.reloadApp();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col">
      {/* Header */}
      <header className="px-8 py-10 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/main')}
              className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Zap size={24} className="text-orange-500" />
                <h1 className="text-3xl font-black tracking-tight uppercase">এক্সটেনশন সিস্টেম</h1>
              </div>
              <p className="text-sm text-white/40 font-medium italic tracking-wide">
                স্লট সিস্টেম এবং কাস্টম লাইব্রেরি দ্বারা পরিচালিত আধুনিক ইঞ্জিন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleUploadZip}
              disabled={isUploading}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              লাইব্রেরি জিপ যোগ করুন
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="px-8 py-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex p-1.5 bg-white/5 rounded-2xl gap-1">
            <button 
              onClick={() => setTab('marketplace')}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === 'marketplace' ? 'bg-orange-500 text-black' : 'text-white/40 hover:text-white'
              }`}
            >
              লাইব্রেরি (Library UI)
            </button>
            <button 
              onClick={() => setTab('installed')}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === 'installed' ? 'bg-orange-500 text-black' : 'text-white/40 hover:text-white'
              }`}
            >
              ইনস্টলড ({installedExtensions.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar focus:outline-none">
        <div className="max-w-7xl mx-auto h-full min-h-[600px]">
          <AnimatePresence mode="wait">
            {tab === 'marketplace' ? (
              <motion.div 
                key="marketplace"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full min-h-[600px]"
              >
                {extensionManager.getLibraryUI() ? (
                  <div className="w-full h-full min-h-[600px] bg-white rounded-[40px] overflow-hidden border border-white/10 shadow-2xl">
                    <iframe 
                      srcDoc={extensionManager.getLibraryUI()!}
                      className="w-full h-full min-h-[600px] border-none"
                      title="Library Marketplace"
                      sandbox="allow-scripts allow-forms allow-popups allow-modals"
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-32 bg-white/[0.01] border border-dashed border-white/10 rounded-[40px]">
                    <div className="w-24 h-24 rounded-[32px] bg-orange-500/10 flex items-center justify-center mb-8">
                      <Download size={40} className="text-orange-500/40" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">কোনো লাইব্রেরি পাওয়া যায়নি</h2>
                    <p className="text-white/30 max-w-sm mb-10 leading-relaxed text-sm font-medium">
                      আপনার কাস্টম এক্সটেনশন লাইব্রেরি দেখার জন্য ডক অনুযায়ী ZIP ফাইল ইম্পোর্ট করুন। 
                      ZIP এর ভেতরে অবশ্যই <b>index.html</b> থাকতে হবে।
                    </p>
                    <button 
                      onClick={handleUploadZip}
                      className="px-10 py-5 bg-white text-black rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                      ইম্পোর্ট লাইব্রেরি জিপ
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="installed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {installedExtensions.map((ext) => (
                  <div 
                    key={ext.id}
                    onClick={() => setSelectedExtension(ext)}
                    className="p-8 bg-[#151516] border border-white/5 rounded-[40px] hover:border-orange-500/30 transition-all group flex flex-col cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-8">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform shadow-inner">
                        {ext.icon || '📦'}
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-green-500/10 text-green-500 text-[10px] uppercase font-black tracking-widest border border-green-500/20">
                        Active
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-black text-white group-hover:text-orange-400 transition-colors uppercase tracking-tight mb-3">
                      {ext.name}
                    </h3>
                    <p className="text-sm text-white/30 line-clamp-3 mb-8 leading-relaxed font-medium">
                      {ext.description}
                    </p>
                    
                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1">Developer</span>
                        <span className="text-xs text-white/60 font-bold">{ext.author}</span>
                      </div>
                      <ChevronRight size={16} className="text-white/20 group-hover:text-orange-500 transition-colors" />
                    </div>
                  </div>
                ))}

                {installedExtensions.length === 0 && (
                  <div className="col-span-full py-40 flex flex-col items-center justify-center text-center opacity-40">
                    <Package size={64} className="mb-6 opacity-20" />
                    <h3 className="text-xl font-black uppercase tracking-widest mb-2">কোনো এক্সটেনশন নেই</h3>
                    <p className="text-sm font-medium">লাইব্রেরি থেকে এক্সটেনশন ইনস্টল করুন</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Extension Detail Overlay */}
      <AnimatePresence>
        {selectedExtension && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-3xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-[#151516] border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <div className="p-10">
                <div className="flex items-start justify-between mb-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[28px] bg-white/5 flex items-center justify-center text-5xl">
                      {selectedExtension.icon || '📦'}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tight mb-2">{selectedExtension.name}</h2>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/40">
                          v{selectedExtension.version}
                        </span>
                        <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest">
                          By {selectedExtension.author}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedExtension(null)}
                    className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-8">
                  <section>
                    <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-white/20 mb-3">বিবরণ</h4>
                    <p className="text-white/60 leading-relaxed font-medium">
                      {selectedExtension.description}
                    </p>
                  </section>

                  {selectedExtension._html && (
                    <section>
                      <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-white/20 mb-3">প্রিভিউ</h4>
                      <div className="w-full h-40 bg-white/5 rounded-3xl overflow-hidden border border-white/5 relative">
                        <iframe 
                          srcDoc={selectedExtension._html}
                          className="w-full h-full border-none pointer-events-none"
                          title="Preview"
                        />
                      </div>
                    </section>
                  )}

                  <div className="pt-10 border-t border-white/5 flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedExtension(null)}
                      className="flex-1 py-5 rounded-[24px] bg-white/5 font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      বন্ধ করুন
                    </button>
                    <button 
                      onClick={() => {
                        handleRemove(selectedExtension.id, selectedExtension.name);
                        setSelectedExtension(null);
                      }}
                      className="flex-1 py-5 rounded-[24px] bg-red-500/10 text-red-500 border border-red-500/20 font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} />
                      এক্সটেনশন রিমুভ করুন
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
