/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Plus } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const createSubPageBlock: BlockConfig = {
  label: 'Create Sub Page',
  icon: Plus,
  action: () => (window as any).editorEvents?.emit('createSubPage'),
  description: 'Create a new linked sub-page.'
};
