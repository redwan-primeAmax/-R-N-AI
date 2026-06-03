/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, Loader2, RotateCcw, Edit2 } from 'lucide-react';
import { AudioProcessor } from '../../services/audio_processor';
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
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // Estimate duration: ~2.2 words per second for human speaking speed in speech engines
  const getWordCount = (val: string) => val.split(/\s+/).filter(Boolean).length;
  const wordCount = getWordCount(text);
  const duration = Math.max(5, Math.ceil(wordCount / 2.2));

  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Stop speech on unmount when block is deleted or navigated
      AudioProcessor.stop();
    };
  }, []);

  const startProgressTimer = (startFromSec = 0) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentTime(startFromSec);
    
    timerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsPlaying(false);
          setIsPaused(false);
          AudioProcessor.stop();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleRun = async (startFromSec = 0) => {
    if (!text.trim()) return;
    setIsGenerating(true);

    const words = text.split(/\s+/).filter(Boolean);
    const targetWordIndex = Math.floor((startFromSec / duration) * words.length);
    const textToSpeak = words.slice(targetWordIndex).join(' ');

    AudioProcessor.generateAudioFromText(
      textToSpeak,
      () => {
        setIsGenerating(false);
        setIsPlaying(true);
        setIsPaused(false);
        startProgressTimer(startFromSec);
        setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, text, status: 'success' } } : b));
      },
      () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentTime(0);
      },
      (err) => {
        console.error(err);
        setIsGenerating(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, status: 'error' } } : b));
      },
      { rate: playbackRate }
    );
  };

  const togglePlayback = () => {
    if (!isPlaying) {
      handleRun(currentTime);
      return;
    }

    if (isPaused) {
      AudioProcessor.resume();
      setIsPaused(false);
      // Resume timer progress
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsPlaying(false);
            setIsPaused(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      AudioProcessor.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      // Seek by restarting voice stream from target word fraction
      handleRun(val);
    }
  };

  const handleReset = () => {
    AudioProcessor.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
    setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, status: 'idle' } } : b));
  };

  const handlePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (isPlaying) {
      AudioProcessor.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      // Restart speech engine at the new speed rate with the same position
      setTimeout(() => {
        setIsGenerating(true);
        const words = text.split(/\s+/).filter(Boolean);
        const targetWordIndex = Math.floor((currentTime / duration) * words.length);
        const textToSpeak = words.slice(targetWordIndex).join(' ');
        
        AudioProcessor.generateAudioFromText(
          textToSpeak,
          () => {
            setIsGenerating(false);
            setIsPlaying(true);
            setIsPaused(false);
            startProgressTimer(currentTime);
          },
          () => {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentTime(0);
          },
          (err) => {
            console.error(err);
            setIsGenerating(false);
          },
          { rate: nextRate }
        );
      }, 50);
    }
  };

  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const isSuccess = block.meta?.status === 'success';

  return (
    <div className="px-5 w-full">
      <div className={cn(
        "bg-[#fdfdfd] dark:bg-[#1a1a1a] border border-gray-200/50 dark:border-white/5 rounded-3xl p-6 my-4 transition-all shadow-md flex flex-col",
        isSuccess ? "p-5 border-blue-500/10 shadow-lg shadow-blue-500/[0.02]" : ""
      )}>
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-white/[0.04] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
              <Mic size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#37352F]/70 dark:text-white/60 font-display">অডিও জেনারেটর (Voice Engine)</span>
              <span className="text-[9px] text-[#37352F]/40 dark:text-white/35 font-mono">TEXT TO SPEECH SYSTEM</span>
            </div>
          </div>
          {isSuccess && !isReadOnly && (
            <button
              onClick={handleReset}
              className="text-xs text-blue-500 hover:text-blue-400 font-bold flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl transition-all"
            >
              <Edit2 size={12} />
              Re-edit
            </button>
          )}
        </div>

        {!isSuccess ? (
          <div className="space-y-4">
            <textarea
              value={text}
              onChange={(e) => {
                const val = e.target.value;
                setText(val);
                setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, text: val } } : b));
              }}
              placeholder="এখানে আপনার টেক্সটটি পেস্ট করুন..."
              disabled={isReadOnly || isGenerating}
              className="w-full bg-gray-50/50 dark:bg-black/15 border border-gray-200 dark:border-white/5 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 min-h-[105px] resize-none leading-relaxed"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleRun(0)}
                disabled={isReadOnly || isGenerating || !text.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:grayscale text-white rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/15"
              >
                {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                Generate & Play
              </button>
            </div>
          </div>
        ) : (
          <div className="py-2 flex flex-col gap-4">
            {/* Audio Waveform style Seek Bar container */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-gray-500 select-none min-w-[28px] text-right">
                {formatTime(currentTime)}
              </span>

              <div className="relative flex-1 flex items-center group">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #e5e7eb ${(currentTime / duration) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              <span className="text-[10px] font-mono text-gray-500 select-none min-w-[28px]">
                {formatTime(duration)}
              </span>
            </div>

            {/* Complete premium music player style controls, with side space */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayback}
                  className="w-12 h-12 bg-blue-500 hover:bg-blue-400 text-white rounded-full flex items-center justify-center active:scale-90 transition-all shadow-md shadow-blue-500/10 hover:shadow-lg focus:outline-none"
                >
                  {isPaused || !isPlaying ? (
                    <Play size={20} className="translate-x-0.5" />
                  ) : (
                    <Pause size={20} />
                  )}
                </button>

                <div className="flex flex-col">
                  <span className="text-xs font-black text-blue-500">
                    {isGenerating ? 'Generating...' : (isPlaying ? (isPaused ? 'Paused' : 'Playing Speech') : 'Speech Ready')}
                  </span>
                  <span className="text-[9px] text-[#37352F]/40 dark:text-white/30 font-medium select-none">Protected Playback (No Download)</span>
                </div>
              </div>

              {/* Playback speed selector */}
              <button
                onClick={handlePlaybackRate}
                className="px-3.5 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider text-blue-500/90 hover:text-blue-500 transition-all font-mono"
              >
                Speed: {playbackRate}x
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
