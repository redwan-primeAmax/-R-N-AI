/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { ThemeMetadata, ThemeConfig } from './types';

// Static metadata was originally here
export const THEME_METADATA: ThemeMetadata[] = [
  { id: 'default', name: 'Default Charcoal', description: 'Classic dark professional interface', previewColor: '#1a1a1a' },
  { id: 'snow-white', name: 'Snow White', description: 'Clean minimalist light theme', previewColor: '#ffffff' },
  { id: 'soft-linen', name: 'Soft Linen', description: 'Warm off-white editorial theme', previewColor: '#fdfaf6' },
  { id: 'dark-graphite', name: 'Dark Graphite', description: 'Deep high-contrast dark theme', previewColor: '#121212' },
  { id: 'grid-paper', name: 'Grid Paper', description: 'Architectural blueprint style', previewColor: '#f1f1ef' },
  { id: 'yellow-ruled', name: 'Yellow Ruled', description: 'Classic physical notebook feel', previewColor: '#fff9e6' },
];

// Lazy loader for full theme configurations
export async function loadThemeConfig(themeId: string): Promise<ThemeConfig> {
  switch (themeId) {
    case 'snow-white':
      return (await import('./CustomizableThemes/SnowWhiteTheme')).default;
    case 'soft-linen':
      return (await import('./CustomizableThemes/SoftLinenTheme')).default;
    case 'dark-graphite':
      return (await import('./CustomizableThemes/DarkGraphiteTheme')).default;
    case 'grid-paper':
      return (await import('./CustomizableThemes/GridPaperTheme')).default;
    case 'yellow-ruled':
      return (await import('./CustomizableThemes/YellowRuledTheme')).default;
    default:
      return (await import('./CustomizableThemes/DefaultTheme')).default;
  }
}
