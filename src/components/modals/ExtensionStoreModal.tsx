import React, { useState, useEffect } from 'react';
import { 
  X, Zap, Download, Trash2, Shield, Info, ExternalLink, 
  ChevronRight, Search, LayoutGrid, List, CheckCircle2,
  Calendar, User, Box, ArrowLeft
} from 'lucide-react';
import { extensionManager } from '../../services/ExtensionManager';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ExtensionStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExtensionStoreModal: React.FC<ExtensionStoreModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'marketplace' | 'installed'>('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExtension, setSelectedExtension] = useState<any>(null);
  const [installedExtensions, setInstalledExtensions] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setInstalledExtensions(extensionManager.getInstalledExtensions());
      const unsub = extensionManager.onChange(() => {
        setInstalledExtensions(extensionManager.getInstalledExtensions());
      });
      return () => { unsub(); };
    }
  }, [isOpen]);

  const handleUploadZip = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // By default, manual ZIP upload for testing is persistent = true for now, 
          // but we can make it session-only if needed.
          // User said "cache until refresh", so persist = false.
          const manifest = await extensionManager.loadExtensionFromZip(file, false);
          extensionManager.reloadApp();
          alert(`Extension "${manifest.name}" loaded for this session.`);
        } catch (err: any) {
          alert(`Error: ${err.message}`);
        }
      }
    };
    input.click();
  };

  const handleRemove = async (id: string, name: string) => {
    if (window.confirm(`আপনি কি নিশ্চিতভাবে "${name}" এক্সটেনশনটি মুছে ফেলতে চান? এটি সিস্টেম থেকে সম্পূর্ণ মুছে যাবে।`)) {
      await extensionManager.unregister(id);
      extensionManager.reloadApp();
      setSelectedExtension(null);
    }
  };

  // Mock Marketplace Data
  const marketplaceExtensions = [
    {
      id: 'ai-summarizer-pro',
      name: 'AI Summarizer Pro',
      description: 'আপনার নোটগুলোকে এক ক্লিকে সামারি বা সারাংশ তৈরি করুন।',
      author: 'Notion Teams',
      version: '1.2.0',
      icon: '🧠',
      features: ['One-click summary', 'Custom prompts', 'Supports 10 languages'],
      permissions: ['Read Content', 'Write Content', 'AI Access'],
      releaseDate: '2026-05-15',
      category: 'Productivity'
    },
    {
      id: 'dynamic-charts',
      name: 'Interactive Charts',
      description: 'আপনার ডাটাবেজ থেকে কালারফুল চার্ট এবং গ্রাফ তৈরি করুন।',
      author: 'DataSense',
      version: '2.0.4',
      icon: '📊',
      features: ['D3 based charts', 'Excel import', 'Real-time sync'],
      permissions: ['Read Database', 'External API'],
      releaseDate: '2026-06-01',
      category: 'Data'
    },
    {
      id: 'cosmic-theme',
      name: 'Cosmic Dark Theme',
      description: 'একটি অত্যন্ত সুন্দর এবং গভীর ডার্ক মোড থিম।',
      author: 'DesignForge',
      version: '1.0.1',
      icon: '🌌',
      features: ['Eye-safe palette', 'Animated icons', 'Gradient borders'],
      permissions: ['Modify Theme'],
      releaseDate: '2026-04-20',
      category: 'Visuals'
    }
  ];

  const filteredMarketplace = marketplaceExtensions.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isInstalled = (id: string) => installedExtensions.some(ext => ext.id === id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-4xl h-[85vh] bg-[#121213] border border-white/10 rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            {selectedExtension ? (
              <button 
                onClick={() => setSelectedExtension(null)}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ArrowLeft size={20} className="text-white/60" />
              </button>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Zap size={24} className="text-orange-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {selectedExtension ? 'Extension Details' : 'Extension Library'}
              </h2>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em] font-black">
                {selectedExtension ? selectedExtension.name : 'Explore & Manage Tools'}
              </p>
            </div>
          </div>
          
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-all text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedExtension ? (
            <>
              {/* Toolbar */}
              <div className="px-8 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
                {/* Tabs */}
                <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                  <button 
                    onClick={() => setTab('marketplace')}
                    className={cn(
                      "px-6 py-1.5 rounded-lg text-sm font-bold transition-all",
                      tab === 'marketplace' ? "bg-white text-black" : "text-white/40 hover:text-white"
                    )}
                  >
                    Library
                  </button>
                  <button 
                    onClick={() => setTab('installed')}
                    className={cn(
                      "px-6 py-1.5 rounded-lg text-sm font-bold transition-all",
                      tab === 'installed' ? "bg-white text-black" : "text-white/40 hover:text-white"
                    )}
                  >
                    Installed ({installedExtensions.length})
                  </button>
                </div>

                {/* Search / Upload */}
                <div className="flex gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <input 
                      type="text"
                      placeholder="Search extensions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/5 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/30 transition-all font-medium"
                    />
                  </div>
                  <button 
                    onClick={handleUploadZip}
                    className="h-10 px-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center gap-2 text-orange-400 hover:bg-orange-500/20 transition-all active:scale-95"
                  >
                    <Download size={16} />
                    <span className="text-sm font-bold">Import ZIP</span>
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(tab === 'marketplace' ? filteredMarketplace : installedExtensions).map((ext) => (
                    <motion.div 
                      layoutId={ext.id}
                      key={ext.id}
                      onClick={() => setSelectedExtension(ext)}
                      className="group p-6 bg-white/[0.02] border border-white/5 rounded-[24px] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer active:scale-[0.98] relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                          {ext.icon || '📦'}
                        </div>
                        {isInstalled(ext.id) && (
                          <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] uppercase font-black tracking-widest border border-green-500/20 flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            Active
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors uppercase tracking-tight mb-2">
                        {ext.name}
                      </h3>
                      <p className="text-sm text-white/40 line-clamp-2 mb-4 leading-relaxed">
                        {ext.description}
                      </p>
                      <div className="flex items-center gap-2 mt-auto">
                        <span className="text-[10px] text-white/20 uppercase font-black">By {ext.author}</span>
                      </div>
                    </motion.div>
                  ))}

                  {tab === 'installed' && installedExtensions.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                        <Box size={32} className="text-white/10" />
                      </div>
                      <h3 className="text-white font-bold opacity-40">No Extensions Installed</h3>
                      <p className="text-sm text-white/20">Try importing a ZIP file or explore the library.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Detail View */
            <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Left: Info */}
                <div className="md:col-span-1 space-y-8">
                  <div className="flex flex-col items-center text-center p-8 bg-white/[0.02] border border-white/5 rounded-[32px]">
                    <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center text-6xl mb-6 shadow-2xl">
                      {selectedExtension.icon || '📦'}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedExtension.name}</h2>
                    <p className="text-sm text-white/40 mb-6">Version {selectedExtension.version}</p>
                    
                    {isInstalled(selectedExtension.id) ? (
                      <button 
                        onClick={() => handleRemove(selectedExtension.id, selectedExtension.name)}
                        className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-red-500/20 transition-all active:scale-95"
                      >
                        <Trash2 size={18} />
                        Remove Extension
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          alert('This is a marketplace simulation. Please use "Import ZIP" for testing currently.');
                        }}
                        className="w-full py-3 bg-orange-500 text-black rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-orange-400 transition-all active:scale-95"
                      >
                        <Download size={18} />
                        Add Extension
                      </button>
                    )}
                  </div>

                  <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-4">
                    <div className="flex items-center gap-3 text-white/40">
                      <User size={16} />
                      <span className="text-sm">Developer: <span className="text-white font-medium">{selectedExtension.author}</span></span>
                    </div>
                    <div className="flex items-center gap-3 text-white/40">
                      <Calendar size={16} />
                      <span className="text-sm">First Release: <span className="text-white font-medium">{selectedExtension.releaseDate || 'N/A'}</span></span>
                    </div>
                  </div>
                </div>

                {/* Right: Details */}
                <div className="md:col-span-2 space-y-10">
                  <section>
                    <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-orange-500 mb-4">About</h4>
                    <p className="text-lg text-white/70 leading-relaxed font-medium">
                      {selectedExtension.description}
                    </p>
                  </section>

                  <section>
                    <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-orange-500 mb-4">Core Features</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(selectedExtension.features || ['Standard block support', 'UI injection']).map((f: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-white/60 bg-white/5 p-4 rounded-[18px]">
                          <CheckCircle2 size={16} className="text-orange-400 shrink-0" />
                          <span className="text-sm font-medium">{f}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-orange-500 mb-4">Permissions Required</h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedExtension.permissions || ['None']).map((p: string, i: number) => (
                        <div key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2 text-xs text-white/40">
                          <Shield size={12} className="text-cyan-400" />
                          {p}
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="pt-10 border-t border-white/5 flex items-center justify-between text-white/20">
                    <div className="flex items-center gap-2">
                      <Info size={14} />
                      <span className="text-[10px] uppercase font-bold">Safe Extension Certified</span>
                    </div>
                    <ExternalLink size={14} className="hover:text-white cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
