/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Lock } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const lockPageAction: ActionConfig = {
  icon: Lock,
  label: 'Lock Page',
  subtitle: 'Protect with a password',
  onClick: (onLock: () => void) => onLock()
};
