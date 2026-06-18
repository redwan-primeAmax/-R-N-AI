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

      const fileToUrl: Record<string, string> = {};

      const replaceAssetRefs = (content: string, relativePath: string, blobUrl: string): string => {
        const escaped = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // 1. Matches HTML attributes (src, href, value, etc)
        const htmlAttrRegex = new RegExp(`(src|href|data|srcset|poster|action|content)\\s*=\\s*(["'])(\\.\\/|\\.\\.\\/|\\/)*${escaped}\\2`, 'ig');
        let newContent = content.replace(htmlAttrRegex, (_, attr, quote) => {
          return `${attr}=${quote}${blobUrl}${quote}`;
        });

        // 2. CSS: url("path") or url('path') or url(path) with optional quotes/slashes
        const cssUrlRegex = new RegExp(`url\\(\\s*(["']?)(\\.\\/|\\.\\.\\/|\\/)*${escaped}\\1\\s*\\)`, 'ig');
        newContent = newContent.replace(cssUrlRegex, () => {
          return `url("${blobUrl}")`;
        });

        // 3. JS imports/strings: "path" or 'path' or `path` with optional slashes
        const jsImportRegex = new RegExp(`(["'\`])(\\.\\/|\\.\\.\\/|\\/)*${escaped}\\1`, 'g');
        newContent = newContent.replace(jsImportRegex, (_, quote) => {
          return `${quote}${blobUrl}${quote}`;
        });

        return newContent;
      };

      // 1. Phase 1: Directly create blob URLs for physical assets (non-HTML, non-CSS, non-JS)
      const nonTextEntries = Object.entries(tool.files).filter(([path]) => {
        const lower = path.toLowerCase();
        return !lower.endsWith('.html') && !lower.endsWith('.css') && !lower.endsWith('.js');
      });

      for (const [path, blob] of nonTextEntries) {
        const url = URL.createObjectURL(blob);
        blobUrls.push(url);
        fileToUrl[path] = url;
      }

      // 2. Phase 2: Process CSS files (can reference physical assets)
      const cssEntries = Object.entries(tool.files).filter(([path]) => path.toLowerCase().endsWith('.css'));
      const sortedKnownPathsPhase2 = Object.keys(fileToUrl).sort((a, b) => b.length - a.length);

      for (const [path, blob] of cssEntries) {
        let content = await blob.text();
        for (const assetPath of sortedKnownPathsPhase2) {
          content = replaceAssetRefs(content, assetPath, fileToUrl[assetPath]);
        }
        const updatedBlob = new Blob([content], { type: 'text/css' });
        const url = URL.createObjectURL(updatedBlob);
        blobUrls.push(url);
        fileToUrl[path] = url;
      }

      // 3. Phase 3: Process JS files (can reference physical assets and CSS files)
      const jsEntries = Object.entries(tool.files).filter(([path]) => path.toLowerCase().endsWith('.js'));
      const sortedKnownPathsPhase3 = Object.keys(fileToUrl).sort((a, b) => b.length - a.length);

      for (const [path, blob] of jsEntries) {
        let content = await blob.text();
        for (const knownPath of sortedKnownPathsPhase3) {
          content = replaceAssetRefs(content, knownPath, fileToUrl[knownPath]);
        }
        const updatedBlob = new Blob([content], { type: 'application/javascript' });
        const url = URL.createObjectURL(updatedBlob);
        blobUrls.push(url);
        fileToUrl[path] = url;
      }

      // 4. Phase 4: Process sub-HTML files (not index.html)
      const otherHtmlEntries = Object.entries(tool.files).filter(([path]) => {
        const lower = path.toLowerCase();
        return lower.endsWith('.html') && lower !== 'index.html';
      });
      const sortedKnownPathsPhase4 = Object.keys(fileToUrl).sort((a, b) => b.length - a.length);

      for (const [path, blob] of otherHtmlEntries) {
        let content = await blob.text();
        for (const knownPath of sortedKnownPathsPhase4) {
          content = replaceAssetRefs(content, knownPath, fileToUrl[knownPath]);
        }
        const updatedBlob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(updatedBlob);
        blobUrls.push(url);
        fileToUrl[path] = url;
      }

      // 5. Phase 5: Main index.html resolution
      const indexHtmlBlob = tool.files['index.html'];
      if (!indexHtmlBlob) return;
      let htmlContent = await indexHtmlBlob.text();

      const finalSortedPaths = Object.keys(fileToUrl).sort((a, b) => b.length - a.length);
      for (const knownPath of finalSortedPaths) {
        htmlContent = replaceAssetRefs(htmlContent, knownPath, fileToUrl[knownPath]);
      }

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
