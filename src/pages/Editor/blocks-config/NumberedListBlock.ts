/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ListOrdered } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const numberedListBlock: BlockConfig = {
  label: 'Numbered List',
  icon: ListOrdered,
  action: (editor: any) => editor.chain().focus().toggleOrderedList().run(),
  description: 'Sequential ordered list.'
};
