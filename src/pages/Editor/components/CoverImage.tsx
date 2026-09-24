/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Image as ImageIcon, X, Move, Upload } from 'lucide-react';
import { MediaService } from '../../../services/storage/services/MediaService';
import { DataManager } from '../../../services/storage/DataManager';
import { cn } from '../../../utils/cn';

interface CoverImageProps {
  coverImage?: string;
  coverPosition?: number; // 0 to 100
  onUpdateCover: (coverUrl?: string, coverPosition?: number) => void;
  isLight: boolean;
  isReadOnly?: boolean;
}

export const CoverImage: React.FC<CoverImageProps> = ({
  coverImage,
  coverPosition = 50,
  onUpdateCover,
  isLight,
  isReadOnly
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [pos, setPos] = useState<number>(coverPosition);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startPos = useRef(coverPosition);

  React.useEffect(() => {
    setPos(coverPosition ?? 50);
  }, [coverPosition]);

  React.useEffect(() => {
    let active = true;
    if (coverImage) {
      if (coverImage.startsWith('blob-id:') || coverImage.startsWith('media:')) {
        DataManager.resolveMediaUrls(coverImage).then(url => {
          if (active) setResolvedUrl(url);
        });
      } else {
        setResolvedUrl(coverImage);
      }
    } else {
      setResolvedUrl('');
    }
    return () => {
      active = false;
    };
  }, [coverImage]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const mediaId = await MediaService.saveMedia(file);
      const coverRef = `blob-id:${mediaId}`;
      onUpdateCover(coverRef, 50);
    } catch (err) {
      console.error('Failed to upload cover image:', err);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isRepositioning) return;
    isDragging.current = true;
    startY.current = e.clientY;
    startPos.current = pos;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const deltaY = e.clientY - startY.current;
    const height = containerRef.current.clientHeight;
    const percentageDelta = (deltaY / height) * 100;
    const newPos = Math.max(0, Math.min(100, startPos.current + percentageDelta));
    setPos(newPos);
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      isDragging.current = false;
    }
  };

  const saveReposition = () => {
    setIsRepositioning(false);
    onUpdateCover(coverImage, Math.round(pos));
  };

  if (!coverImage) {
    if (isReadOnly) return null;
    return (
      <div className="w-full flex items-center mb-2 group/addcover">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "opacity-0 group-hover/addcover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer",
            isLight ? "bg-black/5 hover:bg-black/10 text-gray-700" : "bg-white/10 hover:bg-white/20 text-gray-200"
          )}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>কভার যুক্ত করুন (Add Cover)</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={cn(
        "relative w-full aspect-[3/1] max-h-64 rounded-xl overflow-hidden mb-6 group/cover transition-all",
        isRepositioning ? "cursor-ns-resize select-none ring-2 ring-blue-500" : ""
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt="Page Cover"
          className="w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: `50% ${pos}%` }}
        />
      ) : (
        <div className="w-full h-full bg-gray-500/20 animate-pulse" />
      )}

      {/* Reposition drag helper indicator */}
      {isRepositioning && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <span className="bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
            <Move className="w-3.5 h-3.5" />
            পজিশন পরিবর্তন করতে উপরে-নিচে ড্র্যাগ করুন (Drag up/down)
          </span>
        </div>
      )}

      {/* Controls Overlay */}
      {!isReadOnly && (
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity bg-black/50 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
          {isRepositioning ? (
            <button
              onClick={saveReposition}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded cursor-pointer"
            >
              সেভ করুন (Save)
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsRepositioning(true)}
                className="px-2 py-1 text-white hover:bg-white/20 text-xs font-medium rounded flex items-center gap-1 cursor-pointer"
                title="Reposition"
              >
                <Move className="w-3.5 h-3.5" />
                <span>পজিশন</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 text-white hover:bg-white/20 text-xs font-medium rounded flex items-center gap-1 cursor-pointer"
                title="Change Cover"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>পরিবর্তন</span>
              </button>
              <button
                onClick={() => onUpdateCover(undefined, undefined)}
                className="p-1 text-white hover:bg-red-500/50 rounded cursor-pointer"
                title="Remove Cover"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
