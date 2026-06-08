
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, LayoutGrid, Search, X, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { sanitizeSearchQuery } from '../../utils/sanitizer';
import { extensionManager } from '../../services/ExtensionManager';

export default function ExtensionHubPage() {
  const navigate = useNavigate();
  const [hubApps, setHubApps] = useState(extensionManager.getHubApps());
  const [activeApp, setActiveApp] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = extensionManager.onChange(() => {
      setHubApps(extensionManager.getHubApps());
    });
    return () => { unsub(); };
  }, []);

  const filteredApps = hubApps.filter(app => 
    app.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-8 flex flex-col gap-8 bg-gradient-to-b from-[#0F0F12] to-transparent border-b border-white/[0.03]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/main')}
              className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center hover:bg-white/[0.06] transition-all border border-white/5 active:scale-90"
            >
              <ArrowLeft size={20} className="text-white/60" />
            </button>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <LayoutGrid className="text-orange-500" size={24} />
                Extension Hub
              </h1>
              <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest mt-1">Smart Mini Apps & Extensions</p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/extensions')}
            className="px-6 py-3 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-black font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-orange-500/20 active:scale-95"
          >
            Manage Plugins
          </button>
        </div>

        <div className="relative max-w-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input 
            type="text" 
            placeholder="Search hub apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(sanitizeSearchQuery(e.target.value))}
            className="w-full bg-white/[0.02] border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-sm font-medium focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-white/10"
          />
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 pb-20">
          {filteredApps.map((app) => (
            <motion.div
              layoutId={app.id}
              key={app.id}
              onClick={() => setActiveApp(app)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="relative aspect-[2/1] overflow-hidden rounded-[40px] p-[1.5px] bg-gradient-to-br from-white/10 via-white/[0.02] to-transparent border border-white/5 cursor-pointer group shadow-2xl transition-all"
            >
              <div className="absolute inset-0 bg-[#0F0F12] rounded-[38.5px] p-8 flex flex-col justify-between overflow-hidden">
                {/* Visual Accent */}
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-orange-500/20 transition-all" />
                
                <div className="relative z-10 flex items-start justify-between">
                  {/* SVG Icon as requested */}
                  <div 
                    className="w-20 h-20 bg-white/[0.03] rounded-3xl flex items-center justify-center p-4 border border-white/10 group-hover:scale-110 transition-transform shadow-inner text-orange-500"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(app.icon) }}
                  />
                  <div className="flex flex-col items-end">
                    <span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/30 border border-white/5">Plugin App</span>
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white/90 group-hover:text-white transition-colors mb-2">
                    {app.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Extension Active</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {filteredApps.length === 0 && (
            <div className="col-span-full py-40 flex flex-col items-center justify-center text-center opacity-30">
              <Sparkles size={64} className="mb-6 opacity-20" />
              <h3 className="text-xl font-black uppercase tracking-widest mb-2">No apps found</h3>
              <p className="text-sm font-medium">Install more extensions to see them here</p>
            </div>
          )}
        </div>
      </main>

      {/* App Detail/Overlay rendering the active component */}
      <AnimatePresence>
        {activeApp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-3xl"
          >
            <motion.div 
              layoutId={activeApp.id}
              className="w-full h-full max-w-6xl bg-[#0A0A0B] border border-white/10 rounded-none md:rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col"
            >
              <div className="px-8 py-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div 
                    className="w-10 h-10 bg-white/[0.03] rounded-xl flex items-center justify-center p-2 border border-white/10 text-orange-500"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeApp.icon) }}
                  />
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight">{activeApp.title}</h2>
                    <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Extension App Interface</span>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveApp(null)}
                  className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all border border-white/5"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto custom-scrollbar relative">
                {/* Render the Extension's Component */}
                <activeApp.Component />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
