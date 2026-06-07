/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Check, FileText, MoreVertical } from 'lucide-react';
import { Note } from '../../../services/storage/DataManager';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NoteCardProps {
  note: Note;
  isSelectionMode: boolean;
  isSelected: boolean;
  onClick: (id: string) => void;
  onMoreClick?: (note: Note, e: React.MouseEvent) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ 
  note, 
  isSelectionMode, 
  isSelected, 
  onClick,
  onMoreClick
}) => {
  const description = note.description || 'No Description';
  const truncatedDesc = description.length > 60 ? description.substring(0, 57) + '...' : description;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: isSelectionMode ? 0 : rotateX,
        rotateY: isSelectionMode ? 0 : rotateY,
        transformStyle: "preserve-3d",
      }}
      onClick={() => onClick(note.id)}
      className={cn(
        "relative group rounded-[32px] p-0.5 transition-all duration-300 cursor-pointer overflow-hidden min-h-[220px] [perspective:1000px]",
        "bg-gradient-to-b from-[#4d5b6b] to-[#1a1f26] shadow-[0_10px_40px_rgba(0,0,0,0.7)]",
        isSelected && "ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
      )}
    >
      <div 
        style={{ transform: "translateZ(50px)" }}
        className="absolute inset-[3px] rounded-[29px] bg-[#1a2332] flex flex-col p-6 overflow-hidden"
      >
        {/* Subtle Inner Glow Layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#24334d] via-[#0f172a] to-[#050810] opacity-90" />
        
        {/* Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-100 pointer-events-none bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/web_note_card_bg/web_note_card_bg.png')" }}
        />
        
        {/* Subtle Highlight line at the top inner */}
        <div className="absolute top-[1px] left-[10%] right-[10%] h-[1px] bg-white/5 blur-[0.5px]" />

        <div className="relative z-10 flex flex-col h-full gap-4">
          <div className="flex items-start justify-between min-h-[44px]">
            <div className="flex items-center gap-2">
              {note.isCollaborated && (
                <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Live</span>
                </div>
              )}
              {isSelectionMode && (
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected ? "bg-blue-600 border-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]" : "border-white/10 bg-white/[0.02]"
                )}>
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-1 min-w-0 flex-1 flex flex-col gap-2">
            <div className="flex flex-col gap-3">
              <div 
                className="w-14 h-14 bg-white/[0.02] rounded-2xl flex items-center justify-center shadow-inner border border-white/5 transition-all duration-500 group-hover:scale-110 group-hover:bg-white/[0.05] group-hover:border-white/10"
              >
                {note.emoji ? (
                  <span className="text-4xl drop-shadow-lg">{note.emoji}</span>
                ) : (
                  <FileText size={28} className="text-white/30" />
                )}
              </div>
              <h3 className="font-bold text-[19px] leading-tight tracking-tight text-white/95 group-hover:text-white transition-colors">
                {note.title || 'শিরোনামহীন চিন্তা'}
              </h3>
            </div>
            <p className="text-[13px] text-white/35 font-medium leading-relaxed line-clamp-2 mt-1 group-hover:text-white/60 transition-colors">
              {truncatedDesc}
            </p>
          </div>

          <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/[0.05]">
            <div className="flex gap-1.5 flex-wrap">
              {note.tags && note.tags.length > 0 ? (
                note.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="px-2.5 py-1 bg-white/[0.03] border border-white/[0.05] text-white/40 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[9px] font-mono text-white/10 uppercase tracking-widest">Thought</span>
              )}
            </div>
            
            <span className="text-[9px] font-mono text-white/30 group-hover:text-white/50 transition-colors">
              {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
