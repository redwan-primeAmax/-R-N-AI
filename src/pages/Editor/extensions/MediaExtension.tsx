import { Node, mergeAttributes, Command } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useEffect } from 'react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaBlock: {
      setMedia: (options: { type?: string; fileName?: string; fileSize?: string; id?: string; url?: string; status?: string }) => ReturnType
    }
  }
}
import { Play, Pause, Loader2, Music, Video, FileText, Download, MoreVertical, Image as ImageIcon } from 'lucide-react';
import { operationRunner } from '../../../services/storage/OperationRunner';
import { cn } from '../../../lib/utils';

const MediaComponent = ({ node, updateAttributes, deleteNode }: any) => {
  const { id, type, fileName, fileSize, status, url } = node.attrs;
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>(url || '');
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (status === 'uploading') {
      const unsub = operationRunner.subscribe((tasks) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
          setProgress(task.progress);
          if (task.status === 'completed' && (task as any).result?.url) {
            updateAttributes({ status: 'completed', url: (task as any).result.url });
          }
        }
      });
      return unsub;
    }
  }, [status, id, updateAttributes]);

  useEffect(() => {
    if (url?.startsWith('media:')) {
      const mediaId = url.split('media:')[1];
      let objectUrl = '';
      
      const loadMedia = async () => {
        const { DataManager } = await import('../../../services/storage/DataManager');
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
      setResolvedUrl(url);
    }
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <NodeViewWrapper 
      className={cn(
        "media-upload-block",
        status === 'uploading' ? "group" : 
        (type === 'audio' && status === 'completed') ? "!flex-row !justify-start !min-h-0 py-4 px-6 border-white/10 bg-white/[0.03] group active:scale-[0.99] transition-all" :
        "overflow-hidden p-0 border-white/10 bg-white/[0.02]"
      )}
    >
      {status === 'uploading' ? (
        <>
          <div className="flex items-center gap-4 w-full px-4">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center animate-pulse">
              {type === 'audio' ? <Music className="text-blue-500" /> : type === 'video' ? <Video className="text-purple-500" /> : <FileText className="text-orange-500" />}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-black truncate text-white/80 mb-0.5">{fileName || 'Uploading file...'}</p>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{fileSize || '...'} • {progress}% Uploaded</p>
            </div>
            <Loader2 size={20} className="animate-spin text-blue-500/40" />
          </div>
          <div className="media-upload-progress" style={{ width: `${progress}%` }} />
        </>
      ) : (type === 'audio' && status === 'completed') ? (
        <>
          <audio ref={audioRef} src={resolvedUrl} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" />
          <button 
            onClick={togglePlay}
            className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-90 transition-all"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
          </button>
          <div className="flex-1 flex flex-col gap-1.5 min-w-[150px] ml-4">
             <div className="flex flex-wrap items-center justify-between gap-1">
               <span className="text-xs font-black truncate text-white/80 tracking-tight max-w-[120px]">{fileName}</span>
               <span className="text-[10px] font-mono text-white/30 whitespace-nowrap">{formatTime(currentTime)} / {formatTime(duration)}</span>
             </div>
             <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
               <div 
                 className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-100"
                 style={{ width: `${(currentTime / duration) * 100}%` }}
               />
             </div>
          </div>
          <button className="ml-4 p-2 text-white/20 hover:text-white transition-colors">
             <MoreVertical size={16} />
          </button>
        </>
      ) : (
        <>
           {type === 'image' && <img src={resolvedUrl} className="w-full h-auto max-h-[60vh] object-contain" />}
           {type === 'video' && <video src={resolvedUrl} controls className="w-full h-auto max-h-[60vh]" />}
           <div className="flex items-center justify-between w-full p-4 border-t border-white/5">
              <div className="flex items-center gap-3 overflow-hidden">
                 {type === 'image' ? <ImageIcon size={14}/> : <FileText size={14}/>}
                 <span className="text-xs font-bold truncate opacity-40">{fileName}</span>
              </div>
              <button onClick={() => window.open(resolvedUrl, '_blank')} className="p-2 bg-white/5 rounded-lg">
                 <Download size={14} className="opacity-40" />
              </button>
           </div>
        </>
      )}
    </NodeViewWrapper>
  );
};

export const MediaExtension = Node.create({
  name: 'mediaBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id: { default: null },
      type: { default: 'image' }, // image, video, audio, file
      fileName: { default: '' },
      fileSize: { default: '' },
      status: { default: 'uploading' }, // uploading, completed, error
      url: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-media-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-media-block': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaComponent);
  },

  addCommands() {
    return {
      setMedia: options => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});
