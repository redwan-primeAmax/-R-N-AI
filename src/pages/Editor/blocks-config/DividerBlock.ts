/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Minus } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const dividerBlock: BlockConfig = {
  label: 'Divider',
  icon: Minus,
  action: (editor: any) => editor.chain().focus().setHorizontalRule().run(),
  description: 'Visually divide sections.'
};
