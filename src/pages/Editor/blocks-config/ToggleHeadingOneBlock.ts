/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
