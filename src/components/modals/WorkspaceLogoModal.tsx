/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { 
  Briefcase, Folder, Home, Rocket, Sparkles, BookOpen, Code, 
  Star, Heart, Coffee, Target, Zap, Shield, Database, Music, 
  Camera, Palette, Globe, Layers, Feather, Check, Image as ImageIcon,
  Smile, Code2, Sliders
} from 'lucide-react';
import { Modal } from './Modal';
import { cn } from '../../utils/cn';

export const WORKSPACE_PRESET_ICONS = [
  { id: 'briefcase', label: 'Work', icon: Briefcase },
  { id: 'folder', label: 'Folder', icon: Folder },
  { id: 'home', label: 'Home', icon: Home },
  { id: 'rocket', label: 'Rocket', icon: Rocket },
  { id: 'sparkles', label: 'Ideas', icon: Sparkles },
  { id: 'book', label: 'Study', icon: BookOpen },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'heart', label: 'Personal', icon: Heart },
  { id: 'coffee', label: 'Chill', icon: Coffee },
  { id: 'target', label: 'Goals', icon: Target },
  { id: 'zap', label: 'Fast', icon: Zap },
  { id: 'shield', label: 'Vault', icon: Shield },
  { id: 'database', label: 'Data', icon: Database },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'camera', label: 'Media', icon: Camera },
  { id: 'palette', label: 'Design', icon: Palette },
  { id: 'globe', label: 'Global', icon: Globe },
  { id: 'layers', label: 'Projects', icon: Layers },
  { id: 'feather', label: 'Writing', icon: Feather }
];

export const WORKSPACE_PRESET_EMOJIS = [
  '📁', '💼', '🚀', '💡', '📚', '💻', '🎯', '⭐',
  '🔥', '📝', '🧠', '🎨', '🛠️', '📊', '🌍', '⚡',
  '💎', '🏆', '📦', '🏷️', '🔬', '✈️', '☕', '🏠'
];

export const WORKSPACE_PRESET_COLORS = [
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#ea580c', name: 'Orange' },
  { hex: '#d946ef', name: 'Fuchsia' },
  { hex: '#14b8a6', name: 'Teal' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#64748b', name: 'Slate' }
];

interface WorkspaceLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { logoSvg?: string; icon?: string; color?: string }) => void;
  currentLogo?: string;
  currentIcon?: string;
  currentColor?: string;
  workspaceName?: string;
}

