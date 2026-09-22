/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Menu } from 'lucide-react';

export interface TopAppBarAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number | string;
}

interface TopAppBarProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  variant?: 'center-aligned' | 'small' | 'large';
  navigationIcon?: 'menu' | 'back' | 'none';
  onNavigationClick?: () => void;
  actions?: TopAppBarAction[];
  className?: string;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  subtitle,
  variant = 'small',
  navigationIcon = 'menu',
  onNavigationClick,
  actions = [],
  className = '',
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isCenterAligned = variant === 'center-aligned';

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-200 border-b ${
        isScrolled
          ? 'bg-[var(--md-sys-color-surface-container)]/95 backdrop-blur-md border-[var(--md-sys-color-outline-variant)]/25 shadow-sm'
          : 'bg-[var(--md-sys-color-surface)] border-transparent'
      } ${className}`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
      }}
    >
      <div className="h-16 px-2 sm:px-4 max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Leading Navigation Icon */}
        <div className="flex items-center min-w-[48px]">
          {navigationIcon === 'menu' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onNavigationClick}
              aria-label="Open navigation drawer"
              className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-on-surface)]/8 active:bg-[var(--md-sys-color-on-surface)]/12 transition-colors m3-touch-target"
            >
              <Menu size={24} />
            </motion.button>
          )}

          {navigationIcon === 'back' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onNavigationClick}
              aria-label="Go back"
              className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-on-surface)]/8 active:bg-[var(--md-sys-color-on-surface)]/12 transition-colors m3-touch-target"
            >
              <ArrowLeft size={24} />
            </motion.button>
          )}
        </div>

        {/* Title & Subtitle */}
        <div
          className={`flex-1 min-w-0 px-2 ${
            isCenterAligned ? 'text-center' : 'text-left'
          }`}
        >
          <div className="text-[19px] sm:text-[22px] font-bold tracking-tight text-[var(--md-sys-color-on-surface)] truncate font-sans leading-tight">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-[var(--md-sys-color-on-surface-variant)] truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>

        {/* Trailing Actions */}
        <div className="flex items-center gap-1 min-w-[48px] justify-end">
          {actions.map(action => (
            <motion.button
              key={action.id}
              whileTap={{ scale: 0.9 }}
              onClick={action.onClick}
              aria-label={action.label}
              title={action.label}
              className="relative w-12 h-12 rounded-full flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-on-surface)]/8 active:bg-[var(--md-sys-color-on-surface)]/12 transition-colors m3-touch-target"
            >
              {action.icon}
              {action.badge !== undefined && (
                <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] text-[10px] font-bold flex items-center justify-center">
                  {action.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </header>
  );
};
