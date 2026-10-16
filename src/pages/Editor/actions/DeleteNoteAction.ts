/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
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
