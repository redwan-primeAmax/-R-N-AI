import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';

interface IconChangeProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (emoji: string) => void;
  currentIcon?: string;
}

export const IconChange = ({ isOpen, onClose, onSelectIcon, currentIcon }: IconChangeProps) => {
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelectIcon(emojiData.emoji);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
          />
          
          {/* Dynamic Responsive Modal / Drawer */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 left-0 right-0 h-[80vh] md:h-[650px] md:max-w-xl bg-[#121212] border-t md:border border-white/10 z-[9999] rounded-t-[2.5rem] md:rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Handle Bar for Touch Devices */}
            <div className="flex justify-center py-2.5 shrink-0 md:hidden">
              <div className="w-12 h-1.5 rounded-full bg-white/10" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
              <div className="flex flex-col">
                <h3 className="text-xl font-black tracking-tight text-white">ইমোজি নির্বাচন করুন</h3>
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">
                  নোট বা ওয়ার্কস্পেসের জন্য একটি ইমোজি বাছুন
                </span>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-all border border-white/5 active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Emoji Picker container */}
            <div className="flex-1 overflow-hidden p-6 bg-[#121212]">
              <div className="w-full h-full rounded-3xl overflow-hidden shadow-inner border border-white/5 flex flex-col emoji-picker-wrapper">
                <EmojiPicker
                  theme={Theme.DARK}
                  width="100%"
                  height="100%"
                  lazyLoadEmojis={true}
                  onEmojiClick={handleEmojiClick}
                  searchPlaceholder="ইমোজি খুঁজুন..."
                  previewConfig={{
                    showPreview: true,
                    defaultEmoji: currentIcon && !currentIcon.startsWith('<svg') ? currentIcon : "📝",
                    defaultCaption: "নোট সাজানোর জন্য পছন্দসই ইমোজি সিলেক্ট করুন"
                  }}
                />
              </div>
            </div>
            
            {/* Custom inject to make emoji picker scroll beautifully */}
            <style>{`
              .emoji-picker-wrapper .EmojiPickerReact {
                --epr-bg-color: #121212 !important;
                --epr-category-navigation-button-size: 28px !important;
                --epr-emoji-size: 32px !important;
                --epr-hover-bg-color: rgba(255, 255, 255, 0.05) !important;
                --epr-focus-bg-color: rgba(255, 255, 255, 0.08) !important;
                --epr-search-input-bg-color: rgba(255, 255, 255, 0.03) !important;
                --epr-search-input-bg-color-active: rgba(255, 255, 255, 0.05) !important;
                --epr-search-border-color: rgba(255, 255, 255, 0.08) !important;
                --epr-border-color: transparent !important;
                --epr-preview-text-color: #a3a3a3 !important;
                --epr-category-label-bg-color: #121212 !important;
                --epr-category-label-text-color: #9e9e9e !important;
                border: none !important;
                box-shadow: none !important;
                font-family: inherit !important;
              }
              .emoji-picker-wrapper .EmojiPickerReact input.epr-search {
                border-radius: 1rem !important;
                padding: 12px 16px !important;
                font-size: 14px !important;
              }
            `}</style>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
