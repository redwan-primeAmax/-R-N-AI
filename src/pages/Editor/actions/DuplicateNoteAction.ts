/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Copy } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const duplicateNoteAction: ActionConfig = {
  icon: Copy,
  label: 'Duplicate Note',
  subtitle: 'Create a standalone copy',
  onClick: (onCopy: () => void) => onCopy()
};
