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

import { Heading2 } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const toggleHeadingTwoBlock: BlockConfig = {
  label: 'Toggle Heading 2',
  icon: Heading2,
  iconClass: 'text-purple-400',
  action: (editor: any) => (editor.chain().focus() as any).toggleToggleHeading({ level: 2 }).run(),
  description: 'H2 section with collapsible child nodes.'
};
