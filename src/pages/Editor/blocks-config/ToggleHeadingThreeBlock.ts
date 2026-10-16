/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import { Heading3 } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const toggleHeadingThreeBlock: BlockConfig = {
  label: 'Toggle Heading 3',
  icon: Heading3,
  iconClass: 'text-purple-400',
  action: (editor: any) => (editor.chain().focus() as any).toggleToggleHeading({ level: 3 }).run(),
  description: 'H3 section with collapsible child nodes.'
};
