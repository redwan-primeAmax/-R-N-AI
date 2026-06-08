
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<any>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    const unsub = extensionManager.onChange(() => {
      setInstalledExtensions(extensionManager.getInstalledExtensions());
    });

    const handleMessage = async (event: MessageEvent) => {
      // Validate origin if needed. In development/production, we should restrict this.
      // For now, we at least check that the sender is our own window/iframe structure if possible,
      // or validate against a known set of allowed origins.
      const allowedOrigins = [window.location.origin];
      if (!allowedOrigins.includes(event.origin) && event.origin !== 'null') {
        // 'null' is often the origin for local file iframes or certain sandbox configs
        // In a real production app, you would define explicit domains here.
        console.warn('Blocked message from unauthorized origin:', event.origin);
        return;
      }

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
        handleRemove(event.data.id);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => { 
      unsub(); 
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleDownloadSpec = () => {
    window.location.href = '/api/docs/spec';
  };

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

  const handleRemove = async (id: string) => {
    setIsDeleting(true);
    try {
      const success = await extensionManager.unregister(id);
      if (success) {
        window.dispatchEvent(new CustomEvent('app-notification', { 
          detail: { message: 'এক্সটেনশনটি ডিলিট করা হয়েছে।', type: 'info' } 
        }));
        setInstalledExtensions(extensionManager.getInstalledExtensions());
        return true;
      } else {
        alert('এই এক্সটেনশনটি মুছে ফেলা সম্ভব হয়নি। আইডি মিলছে না।');
        return false;
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-screen bg-[#0A0A0B] text-white flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="px-6 py-4 bg-[#0A0A0B] border-b border-white/5 flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/main')}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10"
            title="ফিরে যান"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="inline-flex p-1 bg-white/5 rounded-xl gap-1">
            <button 
              onClick={() => setTab('marketplace')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === 'marketplace' ? 'bg-orange-500 text-black' : 'text-white/40 hover:text-white'
              }`}
            >
              Library UI
            </button>
            <button 
              onClick={() => setTab('installed')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === 'installed' ? 'bg-orange-500 text-black' : 'text-white/40 hover:text-white'
              }`}
            >
              Installed ({installedExtensions.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleUploadZip}
            disabled={isUploading}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white/60 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-white/10 flex items-center gap-2"
          >
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload ZIP
          </button>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {tab === 'marketplace' ? (
            <motion.div 
              key="marketplace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col"
            >
              {extensionManager.getLibraryUI() ? (
                <iframe 
                  srcDoc={extensionManager.getLibraryUI()!}
                  className="w-full h-full border-none"
                  title="Library Marketplace"
                  sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-3xl bg-orange-500/10 flex items-center justify-center mb-6">
                    <Download size={32} className="text-orange-500/40" />
                  </div>
                  <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">নো লাইব্রেরি ফাউন্ড</h2>
                  <p className="text-white/30 max-w-xs mb-8 leading-relaxed text-xs font-medium">
                    লাইব্রেরি ফাইল লোড করতে ডান দিকের <b>Upload ZIP</b> বাটনটি ব্যবহার করুন।
                  </p>
                  <button 
                    onClick={handleDownloadSpec}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/60 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-white/10 flex items-center gap-3 active:scale-95"
                  >
                    <Download size={14} className="text-orange-500" />
                    Download Ext API Spec
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
              className="absolute inset-0 overflow-y-auto px-8 py-10 custom-scrollbar"
            >
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Extension Detail Overlay */}
      <AnimatePresence>
        {selectedExtension && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-3xl"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) {
                setSelectedExtension(null);
                setIsConfirmingDelete(false);
              }
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-[#151516] border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-10">
                {!isConfirmingDelete ? (
                  <>
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
                        onClick={() => {
                          setSelectedExtension(null);
                          setIsConfirmingDelete(false);
                        }}
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
                          onClick={() => setIsConfirmingDelete(true)}
                          className="flex-1 py-5 rounded-[24px] bg-red-500/10 text-red-500 border border-red-500/20 font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 size={16} />
                          রিমুভ করুন
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-10 text-center">
                    <div className="w-24 h-24 rounded-[32px] bg-red-500/10 flex items-center justify-center mx-auto mb-8">
                      <Trash2 size={48} className="text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tight mb-4">আপনি কি নিশ্চিত?</h2>
                    <p className="text-white/40 mb-12 max-w-md mx-auto leading-relaxed">
                      আপনি কি নিশ্চিতভাবে <b className="text-white">"{selectedExtension.name}"</b> এক্সটেনশনটি চিরস্থায়ীভাবে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা সম্ভব হবে না।
                    </p>
                    
                    <div className="flex flex-col gap-3">
                      <button 
                        disabled={isDeleting}
                        onClick={async () => {
                          const success = await handleRemove(selectedExtension.id);
                          if (success) {
                            setSelectedExtension(null);
                            setIsConfirmingDelete(false);
                          }
                        }}
                        className="w-full py-6 rounded-[28px] bg-red-500 text-white font-black text-sm uppercase tracking-[0.2em] hover:bg-red-600 disabled:opacity-50 transition-all shadow-2xl shadow-red-500/20 flex items-center justify-center gap-3"
                      >
                        {isDeleting ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <Trash2 size={20} />
                        )}
                        {isDeleting ? 'প্রসেস হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
                      </button>
                      <button 
                        disabled={isDeleting}
                        onClick={() => setIsConfirmingDelete(false)}
                        className="w-full py-5 rounded-[24px] bg-white/5 text-white/40 font-black text-xs uppercase tracking-widest hover:bg-white/10 disabled:opacity-30 transition-all"
                      >
                        না, ফিরে যান
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
