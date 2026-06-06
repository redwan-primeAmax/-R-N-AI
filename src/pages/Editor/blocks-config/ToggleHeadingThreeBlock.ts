/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
