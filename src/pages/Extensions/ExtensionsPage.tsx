import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Download, Loader2, Sparkles, 
  AlertCircle, ShieldCheck, X, Upload, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';

export default function ExtensionsPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Storage for generated blob URLs to prevent memory leaks
  const blobUrlsRef = useRef<string[]>([]);

  const cleanupObjectURLs = () => {
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
  };

  useEffect(() => {
    return cleanupObjectURLs; // Cleanup on unmount
  }, []);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (typeof event.data !== 'object') return;
      const { type, payload, action } = event.data;

      if (type === 'ADD_TO_WORKSPACE' || action === 'ADD_EXTENSION') {
        const extensionData = payload || event.data.extension;
        try {
          const response = await fetch('/api/add-extension', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(extensionData)
          });
          const result = await response.json();
          if (result.success) {
            setSuccessMsg(`"${extensionData.name || 'Extension'}" সফলভাবে যোগ করা হয়েছে!`);
            setTimeout(() => setSuccessMsg(null), 3000);
          }
        } catch (err) {
          console.error("Failed to persist extension:", err);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const cleanup = () => {
    setIframeSrc(null);
    setError(null);
    cleanupObjectURLs();
  };

  const handleLoadExtension = async (fileSource?: File) => {
    if (!url.trim() && !fileSource) return;
    
    setIsDownloading(true);
    setError(null);
    setLoadingStep(fileSource ? 'Parsing ZIP Module...' : 'Fetching Remote Package...');

    try {
      let zipData: ArrayBuffer;

      if (fileSource) {
        zipData = await fileSource.arrayBuffer();
      } else {
        // We still use a small proxy to bypass CORS if it's a remote URL, 
        // but the processing stays in the browser.
        const response = await fetch(`/api/extensions/proxy?url=${encodeURIComponent(url.trim())}`);
        if (!response.ok) throw new Error('লিংকটি থেকে ডাটা ফেচ করা যাচ্ছে না।');
        
        // The server proxy should just return the file stream ideally
        zipData = await response.arrayBuffer();
      }

      setLoadingStep('Initializing Virtual Runtime...');
      const zip = new JSZip();
      const content = await zip.loadAsync(zipData);
      
      // Map of relative paths to Blob URLs
      const fileMap: Record<string, string> = {};
      
      // Create Blobs for all files
      setLoadingStep('Mapping Neural Resources...');
      const filePromises = Object.entries(content.files).map(async ([path, file]) => {
        if (file.dir) return;
        
        const blob = await file.async('blob');
        const mimeType = getMimeType(path);
        const typedBlob = new Blob([blob], { type: mimeType });
        const blobUrl = URL.createObjectURL(typedBlob);
        
        fileMap[path] = blobUrl;
        blobUrlsRef.current.push(blobUrl);
      });

      await Promise.all(filePromises);

      // Find index.html
      const indexPath = Object.keys(fileMap).find(p => p.endsWith('index.html'));
      if (!indexPath) throw new Error('ZIP এর ভেতর index.html পাওয়া যায়নি।');

      setLoadingStep('Injecting Sandbox Logic...');
      const indexContent = await content.file(indexPath)!.async('string');
      const baseDir = indexPath.substring(0, indexPath.lastIndexOf('/') + 1);

      // Rewriting index.html to point to blob URLs
      const parser = new DOMParser();
      const doc = parser.parseFromString(indexContent, 'text/html');

      // Helper to resolve relative paths
      const resolvePath = (relPath: string) => {
        if (relPath.startsWith('http') || relPath.startsWith('data:') || relPath.startsWith('/')) return relPath;
        
        let target = baseDir + relPath;
        // Basic path traversal cleanup (e.g. ./ or ../)
        const parts = target.split('/');
        const stack: string[] = [];
        for (const part of parts) {
          if (part === '..') stack.pop();
          else if (part !== '.' && part !== '') stack.push(part);
        }
        const resolved = stack.join('/');
        return fileMap[resolved] || relPath;
      };

      // Rewriting all resource tags
      const resourceTags = [
        { tag: 'script', attr: 'src' },
        { tag: 'link', attr: 'href' },
        { tag: 'img', attr: 'src' },
        { tag: 'video', attr: 'src' },
        { tag: 'audio', attr: 'src' },
        { tag: 'source', attr: 'src' }
      ];

      resourceTags.forEach(({ tag, attr }) => {
        const elements = doc.getElementsByTagName(tag);
        for (let i = 0; i < elements.length; i++) {
          const val = elements[i].getAttribute(attr);
          if (val) elements[i].setAttribute(attr, resolvePath(val));
        }
      });

      // Injecting bridge script for host app communication
      const script = doc.createElement('script');
      script.textContent = `
        window.addEventListener('message', (e) => {
           // Relay messages from host if needed
        });
        console.log('Neural Sandbox Bridge Active');
      `;
      doc.head.prepend(script);

      // Final index blob
      const finalHtml = doc.documentElement.outerHTML;
      const indexBlob = new Blob([finalHtml], { type: 'text/html' });
      const finalUrl = URL.createObjectURL(indexBlob);
      blobUrlsRef.current.push(finalUrl);

      setLoadingStep('Finalizing Deploy...');
      setIframeSrc(finalUrl);
      setUrl('');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ডাউনলোড বা সেটআপে সমস্যা হয়েছে।');
    } finally {
      setIsDownloading(false);
    }
  };

  const getMimeType = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html': return 'text/html';
      case 'css': return 'text/css';
      case 'js': return 'application/javascript';
      case 'json': return 'application/json';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'svg': return 'image/svg+xml';
      default: return 'application/octet-stream';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-6 overflow-hidden flex flex-col font-sans">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleLoadExtension(file);
          e.target.value = '';
        }}
      />

      <div className="max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/main')}
              className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase italic underline decoration-blue-500/50 underline-offset-8">Neural Sandbox</h1>
              <p className="text-white/40 text-[9px] font-bold tracking-[0.4em] uppercase mt-1">Diamond Road v2.0 Browser Engine</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!iframeSrc ? (
            <motion.div 
              key="loader-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center space-y-8"
            >
              <div className="w-full max-w-lg bg-[#151516] border border-white/[0.05] rounded-[40px] p-8 shadow-2xl space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Sparkles size={120} />
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                      Remote Direct Link (MediaFire/Direct)
                    </label>
                  </div>
                  <div className="relative group">
                    <input 
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/module.zip"
                      className="w-full bg-black border border-white/10 rounded-3xl px-8 py-5 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-4 relative z-10">
                  <button 
                    onClick={() => handleLoadExtension()}
                    disabled={isDownloading || !url.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-white/5 p-6 rounded-3xl flex items-center justify-center gap-4 transition-all active:scale-95 group shadow-lg shadow-blue-500/10"
                  >
                    <Download size={20} className="group-hover:translate-y-1 transition-transform" />
                    <span className="font-black text-[11px] uppercase tracking-[0.2em]">Deploy from URL</span>
                  </button>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isDownloading}
                    className="px-8 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 rounded-3xl flex items-center justify-center gap-4 transition-all active:scale-95 group"
                  >
                    <Upload size={20} className="group-hover:-translate-y-1 transition-transform" />
                    <span className="font-black text-[11px] uppercase tracking-[0.2em]">ZIP</span>
                  </button>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center gap-3 text-red-500 relative z-10"
                  >
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-loose">{error}</span>
                  </motion.div>
                )}
              </div>

              <div className="flex items-center gap-6 p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl max-w-lg">
                <ShieldCheck size={32} className="text-white/10 shrink-0" />
                <p className="text-[9px] text-white/30 leading-relaxed uppercase tracking-[0.1em] font-medium">
                  এই এনভায়রনমেন্টটি সম্পূর্ণ ব্রাউজার-বেসড এবং আইসোলেটেড। এক্সটেনশনটি বন্ধ করার সাথে সাথে সকল মেমোরি ক্লিয়ার করে দেওয়া হবে।
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="preview-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[1000] bg-white overflow-hidden"
            >
              <iframe 
                src={iframeSrc}
                className="w-full h-full border-none bg-white"
                title="Extension Sandbox"
                allow="camera; microphone; geolocation; bluetooth; serial"
              />

              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1, backgroundColor: '#ef4444' }}
                onClick={cleanup}
                className="fixed top-8 right-8 w-14 h-14 bg-black/90 text-white rounded-full flex items-center justify-center transition-all z-[1001] shadow-2xl backdrop-blur-md border border-white/20 group"
              >
                <X size={28} className="group-hover:rotate-90 transition-transform duration-300" />
              </motion.button>
              
              <div className="fixed bottom-6 right-8 pointer-events-none opacity-10 text-black text-[8px] font-black uppercase tracking-[0.8em]">
                Live Module Environment (Local-Only)
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[10000] bg-emerald-500 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-emerald-400/50 backdrop-blur-xl"
          >
            <CheckCircle2 size={24} />
            <span className="font-black text-xs uppercase tracking-[0.2em]">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDownloading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-[#0A0A0B] flex flex-col items-center justify-center p-10"
          >
            <div className="space-y-8 flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles size={32} className="text-blue-500 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-3">
                <h2 className="text-xl font-black uppercase tracking-[0.5em] text-white/80">{loadingStep}</h2>
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/20 animate-pulse">
                  Local memory processing...
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