export const WorkspaceLogoModal: React.FC<WorkspaceLogoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentLogo,
  currentIcon = 'briefcase',
  currentColor = '#3b82f6',
  workspaceName = 'Workspace'
}) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'emoji' | 'svg'>('preset');
  const [selectedIcon, setSelectedIcon] = useState<string>(currentIcon);
  const [selectedColor, setSelectedColor] = useState<string>(currentColor);
  const [svgInput, setSvgInput] = useState<string>(currentLogo || '');
  const [isEmojiMode, setIsEmojiMode] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedIcon(currentIcon || 'briefcase');
      setSelectedColor(currentColor || '#3b82f6');
      setSvgInput(currentLogo || '');
      // If currentIcon is an emoji
      if (currentIcon && WORKSPACE_PRESET_EMOJIS.includes(currentIcon)) {
        setActiveTab('emoji');
        setIsEmojiMode(true);
      } else if (currentLogo && currentLogo.trim().startsWith('<svg')) {
        setActiveTab('svg');
      } else {
        setActiveTab('preset');
      }
    }
  }, [isOpen, currentLogo, currentIcon, currentColor]);

  const handleSave = () => {
    if (activeTab === 'svg') {
      onSave({
        logoSvg: svgInput.trim() || undefined,
        icon: undefined,
        color: selectedColor
      });
    } else {
      onSave({
        logoSvg: undefined,
        icon: selectedIcon,
        color: selectedColor
      });
    }
    onClose();
  };

  const SelectedIconComp = WORKSPACE_PRESET_ICONS.find(i => i.id === selectedIcon)?.icon || Briefcase;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ওয়ার্কস্পেস কাস্টমাইজেশন">
      <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar text-white">
        
        {/* Live Preview Card */}
        <div className="p-4 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform text-white shrink-0 relative overflow-hidden"
              style={{ backgroundColor: selectedColor }}
            >
              {activeTab === 'svg' && svgInput.trim() ? (
                <div 
                  className="w-8 h-8 flex items-center justify-center overflow-hidden pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svgInput) }}
                />
              ) : activeTab === 'emoji' || isEmojiMode ? (
                <span className="text-2xl leading-none">{selectedIcon || '📁'}</span>
              ) : (
                <SelectedIconComp size={26} strokeWidth={2.2} />
              )}
            </div>

            <div className="min-w-0">
              <h4 className="font-extrabold text-base text-white truncate">{workspaceName}</h4>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: selectedColor }} />
                লাইভ প্রিভিউ
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-mono font-bold text-white/60">
            {selectedColor.toUpperCase()}
          </span>
        </div>

        {/* Color Palette Selector */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-white/50 flex items-center gap-1.5">
            <Sliders size={13} className="text-white/60" />
            থিম কালার নির্বাচন করুন
          </label>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
            {WORKSPACE_PRESET_COLORS.map(c => {
              const isSelected = selectedColor.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  title={c.name}
                  className={cn(
                    "w-9 h-9 rounded-xl transition-all flex items-center justify-center active:scale-90 relative",
                    isSelected ? "ring-2 ring-white scale-110 shadow-lg" : "hover:scale-105 opacity-80 hover:opacity-100"
                  )}
                  style={{ backgroundColor: c.hex }}
                >
                  {isSelected && <Check size={16} strokeWidth={3} className="text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('preset');
              setIsEmojiMode(false);
              if (WORKSPACE_PRESET_EMOJIS.includes(selectedIcon)) {
                setSelectedIcon('briefcase');
              }
            }}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95",
              activeTab === 'preset' ? "bg-white/15 text-white shadow-sm" : "text-white/40 hover:text-white"
            )}
          >
            <ImageIcon size={14} />
            আইকন
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('emoji');
              setIsEmojiMode(true);
              if (!WORKSPACE_PRESET_EMOJIS.includes(selectedIcon)) {
                setSelectedIcon('📁');
              }
            }}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95",
              activeTab === 'emoji' ? "bg-white/15 text-white shadow-sm" : "text-white/40 hover:text-white"
            )}
          >
            <Smile size={14} />
            ইমোজি
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('svg')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95",
              activeTab === 'svg' ? "bg-white/15 text-white shadow-sm" : "text-white/40 hover:text-white"
            )}
          >
            <Code2 size={14} />
            কাস্টম SVG
          </button>
        </div>

        {/* Tab Content: Preset Icons */}
        {activeTab === 'preset' && (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
            {WORKSPACE_PRESET_ICONS.map(item => {
              const IconComp = item.icon;
              const isSelected = selectedIcon === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedIcon(item.id);
                    setIsEmojiMode(false);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-90 gap-1.5",
                    isSelected 
                      ? "bg-white/15 border-white/40 text-white shadow-md" 
                      : "bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  <IconComp size={22} strokeWidth={2} />
                  <span className="text-[10px] font-bold truncate max-w-full">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab Content: Emojis */}
        {activeTab === 'emoji' && (
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5">
            {WORKSPACE_PRESET_EMOJIS.map(emoji => {
              const isSelected = selectedIcon === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setSelectedIcon(emoji);
                    setIsEmojiMode(true);
                  }}
                  className={cn(
                    "h-12 rounded-2xl border text-xl flex items-center justify-center transition-all active:scale-90",
                    isSelected 
                      ? "bg-white/20 border-white/40 shadow-md scale-105" 
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06]"
                  )}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}

        {/* Tab Content: Custom SVG */}
        {activeTab === 'svg' && (
          <div className="space-y-3">
            <textarea
              value={svgInput}
              onChange={(e) => setSvgInput(e.target.value)}
              placeholder='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">...</svg>'
              className="w-full h-36 bg-black/50 border border-white/10 rounded-2xl p-3.5 text-xs font-mono outline-none focus:border-blue-500 transition-all resize-none text-white/90 placeholder:text-white/20"
            />
            <p className="text-[11px] text-white/40 leading-relaxed">
              সতর্কতা: SVG কোড স্বয়ংক্রিয়ভাবে স্যানিটাইজ করা হয় যাতে স্ক্রিপ্ট ও ক্ষতিকর ট্যাগ বাদ পড়ে।
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all text-white/60 active:scale-95 cursor-pointer"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all text-white shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer"
          >
            সংরক্ষণ করুন
          </button>
        </div>

      </div>
    </Modal>
  );
};
