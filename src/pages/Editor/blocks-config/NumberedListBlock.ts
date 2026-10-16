/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { ListOrdered } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const numberedListBlock: BlockConfig = {
  label: 'Numbered List',
  icon: ListOrdered,
  action: (editor: any) => editor.chain().focus().toggleOrderedList().run(),
  description: 'Sequential ordered list.'
};
