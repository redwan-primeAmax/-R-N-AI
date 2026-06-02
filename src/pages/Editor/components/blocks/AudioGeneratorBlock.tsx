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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const handleRun = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    
    AudioProcessor.generateAudioFromText(
      text,
      () => {
        setIsGenerating(false);
        setIsPlaying(true);
        setIsPaused(false);
        setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, text, status: 'success' } } : b));
      },
      () => {
        setIsPlaying(false);
        setIsPaused(false);
      },
      (err) => {
        console.error(err);
        setIsGenerating(false);
        setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, status: 'error' } } : b));
      },
      { rate: playbackRate }
    );
  };

  const togglePlayback = () => {
    if (isPaused) {
      AudioProcessor.resume();
      setIsPaused(false);
    } else {
      AudioProcessor.pause();
      setIsPaused(true);
    }
  };

  const handlePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    // Note: Changing rate mid-speech doesn't always work with all browsers' speechSynthesis
    // Usually requires restart, but we can update the state for the next run.
  };

  return (
    <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl p-6 my-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Mic className="text-blue-500" size={20} />
        <span className="text-sm font-black uppercase tracking-widest text-blue-500/80">Audio Generator (TTS)</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          const val = e.target.value;
          setText(val);
          setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, text: val } } : b));
        }}
        placeholder="Paste your text here to generate audio..."
        disabled={isReadOnly || isPlaying}
        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500/50 min-h-[100px] resize-none"
      />

      <div className="flex justify-end gap-3">
        {isPlaying ? (
          <button
            onClick={() => AudioProcessor.stop()}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-500/20"
          >
            <Square size={14} />
            Stop
          </button>
        ) : (
          <button
            onClick={handleRun}
            disabled={isReadOnly || isGenerating || !text.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:grayscale text-white rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Generate & Play
          </button>
        )}
      </div>

      {block.meta?.status === 'success' && (
        <div className="pt-4 border-t border-gray-100 dark:border-white/5 animate-slide-up">
           <div className="flex items-center gap-4 bg-white dark:bg-black/20 p-3 rounded-2xl">
              <button 
                onClick={togglePlayback}
                disabled={!isPlaying}
                className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-400 active:scale-90 transition-all disabled:opacity-30"
              >
                {isPaused ? <Play size={18} className="translate-x-0.5" /> : <Pause size={18} />}
              </button>
              
              <div className="flex-1 text-[11px] font-bold text-white/40">
                {isPlaying ? (isPaused ? 'Paused' : 'Speaking...') : 'Ready'}
              </div>

              <button 
                onClick={handlePlaybackRate}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider"
              >
                {playbackRate}x
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
