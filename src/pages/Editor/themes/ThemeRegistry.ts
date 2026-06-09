/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThemeMetadata, ThemeConfig } from './types';

// Static metadata was originally here
export const THEME_METADATA: ThemeMetadata[] = [];

// Lazy loader for full theme configurations
export async function loadThemeConfig(themeId: string): Promise<ThemeConfig> {
  // Fallback to default charcoal
  return (await import('./CustomizableThemes/DefaultTheme')).default;
}
