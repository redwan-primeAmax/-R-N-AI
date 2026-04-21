/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FocusTrap } from 'focus-trap-react';
import { X } from 'lucide-react';
import { DataManager } from '../utils/DataManager';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  maxWidth?: string;
  id?: string;
  position?: 'center' | 'bottom';
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  showCloseButton = true,
  maxWidth = 'max-w-sm',
  id,
  position = 'center'
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    DataManager.getUserPreferences().then(prefs => {
      setReducedMotion(prefs.reducedMotion);
    });
  }, [isOpen]);

  // Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      document.getElementById('root')?.setAttribute('aria-hidden', 'true');
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      document.getElementById('root')?.removeAttribute('aria-hidden');
    };
  }, [isOpen, onClose]);

  const isBottom = position === 'bottom';
  const animationProps: any = reducedMotion ? {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.1 }
  } : {
    initial: isBottom ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 },
    animate: isBottom ? { y: 0 } : { scale: 1, opacity: 1, y: 0 },
    exit: isBottom ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 },
    transition: { type: "spring", damping: 25, stiffness: 300, mass: 0.8 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className={`fixed inset-0 z-[200] flex ${isBottom ? 'items-end' : 'items-center'} justify-center p-6 bg-black/60 backdrop-blur-md`}
          id={id ? `${id}-overlay` : undefined}
          ref={overlayRef}
          onClick={(e) => {
            if (e.target === overlayRef.current && onClose) {
              onClose();
            }
          }}
        >
          <FocusTrap>
            <motion.div
              id={id}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? "modal-title" : undefined}
              {...animationProps}
              className={`bg-[#1c1c1c] border-t sm:border border-white/10 ${isBottom ? 'rounded-t-[32px] sm:rounded-[32px] w-full max-w-lg mb-[-1.5rem] sm:mb-0' : `rounded-[32px] w-full ${maxWidth}`} shadow-2xl relative overflow-hidden`}
            >
              {isBottom && (
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 shrink-0" />
              )}
              
              {title && (
                <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                  <h3 id="modal-title" className="text-xl font-bold text-white tracking-tight">{title}</h3>
                  {showCloseButton && onClose && (
                    <button 
                      onClick={onClose}
                      className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all active:scale-95"
                      aria-label="Close modal"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}
              
              {!title && showCloseButton && onClose && (
                <button 
                  onClick={onClose}
                  className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all active:scale-95 z-50"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              )}

              <div className={title ? "px-8 pb-8 pt-2" : "p-8"}>
                {children}
              </div>
            </motion.div>
          </FocusTrap>
        </div>
      )}
    </AnimatePresence>
  );
};
