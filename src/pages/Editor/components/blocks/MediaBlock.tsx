/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, Video, FileText, Loader2, Pause, Play, Download, 
  ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, Maximize2,
  File, FileSpreadsheet, FileCode, Archive
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

  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Video State
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Lightbox State (Task 6)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Find all image blocks in current editor note
  const imageBlocks = blocks.filter(b => b.mediaData?.type === 'image' && (b.mediaData?.url || b.id === block.id));

  // Task 5: Listen to operationRunner and update block status to completed immediately
  useEffect(() => {
    if (status === 'uploading' && id) {
      const unsub = operationRunner.subscribe((tasks) => {
        const task = tasks.find(t => t.id === id || t.id === block.id);
        if (task) {
          setProgress(task.progress);
          if (task.status === 'completed' && (task as any).result?.url) {
            setBlocks((prev: EditorBlock[]) => prev.map((b: EditorBlock) => 
              (b.id === block.id || b.mediaData?.id === id) ? {
                ...b,
                mediaData: { 
                  ...b.mediaData!, 
                  status: 'completed' as const, 
                  url: (task as any).result.url 
                }
              } : b
            ));
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
    const idx = imageBlocks.findIndex(b => b.id === block.id || b.mediaData?.id === id);
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

  // Helper for generic file extension icons
  const getFileIcon = (name: string = '') => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return <FileText className="text-blue-400" size={24} />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="text-emerald-400" size={24} />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <Archive className="text-amber-400" size={24} />;
    if (['json', 'js', 'ts', 'html', 'css', 'py'].includes(ext)) return <FileCode className="text-purple-400" size={24} />;
    return <File className="text-gray-400" size={24} />;
  };

  // Uploading Loading State
  if (status === 'uploading') {
    return (
      <div className="media-upload-block group relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden min-h-[100px] my-2">
        {type === 'image' && resolvedUrl ? (
          <div className="relative w-full">
            <img 
              src={resolvedUrl} 
              className="w-full h-auto max-h-[300px] object-contain opacity-40 blur-[2px] mx-auto" 
              alt="Uploading..." 
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 backdrop-blur-xs">
               <div className="relative w-12 h-12 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">{progress}%</span>
               </div>
               <p className="text-[11px] font-black uppercase tracking-widest text-white/80">Uploading {fileName || 'Image'}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center animate-pulse">
              {type === 'audio' ? <Music className="text-blue-500" /> : type === 'video' ? <Video className="text-purple-500" /> : <FileText className="text-orange-500" />}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-bold truncate text-white mb-0.5">{fileName || 'Uploading file...'}</p>
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">{fileSize || '...'} • {progress}% Uploaded</p>
            </div>
            <Loader2 size={20} className="animate-spin text-blue-500" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 z-20" style={{ width: `${progress}%` }} />
      </div>
    );
  }

  // Audio Player
  if (type === 'audio') {
    const togglePlay = () => {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
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
      <div className="flex items-center gap-4 py-4 px-6 border border-white/10 bg-[#121214] rounded-2xl group transition-all my-2">
        <audio ref={audioRef} src={resolvedUrl} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" />
        <button 
          type="button"
          onClick={togglePlay}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-90 transition-all text-white flex-shrink-0 cursor-pointer"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
        </button>
        <div className="flex-1 flex flex-col gap-1.5 min-w-[150px]">
           <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-bold truncate text-white/90 max-w-[200px]">{fileName}</span>
              <span className="text-[10px] font-mono text-white/40">{formatTime(currentTime)} / {formatTime(duration)}</span>
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

  // Task 8: Video Handler
  if (type === 'video') {
    const handleSpeedChange = (speed: number) => {
      setPlaybackSpeed(speed);
      if (videoRef.current) {
        videoRef.current.playbackRate = speed;
      }
    };

    return (
      <div className="my-3 border border-white/10 rounded-2xl overflow-hidden bg-[#0d0d0f] shadow-2xl group/video">
        <div className="relative w-full bg-black flex items-center justify-center">
          <video 
            ref={videoRef}
            src={resolvedUrl} 
            controls 
            className="w-full h-auto max-h-[70vh] object-contain rounded-t-2xl" 
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-t border-white/5">
          <div className="flex items-center gap-2 truncate pr-2">
            <Video size={16} className="text-purple-400 shrink-0" />
            <span className="text-xs font-bold text-white/80 truncate">{fileName || 'Video File'}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] font-black uppercase text-white/30 mr-1">Speed:</span>
            {[0.5, 1, 1.25, 1.5, 2].map((spd) => (
              <button
                type="button"
                key={spd}
                onClick={() => handleSpeedChange(spd)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer",
                  playbackSpeed === spd ? "bg-purple-600 text-white" : "text-white/40 hover:bg-white/10 hover:text-white"
                )}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Task 8: Generic File Handler Card
  if (type === 'file') {
    const fileExt = fileName ? fileName.split('.').pop()?.toUpperCase() : 'FILE';

    return (
      <div className="my-3 p-4 border border-white/10 bg-[#121215] hover:bg-[#18181c] rounded-2xl shadow-xl transition-all flex items-center justify-between gap-4 group/file">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
            {getFileIcon(fileName)}
          </div>
          <div className="flex flex-col min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/90 truncate">{fileName || 'Attached File'}</span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-black bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 shrink-0">
                {fileExt}
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/40 mt-0.5">{fileSize || 'Generic File'}</span>
          </div>
        </div>

        <a 
          href={resolvedUrl} 
          download={fileName || 'download'} 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all shrink-0 cursor-pointer"
        >
          <Download size={14} />
          <span>Download</span>
        </a>
      </div>
    );
  }

  const activeLightboxImage = imageBlocks[currentImageIndex]?.mediaData?.url || resolvedUrl;

  // Task 7: Preserve Aspect Ratio for Images
  return (
    <div className="my-3 border border-white/5 rounded-2xl overflow-hidden bg-transparent group">
      {type === 'image' && (
        <div className={cn(
          "relative group/img transition-all mx-auto cursor-zoom-in",
          width === 'small' ? "max-w-[200px]" : width === 'medium' ? "max-w-md" : "w-full"
        )}>
          {/* Image with preserved aspect ratio */}
          <img 
            onClick={openLightbox}
            src={resolvedUrl} 
            referrerPolicy="no-referrer" 
            className="w-full h-auto max-h-[65vh] object-contain rounded-2xl border border-white/10 shadow-2xl transition-transform hover:scale-[1.005]" 
            alt={fileName || 'Image'} 
          />
           
          {/* Hover Controls */}
          <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/70 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 z-10 shadow-2xl">
            <button
              type="button"
              onClick={openLightbox}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
              title="Fullscreen Lightbox"
            >
              <Maximize2 size={14} />
            </button>
            {[
              { id: 'small', label: 'S' },
              { id: 'medium', label: 'M' },
              { id: 'full', label: 'F' }
            ].map(opt => (
              <button
                type="button"
                key={opt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setBlocks((prev: EditorBlock[]) => prev.map(b => b.id === block.id ? {
                    ...b,
                    mediaData: { ...b.mediaData!, width: opt.id as any }
                  } : b));
                }}
                className={cn(
                  "w-7 h-7 flex items-center justify-center text-[10px] font-black rounded-xl transition-all cursor-pointer",
                  width === opt.id || (!width && opt.id === 'full') ? "bg-white text-black shadow" : "text-white/60 hover:bg-white/10"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task 6: Full-Screen Image Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsLightboxOpen(false);
              setZoomScale(1);
            }}
            className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
          >
            {/* Top Control Bar */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 right-4 flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15 z-20 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setZoomScale(z => Math.min(4, z + 0.3))}
                className="p-2.5 text-white hover:bg-white/20 rounded-xl transition-all active:scale-90 cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn size={18} />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(z => Math.max(0.4, z - 0.3))}
                className="p-2.5 text-white hover:bg-white/20 rounded-xl transition-all active:scale-90 cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut size={18} />
              </button>
              <a
                href={activeLightboxImage}
                download={fileName || 'image.png'}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 text-white hover:bg-white/20 rounded-xl transition-all active:scale-90 cursor-pointer"
                title="Download Image"
              >
                <Download size={18} />
              </a>
              <div className="w-[1px] h-6 bg-white/20 mx-1" />
              <button
                type="button"
                onClick={() => {
                  setIsLightboxOpen(false);
                  setZoomScale(1);
                }}
                className="p-2.5 text-white hover:bg-red-500/80 rounded-xl transition-all active:scale-90 cursor-pointer"
                title="Close (ESC)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Arrows */}
            {imageBlocks.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-90 z-20 cursor-pointer shadow-2xl border border-white/10"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-90 z-20 cursor-pointer shadow-2xl border border-white/10"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}

            {/* Main Lightbox Image View with Scalable Zoom (Task 6) */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: zoomScale }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[90vw] max-h-[85vh] flex items-center justify-center overflow-auto"
            >
              <img
                src={activeLightboxImage}
                alt={fileName || 'Enlarged image'}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl select-none"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
