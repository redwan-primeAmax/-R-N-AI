/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThemeMetadata, ThemeConfig } from './types';

// Static metadata for the selector modal (lightweight)
export const THEME_METADATA: ThemeMetadata[] = [
  {
    id: 'default',
    name: 'ক্লিন ডার্ক (ডিফল্ট চারকোল)',
    description: 'Classic professional dark theme with sleek grayish-black canvas',
    previewColor: 'bg-[#0c0c0d] border-white/5',
    previewClassName: 'bg-[#0c0c0d]'
  },
  {
    id: 'snow-white',
    name: 'Snow White (মডার্ন ক্লিন)',
    description: 'A minimalist white theme for maximum clarity',
    previewColor: 'bg-white border-gray-200',
    previewClassName: 'bg-white'
  },
  {
    id: 'yellow-ruled',
    name: 'Legal Pad (হলুদ ল্যাজ প্যাড)',
    description: 'Traditional yellow paper with ruled lines',
    previewColor: 'bg-[#fef9c3] border-yellow-200',
    previewClassName: 'bg-[#fef9c3] [background-image:linear-gradient(#e5e7eb_1px_transparent_1px)] [background-size:100%_24px]'
  },
  {
    id: 'grid-paper',
    name: 'Graph Paper (গ্রিড পেপার)',
    description: 'Blue grid for structure',
    previewColor: 'bg-slate-50 border-slate-200',
    previewClassName: 'bg-white [background-image:linear-gradient(#e5e7eb_1px_transparent_1px),linear-gradient(90deg,#e5e7eb_1px_transparent_1px)] [background-size:24px_24px]'
  },
  {
    id: 'soft-linen',
    name: 'Cream Linen (ক্রিম লিনেন)',
    description: 'Premium organic feel',
    previewColor: 'bg-[#fafaf9] border-stone-200',
    previewClassName: 'bg-[#fafaf9]'
  },
  {
    id: 'dark-graphite',
    name: 'Midnight Dark (কয়লা কালো)',
    description: 'Professional dark mode',
    previewColor: 'bg-[#1a1a1a] border-white/10',
    previewClassName: 'bg-[#1a1a1a]'
  }
];

// Lazy loader for full theme configurations
export async function loadThemeConfig(themeId: string): Promise<ThemeConfig> {
  switch (themeId) {
    case 'snow-white':
      return (await import('./CustomizableThemes/SnowWhiteTheme')).default;
    case 'yellow-ruled':
      return (await import('./CustomizableThemes/YellowRuledTheme')).default;
    case 'grid-paper':
      return (await import('./CustomizableThemes/GridPaperTheme')).default;
    case 'soft-linen':
      return (await import('./CustomizableThemes/SoftLinenTheme')).default;
    case 'dark-graphite':
      return (await import('./CustomizableThemes/DarkGraphiteTheme')).default;
    case 'default':
    default:
      return (await import('./CustomizableThemes/DefaultTheme')).default;
  }
}
