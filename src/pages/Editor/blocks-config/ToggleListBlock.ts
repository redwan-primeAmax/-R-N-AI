/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronRight } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const toggleListBlock: BlockConfig = {
  label: 'Toggle List',
  icon: ChevronRight,
  action: (editor: any) => editor.chain().focus().toggleToggleList().run(),
  description: 'Toggles can hide or reveal content.',
  iconClass: 'text-gray-400'
};
