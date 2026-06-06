/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Eye, EyeOff } from 'lucide-react';

export const readOnlyToggleAction = {
  icon: (isReadOnly: boolean) => isReadOnly ? EyeOff : Eye,
  label: (isReadOnly: boolean) => isReadOnly ? 'Edit Mode' : 'Read Only',
  subtitle: (isReadOnly: boolean) => isReadOnly ? 'Switch to editing' : 'Prevent accidental changes',
  onClick: (onToggleReadOnly: () => void) => onToggleReadOnly()
};
