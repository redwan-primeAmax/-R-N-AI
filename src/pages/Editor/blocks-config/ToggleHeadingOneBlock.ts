/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Heading1 } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const toggleHeadingOneBlock: BlockConfig = {
  label: 'Toggle Heading 1',
  icon: Heading1,
  iconClass: 'text-purple-400',
  action: (editor: any) => (editor.chain().focus() as any).toggleToggleHeading({ level: 1 }).run(),
  description: 'H1 section with collapsible child nodes.'
};
