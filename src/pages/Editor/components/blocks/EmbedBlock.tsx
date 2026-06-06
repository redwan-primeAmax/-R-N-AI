import React, { useState } from 'react';
import { 
  FileText, 
  Figma, 
  Github, 
  Database, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  RotateCcw,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../../utils/cn';

interface EmbedBlockProps {
  block: any;
  setBlocks: any;
  isReadOnly?: boolean;
}

export const EmbedBlock: React.FC<EmbedBlockProps> = ({ block, setBlocks, isReadOnly }) => {
  const embedData = block.embedData || { provider: 'custom', url: '' };
  const [provider, setProvider] = useState<'google_drive' | 'figma' | 'github' | 'pdf' | 'custom'>(embedData.provider || 'custom');
  const [urlInput, setUrlInput] = useState(embedData.url || '');
  const [aspectRatio, setAspectRatio] = useState<'16/9' | '4/3' | '21/9'>('16/9');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Save updates locally and back up to blocks state
  const handleSaveEmbed = () => {
    if (isReadOnly) return;
    setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? {
      ...b,
      embedData: { provider, url: urlInput }
    } : b));
  };

  const handleResetEmbed = () => {
    if (isReadOnly) return;
    setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? {
       ...b,
       embedData: { provider: 'custom', url: '' }
    } : b));
    setUrlInput('');
  };

  // Extract real iframe link for standard widgets
  const getEmbeddableUrl = (rawUrl: string, prov: string) => {
    if (!rawUrl) return '';
    try {
      // If user pasted raw iframe snippet, extract src
      if (rawUrl.includes('<iframe') && rawUrl.includes('src="')) {
        const matches = rawUrl.match(/src="([^"]+)"/);
        if (matches && matches[1]) return matches[1];
      }

      // Figma adjustments
      if (prov === 'figma' && rawUrl.includes('figma.com') && !rawUrl.includes('embed?')) {
        return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(rawUrl)}`;
      }

      // Google Drive adjustments
      if (prov === 'google_drive' && rawUrl.includes('drive.google.com') && rawUrl.includes('/view')) {
        return rawUrl.replace('/view', '/preview');
      }

      // GitHub adjustments (raw render support)
      if (prov === 'github' && rawUrl.includes('github.com') && !rawUrl.includes('raw')) {
        // Can render normal webpage or gists
        return rawUrl;
      }

      return rawUrl;
    } catch (e) {
      return rawUrl;
    }
  };

  const embedUrl = getEmbeddableUrl(embedData.url, embedData.provider);

  return (
    <div className={cn(
      "w-full bg-[#141414] border border-white/5 rounded-3xl p-5 my-4 transition-all relative overflow-hidden",
      isFullscreen ? "fixed inset-4 z-[400] bg-black/95 max-w-full flex flex-col" : "max-w-full"
    )}>
      {/* Header controls bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            {embedData.provider === 'figma' && <Figma size={16} />}
            {embedData.provider === 'github' && <Github size={16} />}
            {embedData.provider === 'google_drive' && <Database size={16} />}
            {embedData.provider === 'pdf' && <FileText size={16} />}
            {embedData.provider === 'custom' && <ExternalLink size={16} />}
          </div>
          <div>
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {embedData.provider === 'custom' ? 'Custom IFrame' : `${embedData.provider?.replace('_', ' ')} Viewer`}
            </span>
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest pl-0.5">Sandboxed Live Integration</p>
          </div>
        </div>

        {/* Floating action sets */}
        {embedData.url && (
          <div className="flex items-center gap-1.5">
            <div className="flex bg-white/5 rounded-xl border border-white/5 p-0.5 mr-2">
              {(['16/9', '4/3', '21/9'] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={cn(
                    "px-2.5 py-1 text-[9px] font-black rounded-lg transition-all",
                    aspectRatio === ratio ? "bg-white/10 text-white" : "text-white/30 hover:text-white"
                  )}
                >
                  {ratio}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white border border-white/5 transition-all active:scale-95"
              title="Maximize"
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            {!isReadOnly && (
              <button 
                onClick={handleResetEmbed}
                className="p-2 bg-red-600/10 hover:bg-red-600 hover:text-white rounded-xl text-red-500 border border-red-500/10 transition-all active:scale-95"
                title="Reset Embed"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* RENDER FORM: IF NO URL DEFINED */}
      {!embedData.url ? (
        <div className="flex flex-col gap-5 py-2">
          {/* Options set selector */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { id: 'google_drive', name: 'Drive / PDF', icon: <Database size={15} /> },
              { id: 'figma', name: 'Figma Frame', icon: <Figma size={15} /> },
              { id: 'github', name: 'GitHub Repo', icon: <Github size={15} /> },
              { id: 'pdf', name: 'PDF Direct', icon: <FileText size={15} /> },
              { id: 'custom', name: 'Web IFrame', icon: <ExternalLink size={15} /> }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id as any)}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-black transition-all active:scale-95",
                  provider === p.id 
                    ? "bg-blue-600/15 text-blue-400 border-blue-600/30 shadow-indigo-500/5 shadow-md" 
                    : "bg-[#18181b] text-white/40 border-white/5 hover:text-white hover:bg-white/[0.02]"
                )}
              >
                {p.icon} <span>{p.name}</span>
              </button>
            ))}
          </div>

          {/* Form input lines */}
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              placeholder="Paste integration URL, Figma link, or iframe tag here..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 focus:border-blue-500 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none placeholder:text-white/20"
            />
            <button
              onClick={handleSaveEmbed}
              disabled={isReadOnly || !urlInput.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-2xl font-bold text-xs uppercase tracking-wider text-white transition-all active:scale-95 shrink-0 shadow-lg shadow-blue-500/15 flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Embed Frame
            </button>
          </div>
        </div>
      ) : (
        /* RENDER LIVE EMBED */
        <div className={cn(
          "w-full rounded-2xl border border-white/10 overflow-hidden bg-black/40 relative",
          isFullscreen ? "flex-1 min-h-0" : "",
          !isFullscreen && aspectRatio === '16/9' ? "aspect-video" : "",
          !isFullscreen && aspectRatio === '4/3' ? "aspect-[4/3]" : "",
          !isFullscreen && aspectRatio === '21/9' ? "aspect-[21/9]" : ""
        )}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full border-none object-contain pointer-events-auto"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-white/30 font-bold uppercase tracking-widest bg-black/20 p-8">
              Invalid or insecure embed parameters
            </div>
          )}
        </div>
      )}
    </div>
  );
};
