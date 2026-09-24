import React from 'react';
import { cleanRootSvgAttributes } from './icon/IconManager';

interface PageIconProps {
  emoji?: string;
  className?: string;
  fallback?: string;
  id?: string;
}

export const PageIcon = ({ emoji, className = "text-xl", fallback = '📄', id }: PageIconProps) => {
  if (!emoji) {
    return <span id={id} className={className}>{fallback}</span>;
  }
  
  const trimmed = emoji.trim();
  if (trimmed.startsWith('<svg') || trimmed.includes('<svg ')) {
    const cleanSvg = cleanRootSvgAttributes(trimmed);
    return (
      <span 
        id={id}
        className={`${className} flex items-center justify-center shrink-0 overflow-hidden svg-icon`}
        dangerouslySetInnerHTML={{ __html: cleanSvg }}
      />
    );
  }
  
  return <span id={id} className={`${className} leading-none flex items-center justify-center`}>{emoji}</span>;
};
