/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import React, { useMemo, useRef, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Search, X, LayoutGrid } from 'lucide-react';
import { Note } from '../../../services/storage/DataManager';
import { uploadAndInsertMedia } from '../services/mediaUploader';
import { useLanguage } from '../../../utils/translator';
import { cn } from '../../../utils/cn';

// Import our modular block configs
import { textBlock } from '../blocks-config/TextBlock';
import { headingOneBlock } from '../blocks-config/HeadingOneBlock';
import { headingTwoBlock } from '../blocks-config/HeadingTwoBlock';
import { headingThreeBlock } from '../blocks-config/HeadingThreeBlock';
import { bulletListBlock } from '../blocks-config/BulletListBlock';
import { numberedListBlock } from '../blocks-config/NumberedListBlock';
import { todoListBlock } from '../blocks-config/TodoListBlock';
import { codeBlockConfig } from '../blocks-config/CodeBlockConfig';
import { quoteBlock } from '../blocks-config/QuoteBlock';
import { calloutBlock } from '../blocks-config/CalloutBlock';
import { sandboxBlockConfig } from '../blocks-config/SandboxBlockConfig';
import { dividerBlock } from '../blocks-config/DividerBlock';
import { tableBlockConfig } from '../blocks-config/TableBlockConfig';
import { createSubPageBlock } from '../blocks-config/CreateSubPageBlock';
import { attachPageBlock } from '../blocks-config/AttachPageBlock';
import { tocBlock } from '../blocks-config/TocBlock';
import { toggleHeadingOneBlock } from '../blocks-config/ToggleHeadingOneBlock';
import { toggleHeadingTwoBlock } from '../blocks-config/ToggleHeadingTwoBlock';
import { toggleHeadingThreeBlock } from '../blocks-config/ToggleHeadingThreeBlock';
import { databaseBlockConfig } from '../blocks-config/DatabaseBlockConfig';

/** Bengali labels for the built-in blocks (config labels stay English). */
const BN_LABELS: Record<string, string> = {
  'Text': 'টেক্সট',
  'Heading 1': 'হেডিং ১',
  'Heading 2': 'হেডিং ২',
  'Heading 3': 'হেডিং ৩',
  'Bullet List': 'বুলেট লিস্ট',
  'Numbered List': 'সংখ্যাযুক্ত লিস্ট',
  'Todo List': 'টু-ডু লিস্ট',
  'Code': 'কোড',
  'Quote': 'উদ্ধৃতি',
  'Callout': 'কলআউট',
  'Divider': 'বিভাজক',
  'Table': 'টেবিল',
  'Image, Video or File': 'ছবি, ভিডিও বা ফাইল',
};

interface BlockMenuProps {
  isOpen: boolean;
  onClose: () => void;
  editor: any;
  noteRef: React.MutableRefObject<Note | null>;
  onUploadStart?: () => void;
  onUploadComplete?: () => void;
}

