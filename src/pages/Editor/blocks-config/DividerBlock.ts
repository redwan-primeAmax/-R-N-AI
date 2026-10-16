/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Minus } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const dividerBlock: BlockConfig = {
  label: 'Divider',
  icon: Minus,
  action: (editor: any) => editor.chain().focus().setHorizontalRule().run(),
  description: 'Visually divide sections.'
};
