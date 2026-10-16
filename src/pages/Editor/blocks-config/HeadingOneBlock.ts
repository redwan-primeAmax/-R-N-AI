/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Heading1 } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const headingOneBlock: BlockConfig = {
  label: 'Heading 1',
  icon: Heading1,
  action: (editor: any) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  description: 'Big section heading.'
};