export const BlockMenu: React.FC<BlockMenuProps> = ({
  isOpen,
  onClose,
  editor,
  noteRef,
  onUploadStart,
  onUploadComplete
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const { t, language } = useLanguage();

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadAndInsertMedia({
      file,
      editor,
      noteId: noteRef.current?.id || 'temp',
      workspaceId: noteRef.current?.workspaceId || 'default',
      onStart: () => {
        if (onUploadStart) onUploadStart();
      },
      onComplete: () => {
        if (onUploadComplete) onUploadComplete();
        onClose();
      },
      onError: () => {
        if (onUploadComplete) onUploadComplete();
      }
    });
  };

  const sections = useMemo(() => {
    const label = (b: any) => (language === 'bn' ? (BN_LABELS[b.label] || b.label) : b.label);
    const matches = (b: any) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return b.label.toLowerCase().includes(q) || label(b).toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q);
    };
    return [
      {
        id: 'basic',
        title: t('blocks.basic'),
        blocks: [textBlock, headingOneBlock, headingTwoBlock, headingThreeBlock, quoteBlock, calloutBlock, dividerBlock].filter(matches),
      },
      {
        id: 'lists',
        title: t('blocks.lists'),
        blocks: [bulletListBlock, numberedListBlock, todoListBlock].filter(matches),
      },
      {
        id: 'media',
        title: t('blocks.media'),
        blocks: [
          codeBlockConfig, tableBlockConfig, databaseBlockConfig, sandboxBlockConfig,
          createSubPageBlock, attachPageBlock, tocBlock,
          toggleHeadingOneBlock, toggleHeadingTwoBlock, toggleHeadingThreeBlock,
        ].filter(matches),
      },
    ];
  }, [query, language, t]);

  const totalBlocks = sections.reduce((sum, s) => sum + s.blocks.length, 0);
  const showMedia = !query.trim() || 'image video file media ছবি ভিডিও ফাইল'.includes(query.trim().toLowerCase());

  if (!editor) return null;

  const renderBlock = (block: any, idx: number) => {
    const Icon = block.icon;
    const label = language === 'bn' ? (BN_LABELS[block.label] || block.label) : block.label;
    return (
      <button
        key={`${block.label}-${idx}`}
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => { block.action(editor); onClose(); }}
        className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-amber-400/[0.08] hover:border-amber-400/25 transition-all active:scale-[0.98] text-left group"
      >
        <span className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-white/50 group-hover:text-amber-300 group-hover:border-amber-400/30 transition-colors shrink-0">
          <Icon size={17} className={block.iconClass} />
        </span>
        <span className="min-w-0">
          <span className="block font-bold text-[13px] text-white/85 group-hover:text-white transition-colors truncate">{label}</span>
          <span className="block text-[10px] leading-snug text-white/35 font-medium line-clamp-2 mt-0.5">{block.description}</span>
        </span>
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[250]"
          />
          <div className="fixed inset-0 z-[251] flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ y: 48, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 48, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="pointer-events-auto w-full sm:max-w-[560px] bg-[#171512] border border-white/10 sm:rounded-[28px] rounded-t-[28px] shadow-[0_32px_80px_rgba(0,0,0,0.65)] max-h-[86vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/25 text-amber-300 flex items-center justify-center shrink-0">
                      <LayoutGrid size={18} />
                    </span>
                    <h3 className="text-base font-black tracking-tight text-white truncate">{t('blocks.title')}</h3>
                  </div>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all active:scale-90 shrink-0"
                    aria-label={t('blocks.cancel')}
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-2.5 bg-black/40 border border-white/[0.08] rounded-2xl px-3.5 h-11 focus-within:border-amber-400/40 transition-colors">
                  <Search size={16} className="text-white/30 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('blocks.searchPlaceholder')}
                    className="flex-1 min-w-0 bg-transparent outline-none border-none text-sm text-white placeholder:text-white/25"
                  />
                  {query && (
                    <button onClick={() => setQuery('')} className="text-white/40 hover:text-white shrink-0" aria-label="Clear search">
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Sections */}
              <div className="overflow-y-auto no-scrollbar px-5 py-4 space-y-6">
                {totalBlocks === 0 && !showMedia ? (
                  <p className="py-10 text-center text-sm text-white/30 font-medium">{t('blocks.empty')}</p>
                ) : (
                  sections.map((section) => (
                    section.blocks.length > 0 && (
                      <section key={section.id}>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300/60 mb-3 px-0.5">
                          {section.title}
                        </h4>
                        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
                          {section.blocks.map(renderBlock)}
                          {section.id === 'media' && showMedia && (
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onPointerDown={(e) => e.preventDefault()}
                              onClick={() => fileInputRef.current?.click()}
                              className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-dashed border-white/[0.12] hover:bg-purple-400/[0.08] hover:border-purple-400/30 transition-all active:scale-[0.98] text-left group"
                            >
                              <span className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-white/50 group-hover:text-purple-300 transition-colors shrink-0">
                                <ImageIcon size={17} />
                              </span>
                              <span className="min-w-0">
                                <span className="block font-bold text-[13px] text-white/85 group-hover:text-white transition-colors truncate">
                                  {language === 'bn' ? 'ছবি, ভিডিও বা ফাইল' : 'Image, Video or File'}
                                </span>
                                <span className="block text-[10px] leading-snug text-white/35 font-medium mt-0.5">
                                  {language === 'bn' ? 'মিডিয়া কন্টেন্ট আপলোড করুন।' : 'Upload media content.'}
                                </span>
                              </span>
                            </button>
                          )}
                        </div>
                      </section>
                    )
                  ))
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleMediaSelect}
                accept=".png,.jpg,.jpeg,.gif,.svg,.mp4,.webm,.ogg,.mp3,.wav,.pdf,.txt,.json"
              />

              {/* Footer */}
              <div className="px-5 py-4 border-t border-white/[0.06] shrink-0">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onClose}
                  className={cn(
                    "w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.99]",
                    "bg-white/[0.05] hover:bg-white/[0.09] text-white/60 hover:text-white"
                  )}
                >
                  {t('blocks.cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
