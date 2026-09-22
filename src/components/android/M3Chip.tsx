/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';

interface M3ChipProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export const M3Chip: React.FC<M3ChipProps> = ({
  label,
  icon,
  selected = false,
  onClick,
  onRemove,
  className = '',
}) => {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors border select-none ${
        selected
          ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] border-transparent font-semibold shadow-xs'
          : 'bg-[var(--md-sys-color-surface-container-low)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)]/40 hover:bg-[var(--md-sys-color-surface-container)]'
      } ${className}`}
    >
      {icon && <span className="shrink-0 text-current">{icon}</span>}
      <span className="truncate max-w-[120px]">{label}</span>
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
        >
          ×
        </span>
      )}
    </motion.button>
  );
};
