/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, Loader2, RotateCcw } from 'lucide-react';
import { AudioProcessor } from '../../services/audio_processor';
import { cn } from '../../../../utils/cn';

interface AudioGeneratorBlockProps {
  block: any;
  setBlocks: any;
  isReadOnly?: boolean;
}

export const AudioGeneratorBlock: React.FC<AudioGeneratorBlockProps> = ({ block, setBlocks, isReadOnly }) => {
  const [title, setTitle] = useState(block.meta?.title || 'শিরোনামহীন অডিও');
  const [text, setText] = useState(block.meta?.text || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Base Duration estimation is ~2.2 words per second for standard speech synthesis
  const getWordCount = (val: string) => val.split(/\s+/).filter(Boolean).length;
  const wordCount = getWordCount(text);
  const baseDuration = Math.max(2, Math.ceil(wordCount / 2.2));

  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      AudioProcessor.stop();
    };
  }, []);

  const startProgressTimer = (startFromSec = 0, currentRate = playbackRate) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentTime(startFromSec);
    
    // We tick progress to match playback rate speed exactly
    const tickInterval = 1000 / currentRate;
    
    timerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= baseDuration) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsPlaying(false);
          setIsPaused(false);
          AudioProcessor.stop();
          return 0;
        }
        return prev + 1;
      });
    }, tickInterval);
  };

  const handleRun = async (startFromSec = 0, currentRate = playbackRate) => {
    if (!text.trim()) return;
    setIsGenerating(true);

    const words = text.split(/\s+/).filter(Boolean);
    const targetWordIndex = Math.min(words.length - 1, Math.floor((startFromSec / baseDuration) * words.length));
    const textToSpeak = words.slice(targetWordIndex).join(' ');

    AudioProcessor.generateAudioFromText(
      textToSpeak,
      () => {
        setIsGenerating(false);
        setIsPlaying(true);
        setIsPaused(false);
        startProgressTimer(startFromSec, currentRate);
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
      },
      { rate: currentRate }
    );
  };

  const togglePlayback = () => {
    if (!isPlaying) {
      handleRun(currentTime, playbackRate);
      return;
    }

    if (isPaused) {
      AudioProcessor.resume();
      setIsPaused(false);
      // Resume timer progress matching the current speed rate
      const tickInterval = 1000 / playbackRate;
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= baseDuration) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsPlaying(false);
            setIsPaused(false);
            return 0;
          }
          return prev + 1;
        });
      }, tickInterval);
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
      handleRun(val, playbackRate);
    }
  };

  const handlePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);

    // Save playing speed to meta state too
    setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, speed: nextRate } } : b));

    if (isPlaying && !isPaused) {
      AudioProcessor.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Real-time resume audio stream under speed rate
      setTimeout(() => {
        setIsGenerating(true);
        const words = text.split(/\s+/).filter(Boolean);
        const targetWordIndex = Math.min(words.length - 1, Math.floor((currentTime / baseDuration) * words.length));
        const textToSpeak = words.slice(targetWordIndex).join(' ');
        
        AudioProcessor.generateAudioFromText(
          textToSpeak,
          () => {
            setIsGenerating(false);
            setIsPlaying(true);
            setIsPaused(false);
            startProgressTimer(currentTime, nextRate);
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
      }, 80);
    }
  };

  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="px-5 w-full">
      <div className="bg-[#fdfdfd] dark:bg-[#1a1a1a] border border-gray-200/50 dark:border-white/5 rounded-3xl p-6 my-4 transition-all shadow-md flex flex-col hover:shadow-lg">
        {/* Title and Icon panel */}
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-white/[0.04] pb-3">
          <div className="flex items-center gap-2.5 w-full">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
              <Mic size={16} />
            </div>
            
            <input
              type="text"
              value={title}
              disabled={isReadOnly}
              onChange={(e) => {
                const val = e.target.value;
                setTitle(val);
                setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, title: val } } : b));
              }}
              placeholder="শিরোনামহীন অডিও"
              className="w-full bg-transparent border-none text-xs font-black uppercase tracking-wider text-[#37352F]/80 dark:text-white/80 focus:outline-none focus:ring-0 placeholder:opacity-30"
            />
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => {
              const val = e.target.value;
              setText(val);
              setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? { ...b, meta: { ...b.meta, text: val } } : b));
            }}
            placeholder="এখানে অডিওর জন্য আপনার টেক্সটটি লিখুন..."
            disabled={isReadOnly || isGenerating}
            className="w-full bg-gray-50/50 dark:bg-black/15 border border-gray-100 dark:border-white/5 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 min-h-[95px] resize-none leading-relaxed text-[#37352F] dark:text-white/90"
          />

          {/* Unified Audio Controller Deck */}
          <div className="bg-gray-50/30 dark:bg-black/10 border border-gray-100 dark:border-white/[0.03] p-4 rounded-2xl space-y-3.5">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-gray-500 select-none min-w-[28px] text-right">
                {formatTime(currentTime)}
              </span>

              <div className="relative flex-1 flex items-center group">
                <input
                  type="range"
                  min={0}
                  max={baseDuration}
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={!text.trim()}
                  className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none disabled:opacity-40"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / baseDuration) * 100}%, #e5e7eb ${(currentTime / baseDuration) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              <span className="text-[10px] font-mono text-gray-500 select-none min-w-[28px]">
                {formatTime(baseDuration)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayback}
                  disabled={!text.trim() || isGenerating}
                  className="w-10 h-10 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md focus:outline-none shrink-0"
                >
                  {isGenerating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isPaused || !isPlaying ? (
                    <Play size={16} className="translate-x-0.5" />
                  ) : (
                    <Pause size={16} />
                  )}
                </button>

                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#37352F]/70 dark:text-white/70">
                    {isGenerating ? 'অডিও জেনারেট হচ্ছে...' : (isPlaying ? (isPaused ? 'থমকে আছে' : 'শোনা যাচ্ছে') : 'শুনতে রিড করুন')}
                  </span>
                  <span className="text-[9px] text-[#37352F]/40 dark:text-white/30 font-medium select-none">মেল ভয়েস ইঞ্জিন (Male Voice Engine)</span>
                </div>
              </div>

              {/* Playback speed selector */}
              <button
                onClick={handlePlaybackRate}
                disabled={!text.trim()}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 disabled:opacity-40 rounded-xl text-[10px] font-black uppercase tracking-wider text-blue-500/90 hover:text-blue-500 transition-all font-mono"
              >
                Speed: {playbackRate}x
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
