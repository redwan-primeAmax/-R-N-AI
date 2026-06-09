import React, { useEffect, useRef } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { Tool } from '../../services/ToolManager';
import { motion } from 'framer-motion';

interface ToolRunnerProps {
  tool: Tool;
  onClose: () => void;
}

export default function ToolRunner({ tool, onClose }: ToolRunnerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;

    if (!doc) return;

    // Inject the HTML content
    // We need to handle relative assets. This is a simple implementation.
    // For more complex tools, we might need a virtual file system or service worker.
    
    let htmlContent = tool.files['index.html'];
    
    // Inject scripts and styles that are in the ZIP
    // We use Blobs for CSS and JS files to make them accessible via URL
    const blobUrls: string[] = [];

    Object.entries(tool.files).forEach(([path, content]) => {
      if (path === 'index.html') return;
      
      const type = path.endsWith('.css') ? 'text/css' : 
                   path.endsWith('.js') ? 'application/javascript' : 
                   'text/plain';
      
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      blobUrls.push(url);

      // Simple replacement of relative paths in HTML
      // Note: This is very basic and might not work for nested paths
      const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(src|href)=["']${escapedPath}["']`, 'g');
      htmlContent = htmlContent.replace(regex, `$1="${url}"`);
    });

    doc.open();
    doc.write(htmlContent);
    doc.close();

    return () => {
      blobUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [tool]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[10000] bg-black flex flex-col"
    >
      <header className="h-14 bg-[#151516] border-b border-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center">
            <Maximize2 size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{tool.name}</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Running in isolated environment</p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/5 text-white/40 hover:text-white rounded-xl transition-all active:scale-90"
        >
          <X size={24} />
        </button>
      </header>

      <div className="flex-1 bg-white relative">
        <iframe
          ref={iframeRef}
          title={tool.name}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-forms allow-popups allow-modals"
        />
      </div>
    </motion.div>
  );
}
