import React, { useEffect, useRef } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { Tool } from './services/ToolManager';
import { motion } from 'framer-motion';

interface ToolRunnerProps {
  tool: Tool;
  onClose: () => void;
}

export default function ToolRunner({ tool, onClose }: ToolRunnerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let isMounted = true;
    const blobUrls: string[] = [];

    const loadTool = async () => {
      if (!iframeRef.current) return;

      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      // 1. Get index.html content
      const indexHtmlBlob = tool.files['index.html'];
      if (!indexHtmlBlob) return;
      let htmlContent = await indexHtmlBlob.text();

      // 2. Create URLs for all files
      const fileToUrl: Record<string, string> = {};
      Object.entries(tool.files).forEach(([path, blob]) => {
        const url = URL.createObjectURL(blob);
        blobUrls.push(url);
        fileToUrl[path] = url;
      });

      // 3. Systematically replace relative paths
      // Sort paths by length descending to avoid partial replacements (e.g., 'a/b.js' before 'b.js')
      const sortedPaths = Object.keys(tool.files).sort((a, b) => b.length - a.length);

      sortedPaths.forEach(path => {
        if (path === 'index.html') return;
        const url = fileToUrl[path];

        // Replace src="path", src='path', href="path", href='path'
        // Also handle background: url('path') and CSS imports
        const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const regexPatterns = [
          // Attributes: src="./path.js", src="path.js"
          new RegExp(`(src|href)=["'](\\.\\/|\\.\\.\\/)*${escapedPath}["']`, 'g'),
          // CSS url(): url("./img.png"), url(img.png)
          new RegExp(`url\\(["']?(\\.\\/|\\.\\.\\/)*${escapedPath}["']?\\)`, 'g')
        ];

        regexPatterns.forEach(regex => {
          htmlContent = htmlContent.replace(regex, (match, prefix, dots) => {
             if (match.startsWith('url')) return `url("${url}")`;
             return `${prefix}="${url}"`;
          });
        });
      });

      if (!isMounted) return;

      doc.open();
      doc.write(htmlContent);
      doc.close();
    };

    loadTool();

    return () => {
      isMounted = false;
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
