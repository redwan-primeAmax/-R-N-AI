/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trash2 } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const deleteNoteAction: ActionConfig = {
  icon: Trash2,
  label: 'Move to Trash',
  subtitle: 'Send to trash bin',
  onClick: (onDelete: () => void) => onDelete(),
  danger: true
};
