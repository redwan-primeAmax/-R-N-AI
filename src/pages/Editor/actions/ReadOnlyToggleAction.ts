/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import { Eye, EyeOff } from 'lucide-react';

export const readOnlyToggleAction = {
  icon: (isReadOnly: boolean) => isReadOnly ? EyeOff : Eye,
  label: (isReadOnly: boolean) => isReadOnly ? 'Edit Mode' : 'Read Only',
  subtitle: (isReadOnly: boolean) => isReadOnly ? 'Switch to editing' : 'Prevent accidental changes',
  onClick: (onToggleReadOnly: () => void) => onToggleReadOnly()
};
