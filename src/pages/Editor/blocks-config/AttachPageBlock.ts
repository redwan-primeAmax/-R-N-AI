/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { FilePlus } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const attachPageBlock: BlockConfig = {
  label: 'Attach Page',
  icon: FilePlus,
  action: () => (window as any).editorEvents?.emit('attachSubPage'),
  description: 'Link an existing page as sub-page.'
};
