/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Heading2 } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const headingTwoBlock: BlockConfig = {
  label: 'Heading 2',
  icon: Heading2,
  action: (editor: any) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  description: 'Medium section heading.'
};
