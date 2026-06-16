import React from 'react';

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
  if (trimmed.startsWith('<svg') || (Symbol.iterator in Object(trimmed) && trimmed.includes('<svg'))) {
    return (
      <span 
        id={id}
        className={`${className} flex items-center justify-center shrink-0 overflow-hidden svg-icon`}
        dangerouslySetInnerHTML={{ __html: emoji }}
      />
    );
  }
  
  return <span id={id} className={className}>{emoji}</span>;
};
