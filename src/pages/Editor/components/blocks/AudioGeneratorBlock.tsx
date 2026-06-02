/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, Square, Loader2, FastForward } from 'lucide-react';
import { AudioProcessor } from '../../services/audio_processor';
import { MediaController, PlayerState } from '../../services/player';
import { cn } from '../../../../utils/cn';

interface AudioGeneratorBlockProps {
  block: any;
  setBlocks: any;
  isReadOnly?: boolean;
}

export const AudioGeneratorBlock: React.FC<AudioGeneratorBlockProps> = ({ block, setBlocks, isReadOnly }) => {
  const [text, setText] = useState(block.meta?.text || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const controllerRef = useRef<MediaController | null>(null);

  useEffect(() => {
    if (audioRef.current && !controllerRef.current) {
      controllerRef.current = new MediaController(audioRef.current, setPlayerState);
    }
  }, []);

  const handleRun = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    try {
      await AudioProcessor.generateAudioFromText(text);
      // Since window.speechSynthesis doesn't easily convert to a blob/url without a backend or complex worker,
      // I'll simulate the "Attached player" by showing a control for the ongoing speech.
      // Or I can use a generic "Attached" UI.
      setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, text, status: 'success' } } : b));
    } catch (err) {
      console.error(err);
      setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, status: 'error' } } : b));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlaybackRate = () => {
    if (controllerRef.current && playerState) {
      const rates = [1, 1.5, 2];
      const nextRate = rates[(rates.indexOf(playerState.playbackRate) + 1) % rates.length];
      controllerRef.current.setPlaybackRate(nextRate);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl p-6 my-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Mic className="text-blue-500" size={20} />
        <span className="text-sm font-black uppercase tracking-widest text-blue-500/80">Audio Generator</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          const val = e.target.value;
          setText(val);
          setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, text: val } } : b));
        }}
        placeholder="Paste your text here to generate audio..."
        disabled={isReadOnly}
        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500/50 min-h-[100px] resize-none"
      />

      <div className="flex justify-end gap-3">
        <button
          onClick={handleRun}
          disabled={isReadOnly || isGenerating || !text.trim()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:grayscale text-white rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Run
        </button>
      </div>

      {block.meta?.status === 'success' && (
        <div className="pt-4 border-t border-gray-100 dark:border-white/5 animate-slide-up">
           <div className="flex items-center gap-4 bg-white dark:bg-black/20 p-3 rounded-2xl">
              <button 
                onClick={() => controllerRef.current?.togglePlay()}
                className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-400 active:scale-90 transition-all"
              >
                {playerState?.isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
              </button>
              
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${(playerState?.currentTime || 0) / (playerState?.duration || 1) * 100}%` }}
                />
              </div>

              <button 
                onClick={handlePlaybackRate}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider"
              >
                {playerState?.playbackRate}x
              </button>
           </div>
           
           {/* Fallback hidden audio element for media controller if a real stream source isn't available */}
           <audio ref={audioRef} className="hidden" />
        </div>
      )}
    </div>
  );
};
