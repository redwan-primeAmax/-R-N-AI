/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThemeMetadata, ThemeConfig } from './types';
import { extensionManager } from '../../../services/ExtensionManager';

// Static metadata was originally here, now we rely on extensionManager
export const THEME_METADATA: ThemeMetadata[] = [];

// Lazy loader for full theme configurations
export async function loadThemeConfig(themeId: string): Promise<ThemeConfig> {
  // 1. Check if it's a registered extension theme
  const extTheme = extensionManager.getThemeConfig(themeId);
  if (extTheme && extTheme.config) {
    return extTheme.config;
  }

  // 2. Fallback to default charcoal if not found or explicitly requested
  return (await import('./CustomizableThemes/DefaultTheme')).default;
}
