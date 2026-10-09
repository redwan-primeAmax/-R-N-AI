/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  maxWidth?: string;
  id?: string;
  position?: 'center' | 'bottom';
  className?: string;
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  showCloseButton = true, 
  maxWidth = 'max-w-sm', 
  id, 
  position = 'center',
  className
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => containerRef.current!);

  // Close on Escape & manage body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  const isBottom = position === 'bottom';

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className={cn(
            "fixed inset-0 z-[200] flex justify-center p-4 sm:p-6",
            isBottom ? "items-end" : "items-center"
          )}
          id={id ? `${id}-overlay` : undefined}
          ref={containerRef}
        >
          {/* Backdrop with smooth fade in/out */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Content Box with smooth spring animation */}
          <motion.div
            key="modal-content"
            id={id || 'modal-root'}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            initial={isBottom ? { y: "100%", opacity: 0 } : { scale: 0.95, opacity: 0, y: 15 }}
            animate={isBottom ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={isBottom ? { y: "100%", opacity: 0 } : { scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.7 }}
            drag={isBottom ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(e, info) => {
              if (isBottom && info.offset.y > 100 && onClose) {
                onClose();
              }
            }}
            className={cn(
              "bg-[#1c1c1c] border border-white/10 shadow-2xl relative overflow-hidden z-10 w-full",
              isBottom ? "rounded-t-[32px] sm:rounded-[32px] max-w-lg mb-[-1.5rem] sm:mb-0" : `rounded-[32px] ${maxWidth}`
            )}
          >
            {isBottom && (
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 shrink-0" />
            )}
            
            {title && (
              <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-3 flex items-center justify-between border-b border-white/[0.04]">
                <h3 id="modal-title" className="text-xl font-bold text-white tracking-tight">{title}</h3>
                {showCloseButton && onClose && (
                  <button 
                    type="button"
                    onClick={onClose}
                    className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all active:scale-95 cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
            
            {!title && showCloseButton && onClose && (
              <button 
                type="button"
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all active:scale-95 z-50 cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}

            <div className={cn(
              "overflow-y-auto max-h-[75vh] custom-scrollbar",
              title ? "px-6 sm:px-8 pb-6 sm:pb-8 pt-4" : "p-6 sm:p-8",
              className
            )}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
