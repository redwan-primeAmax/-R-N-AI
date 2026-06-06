/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lock } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const lockPageAction: ActionConfig = {
  icon: Lock,
  label: 'Lock Page',
  subtitle: 'Protect with a password',
  onClick: (onLock: () => void) => onLock()
};
