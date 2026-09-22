/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface M3FabProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
  ariaLabel?: string;
}

export const M3Fab: React.FC<M3FabProps> = ({
  onClick,
  icon = <Plus size={26} strokeWidth={2.4} />,
  label,
  className = '',
  ariaLabel = 'Add item',
}) => {
  const isExtended = Boolean(label);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`fixed z-30 flex items-center justify-center gap-2.5 font-medium shadow-lg hover:shadow-xl active:shadow-md transition-shadow bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline-variant)]/20 ${
        isExtended
          ? 'h-14 px-6 rounded-[20px] text-sm tracking-wide'
          : 'w-14 h-14 rounded-[18px]'
      } ${className}`}
    >
      <span className="flex items-center justify-center shrink-0">{icon}</span>
      {isExtended && <span className="font-semibold">{label}</span>}
    </motion.button>
  );
};
