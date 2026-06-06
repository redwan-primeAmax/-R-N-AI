/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Palette } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const themeAction: ActionConfig = {
  icon: Palette,
  label: 'Canvas Theme',
  subtitle: 'Change paper style',
  onClick: (onTheme: () => void) => onTheme()
};
