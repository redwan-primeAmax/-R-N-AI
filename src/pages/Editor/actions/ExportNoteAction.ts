/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Download } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const exportNoteAction: ActionConfig = {
  icon: Download,
  label: 'Export Note',
  subtitle: 'Save in different formats',
  onClick: (onExport: () => void) => onExport()
};
