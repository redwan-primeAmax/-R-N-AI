/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, Video, FileText, Loader2, Pause, Play, Download, 
  ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, Maximize2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../../utils/cn';
import { operationRunner } from '../../../../services/storage/OperationRunner';
import { DataManager } from '../../../../services/storage/DataManager';
import { EditorBlock } from '../../../../utils/blockParser';

interface MediaBlockProps {
  block: EditorBlock;
  blocks: EditorBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<EditorBlock[]>>;
}

export const MediaBlock = ({ block, blocks, setBlocks }: MediaBlockProps) => {
  const { id, type, fileName, fileSize, status, url, width } = (block.mediaData || {}) as any;
  const [progress, setProgress] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string>(url || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Find all image blocks in current editor note
  const imageBlocks = blocks.filter(b => b.mediaData?.type === 'image' && b.mediaData?.url);

  useEffect(() => {
    if (status === 'uploading' && id) {
      const unsub = operationRunner.subscribe((tasks) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
          setProgress(task.progress);
          if (task.status === 'completed' && (task as any).result?.url) {
            setBlocks((prev: EditorBlock[]) => prev.map((b: EditorBlock) => b.id === block.id ? {
              ...b,
              mediaData: { 
                ...b.mediaData!, 
                status: 'completed' as const, 
                url: (task as any).result.url 
              }
            } : b));
          }
        }
      });
      return unsub;
    }
  }, [status, id, block.id, setBlocks]);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    
    if (url?.startsWith('media:')) {
      const mediaId = url.split('media:')[1];
      const loadMedia = async () => {
        const blob = await DataManager.getMedia(mediaId);
        if (blob && active) {
          objectUrl = URL.createObjectURL(blob);
          setResolvedUrl(objectUrl);
        }
      };
      loadMedia();
    } else {
      setResolvedUrl(url || '');
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  // Handle ESC key for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        setZoomScale(1);
      }
    };
    if (isLightboxOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  const openLightbox = () => {
    const idx = imageBlocks.findIndex(b => b.id === block.id);
    setCurrentImageIndex(idx !== -1 ? idx : 0);
    setZoomScale(1);
    setIsLightboxOpen(true);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageBlocks.length > 0) {
      const nextIdx = (currentImageIndex + 1) % imageBlocks.length;
      setCurrentImageIndex(nextIdx);
      setZoomScale(1);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageBlocks.length > 0) {
      const prevIdx = (currentImageIndex - 1 + imageBlocks.length) % imageBlocks.length;
      setCurrentImageIndex(prevIdx);
      setZoomScale(1);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'uploading') {
    return (
      <div className="media-upload-block group relative flex items-center gap-4 bg-white/[0.02] border border-white/10 rounded-2xl p-4 overflow-hidden">
        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center animate-pulse">
          {type === 'audio' ? <Music className="text-blue-500" /> : type === 'video' ? <Video className="text-purple-500" /> : <FileText className="text-orange-500" />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-black truncate text-white/80 mb-0.5">{fileName || 'Uploading file...'}</p>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{fileSize || '...'} • {progress}% Uploaded</p>
        </div>
        <Loader2 size={20} className="animate-spin text-blue-500/40" />
        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
    );
  }

  if (type === 'audio') {
    const togglePlay = () => {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      }
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
      }
    };

    return (
      <div className="flex items-center gap-4 py-4 px-6 border border-white/5 bg-white/[0.03] rounded-2xl group transition-all">
        <audio ref={audioRef} src={resolvedUrl} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" />
        <button 
          onClick={togglePlay}
          className="w-12 h-12 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-90 transition-all text-white flex-shrink-0 cursor-pointer"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
        </button>
        <div className="flex-1 flex flex-col gap-1.5 min-w-[150px]">
           <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-black truncate text-white/80 tracking-tight max-w-[200px]">{fileName}</span>
              <span className="text-[10px] font-mono text-white/30 whitespace-nowrap">{formatTime(currentTime)} / {formatTime(duration)}</span>
           </div>
           <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
           </div>
        </div>
      </div>
    );
  }

  const activeLightboxImage = imageBlocks[currentImageIndex]?.mediaData?.url || resolvedUrl;

  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#0a0a0a] shadow-xl group">
      {type === 'image' && (
        <div className={cn(
          "relative group/img transition-all mx-auto cursor-zoom-in",
          width === 'small' ? "max-w-[150px]" : width === 'medium' ? "max-w-md" : "w-full"
        )}>
          <img 
            onClick={openLightbox}
            src={resolvedUrl} 
            referrerPolicy="no-referrer" 
            className="w-full h-auto max-h-[60vh] object-contain rounded-lg transition-transform hover:scale-[1.01]" 
            alt={fileName} 
          />
           
          {/* Controls */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 z-10">
            <button
              onClick={openLightbox}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              title="Fullscreen Lightbox"
            >
              <Maximize2 size={13} />
            </button>
            {[
              { id: 'small', label: 'S' },
              { id: 'medium', label: 'M' },
              { id: 'full', label: 'F' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setBlocks((prev: EditorBlock[]) => prev.map(b => b.id === block.id ? {
                    ...b,
                    mediaData: { ...b.mediaData!, width: opt.id as any }
                  } : b));
                }}
                className={cn(
                  "w-7 h-7 flex items-center justify-center text-[10px] font-black rounded-lg transition-all cursor-pointer",
                  width === opt.id || (!width && opt.id === 'full') ? "bg-white text-black" : "text-white/60 hover:bg-white/10"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === 'video' && (
        <video src={resolvedUrl} controls className="w-full h-auto max-h-[60vh]" />
      )}

      {type === 'file' && (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-white/[0.02]">
           <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
              <FileText size={32} className="text-white/20" />
           </div>
           <p className="text-sm font-bold text-white/80 mb-1">{fileName}</p>
           <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{fileSize || 'Unknown Size'}</p>
        </div>
      )}

      <div className="flex items-center justify-between w-full p-4 border-t border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 overflow-hidden">
           <FileText size={14} className="text-blue-400" />
           <span className="text-xs font-bold truncate opacity-40 text-left">{fileName}</span>
        </div>
        <button onClick={() => window.open(resolvedUrl, '_blank')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white cursor-pointer">
           <Download size={14} className="opacity-45" />
        </button>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLightboxOpen(false)}
            className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            {/* Top Toolbar */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 right-4 flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10 z-20"
            >
              <button
                onClick={() => setZoomScale(z => Math.min(3, z + 0.25))}
                className="p-2 text-white hover:bg-white/10 rounded-xl cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={() => setZoomScale(z => Math.max(0.5, z - 0.25))}
                className="p-2 text-white hover:bg-white/10 rounded-xl cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <a
                href={activeLightboxImage}
                download={fileName || 'image.png'}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-white hover:bg-white/10 rounded-xl cursor-pointer"
                title="Download"
              >
                <Download size={18} />
              </a>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 text-white hover:bg-red-500/50 rounded-xl cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Arrows */}
            {imageBlocks.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-transform active:scale-95 z-20 cursor-pointer"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-transform active:scale-95 z-20 cursor-pointer"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Main Lightbox Image */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: zoomScale }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[90vw] max-h-[85vh] flex items-center justify-center overflow-auto"
            >
              <img
                src={activeLightboxImage}
                alt="Enlarged preview"
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
