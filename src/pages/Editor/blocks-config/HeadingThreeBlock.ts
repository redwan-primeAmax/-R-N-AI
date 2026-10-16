/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Heading3 } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const headingThreeBlock: BlockConfig = {
  label: 'Heading 3',
  icon: Heading3,
  action: (editor: any) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  description: 'Smaller section heading.'
};
