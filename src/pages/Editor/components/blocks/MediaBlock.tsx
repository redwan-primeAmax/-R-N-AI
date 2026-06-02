/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Music, Video, FileText, Loader2, Pause, Play, Download } from 'lucide-react';
import { operationRunner } from '../../../../services/storage/OperationRunner';
import { DataManager } from '../../../../services/storage/DataManager';
import { EditorBlock } from '../../../../utils/blockParser';

interface MediaBlockProps {
  block: EditorBlock;
  blocks: EditorBlock[];
  setBlocks: (blocks: EditorBlock[]) => void;
}

export const MediaBlock = ({ block, blocks, setBlocks }: MediaBlockProps) => {
  const { id, type, fileName, fileSize, status, url } = block.mediaData || {};
  const [progress, setProgress] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string>(url || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (status === 'uploading' && id) {
      const unsub = operationRunner.subscribe((tasks) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
          setProgress(task.progress);
          if (task.status === 'completed' && (task as any).result?.url) {
            const updated = (blocks as EditorBlock[]).map((b: EditorBlock) => b.id === block.id ? {
              ...b,
              mediaData: { 
                ...b.mediaData!, 
                status: 'completed' as const, 
                url: (task as any).result.url 
              }
            } : b);
            setBlocks(updated);
          }
        }
      });
      return unsub;
    }
  }, [status, id, block.id, blocks, setBlocks]);

  useEffect(() => {
    if (url?.startsWith('media:')) {
      const mediaId = url.split('media:')[1];
      let objectUrl = '';
      
      const loadMedia = async () => {
        const blob = await DataManager.getMedia(mediaId);
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setResolvedUrl(objectUrl);
        }
      };
      loadMedia();
      return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    } else {
      setResolvedUrl(url || '');
    }
  }, [url]);

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
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
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
          className="w-12 h-12 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-90 transition-all text-white flex-shrink-0"
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

  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#0a0a0a] shadow-xl group">
      {type === 'image' && (
        <img src={resolvedUrl} referrerPolicy="no-referrer" className="w-full h-auto max-h-[60vh] object-contain" alt={fileName} />
      )}
      {type === 'video' && (
        <video src={resolvedUrl} controls className="w-full h-auto max-h-[60vh]" />
      )}
      <div className="flex items-center justify-between w-full p-4 border-t border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 overflow-hidden">
           {type === 'image' ? <FileText size={14} className="text-blue-400" /> : <FileText size={14} className="text-orange-400" />}
           <span className="text-xs font-bold truncate opacity-40 text-left">{fileName}</span>
        </div>
        <button onClick={() => window.open(resolvedUrl, '_blank')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white">
           <Download size={14} className="opacity-45" />
        </button>
      </div>
    </div>
  );
};
