/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Copy } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const duplicateNoteAction: ActionConfig = {
  icon: Copy,
  label: 'Duplicate Note',
  subtitle: 'Create a standalone copy',
  onClick: (onCopy: () => void) => onCopy()
};
