/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Eye, EyeOff } from 'lucide-react';

export const readOnlyToggleAction = {
  icon: (isReadOnly: boolean) => isReadOnly ? EyeOff : Eye,
  label: (isReadOnly: boolean) => isReadOnly ? 'Edit Mode' : 'Read Only',
  subtitle: (isReadOnly: boolean) => isReadOnly ? 'Switch to editing' : 'Prevent accidental changes',
  onClick: (onToggleReadOnly: () => void) => onToggleReadOnly()
};
